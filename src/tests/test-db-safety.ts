export const TEST_DATABASE_NAME = "commute-tracker-test";
export const TEST_DB_CLEANUP_FLAG = "TEST_DB_CLEANUP_ALLOWED";

export interface TestDatabaseConfig {
  url: string;
  databaseName: string;
}

export type TestDatabaseEnvironment = Readonly<
  Record<string, string | undefined>
>;

function getDatabaseName(url: URL): string {
  return decodeURIComponent(url.pathname.replace(/^\//, ""));
}

export function validateTestDatabaseConfig(
  env: TestDatabaseEnvironment = process.env
): TestDatabaseConfig {
  const rawUrl = env.TEST_DB_URL?.trim();

  if (!rawUrl) {
    throw new Error("TEST_DB_URL is required for integration tests");
  }

  if (env[TEST_DB_CLEANUP_FLAG] !== "true") {
    throw new Error(
      `${TEST_DB_CLEANUP_FLAG}=true is required for integration test cleanup`
    );
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new Error("TEST_DB_URL is not a valid MongoDB URL");
  }

  if (
    parsedUrl.protocol !== "mongodb:" &&
    parsedUrl.protocol !== "mongodb+srv:"
  ) {
    throw new Error("TEST_DB_URL must use a MongoDB protocol");
  }

  if (!parsedUrl.hostname) {
    throw new Error("TEST_DB_URL must include a MongoDB host");
  }

  const databaseName = getDatabaseName(parsedUrl);

  if (databaseName !== TEST_DATABASE_NAME) {
    throw new Error(
      `TEST_DB_URL must target the ${TEST_DATABASE_NAME} database`
    );
  }

  return {
    url: rawUrl,
    databaseName,
  };
}

