import { describe, expect, test } from "vitest";

import {
  TEST_DATABASE_NAME,
  TEST_DB_CLEANUP_FLAG,
  validateTestDatabaseConfig,
} from "./test-db-safety";

const validEnvironment = {
  TEST_DB_URL: `mongodb://127.0.0.1:27017/${TEST_DATABASE_NAME}?replicaSet=rs0`,
  [TEST_DB_CLEANUP_FLAG]: "true",
};

describe("test database safety guard", () => {
  test("ยอมรับ Test Database URL ที่ถูกต้องพร้อม Cleanup Flag", () => {
    expect(validateTestDatabaseConfig(validEnvironment)).toEqual({
      url: validEnvironment.TEST_DB_URL,
      databaseName: TEST_DATABASE_NAME,
    });
  });

  test("ปฏิเสธ URL ที่ไม่มี TEST_DB_URL", () => {
    expect(() =>
      validateTestDatabaseConfig({
        [TEST_DB_CLEANUP_FLAG]: "true",
      })
    ).toThrow("TEST_DB_URL is required");
  });

  test("ปฏิเสธ Database Name ที่ไม่ตรงกับ Test Database", () => {
    expect(() =>
      validateTestDatabaseConfig({
        ...validEnvironment,
        TEST_DB_URL: "mongodb://127.0.0.1:27017/commute-tracker",
      })
    ).toThrow(`must target the ${TEST_DATABASE_NAME} database`);
  });

  test("ปฏิเสธ URL ที่ malformed", () => {
    expect(() =>
      validateTestDatabaseConfig({
        ...validEnvironment,
        TEST_DB_URL: "not-a-mongodb-url",
      })
    ).toThrow("TEST_DB_URL is not a valid MongoDB URL");
  });

  test("ปฏิเสธเมื่อไม่มี Explicit Test Cleanup Flag", () => {
    expect(() =>
      validateTestDatabaseConfig({
        TEST_DB_URL: validEnvironment.TEST_DB_URL,
      })
    ).toThrow(`${TEST_DB_CLEANUP_FLAG}=true is required`);
  });

  test("ไม่ใช้ MONGODB_URL เป็น fallback", () => {
    expect(() =>
      validateTestDatabaseConfig({
        MONGODB_URL: validEnvironment.TEST_DB_URL,
        [TEST_DB_CLEANUP_FLAG]: "true",
      })
    ).toThrow("TEST_DB_URL is required");
  });
});

