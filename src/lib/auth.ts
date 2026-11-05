import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { MongoClient } from "mongodb";

const globalForAuth = globalThis as typeof globalThis & {
  __commuteAuthMongoClient?: MongoClient;
};

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required for authentication`);
  }

  return value;
}

export function getAuthMongoClient(): MongoClient {
  if (!globalForAuth.__commuteAuthMongoClient) {
    globalForAuth.__commuteAuthMongoClient = new MongoClient(
      requiredEnvironment("MONGODB_URL")
    );
  }

  return globalForAuth.__commuteAuthMongoClient;
}

export function createAuthInstance({
  disableSignUp = true,
  client = getAuthMongoClient(),
}: {
  disableSignUp?: boolean;
  client?: MongoClient;
} = {}) {
  const baseURL = requiredEnvironment("BETTER_AUTH_URL");
  requiredEnvironment("BETTER_AUTH_SECRET");

  try {
    new URL(baseURL);
  } catch {
    throw new Error("BETTER_AUTH_URL must be a valid URL");
  }

  const options: BetterAuthOptions = {
    appName: "Commute Tracker",
    baseURL,
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins: [baseURL],
    database: mongodbAdapter(client.db(), { client }),
    emailAndPassword: {
      enabled: true,
      disableSignUp,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      requireEmailVerification: false,
    },
    session: {
      expiresIn: 60 * 60 * 12,
      updateAge: 60 * 60,
      storeSessionInDatabase: true,
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      customRules: {
        "/sign-in/email": {
          window: 60,
          max: 5,
        },
      },
    },
  };

  return betterAuth(options);
}

export const auth = createAuthInstance();

