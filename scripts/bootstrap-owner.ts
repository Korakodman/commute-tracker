import { createInterface } from "node:readline/promises";

import { MongoClient } from "mongodb";

import { createAuthInstance } from "../src/lib/auth";

const TEST_DATABASE_NAME = "commute-tracker-test";

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function getDatabaseName(value: string): string {
  const url = new URL(value);
  return decodeURIComponent(url.pathname.replace(/^\//, ""));
}

async function promptHidden(question: string): Promise<string> {
  const input = process.stdin;

  process.stdout.write(question);
  input.resume();
  if (input.isTTY) input.setRawMode(true);

  return new Promise((resolve, reject) => {
    let value = "";

    function cleanup() {
      input.removeListener("data", onData);
      if (input.isTTY) input.setRawMode(false);
      process.stdout.write("\n");
    }

    function onData(chunk: Buffer | string) {
      const text = chunk.toString();

      for (const character of text) {
        if (character === "\u0003") {
          cleanup();
          reject(new Error("Bootstrap cancelled"));
          return;
        }

        if (character === "\r" || character === "\n") {
          cleanup();
          resolve(value);
          return;
        }

        if (character === "\u007f") {
          value = value.slice(0, -1);
          continue;
        }

        value += character;
      }
    }

    input.on("data", onData);
  });
}

async function main() {
  if (process.env.AUTH_BOOTSTRAP_CONFIRM !== "CREATE_SINGLE_OWNER") {
    throw new Error(
      "Set AUTH_BOOTSTRAP_CONFIRM=CREATE_SINGLE_OWNER before running bootstrap"
    );
  }

  const mongoURL = requiredEnvironment("MONGODB_URL");
  let databaseName: string;

  try {
    databaseName = getDatabaseName(mongoURL);
  } catch {
    throw new Error("MONGODB_URL is not a valid MongoDB URL");
  }

  if (!databaseName || databaseName === TEST_DATABASE_NAME) {
    throw new Error("Bootstrap cannot run against the test database");
  }

  const client = new MongoClient(mongoURL);

  try {
    await client.connect();

    const userCount = await client
      .db()
      .collection("user")
      .countDocuments();

    if (userCount > 0) {
      throw new Error("An owner account already exists; no account was created");
    }

    const readline = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const email = (await readline.question("Owner email: ")).trim();
    const name = (await readline.question("Owner name: ")).trim();
    readline.close();

    const password = await promptHidden("Owner password: ");
    const auth = createAuthInstance({
      client,
      disableSignUp: false,
    });

    const result = await auth.api.signUpEmail({
      body: {
        email,
        name,
        password,
      },
    });

    if (!result.user) {
      throw new Error("Owner account could not be created");
    }

    const finalUserCount = await client
      .db()
      .collection("user")
      .countDocuments();

    if (finalUserCount !== 1) {
      throw new Error("Owner account verification failed");
    }

    console.log("Owner account created successfully");
  } finally {
    await client.close();
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Owner bootstrap failed"
  );
  process.exitCode = 1;
});

