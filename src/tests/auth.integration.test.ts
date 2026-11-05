import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { validateTestDatabaseConfig } from "./test-db-safety";

const testDatabaseConfig = validateTestDatabaseConfig();
process.env.MONGODB_URL = testDatabaseConfig.url;

const [{ auth, createAuthInstance, getAuthMongoClient }, authHandler] =
  await Promise.all([
    import("@/lib/auth"),
    import("@/app/api/auth/[...all]/route"),
  ]);

const testClient = getAuthMongoClient();
const testUser = {
  email: "owner-auth-integration@example.com",
  name: "Integration Owner",
  password: "correct-horse-battery-staple",
};

async function clearAuthCollections() {
  const db = testClient.db();

  for (const collectionName of [
    "user",
    "session",
    "account",
    "verification",
    "rateLimit",
  ]) {
    await db.collection(collectionName).deleteMany({});
  }
}

beforeAll(async () => {
  await testClient.connect();
  await clearAuthCollections();

  const bootstrapAuth = createAuthInstance({ disableSignUp: false });
  await bootstrapAuth.api.signUpEmail({
    body: testUser,
  });
});

afterAll(async () => {
  await clearAuthCollections();
  await testClient.close();
  await mongoose.connection.close().catch(() => undefined);
});

describe("Better Auth integration", () => {
  test("Owner Login สำเร็จและสร้าง Session ที่ตรวจสอบได้", async () => {
    const response = await authHandler.POST(
      new Request("http://localhost/api/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testUser),
      })
    );

    expect(response.status).toBe(200);

    const cookie = response.headers.get("set-cookie");
    expect(cookie).toBeTruthy();

    const session = await auth.api.getSession({
      headers: new Headers({ cookie: cookie ?? "" }),
    });

    expect(session?.user.email).toBe(testUser.email);
  });

  test("Password ผิดต้อง Login ไม่สำเร็จ", async () => {
    const response = await authHandler.POST(
      new Request("http://localhost/api/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testUser.email,
          password: "wrong-password-value",
        }),
      })
    );

    expect(response.status).not.toBe(200);
  });

  test("Email ผิดต้อง Login ไม่สำเร็จ", async () => {
    const response = await authHandler.POST(
      new Request("http://localhost/api/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "unknown-owner@example.com",
          password: testUser.password,
        }),
      })
    );

    expect(response.status).not.toBe(200);
  });

  test("Runtime Signup ถูกปิด", async () => {
    const response = await authHandler.POST(
      new Request("http://localhost/api/auth/sign-up/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "blocked-signup@example.com",
          name: "Blocked Signup",
          password: "correct-horse-battery-staple",
        }),
      })
    );

    expect(response.status).not.toBe(200);
    expect(
      await testClient.db().collection("user").countDocuments({
        email: "blocked-signup@example.com",
      })
    ).toBe(0);
  });

  test("Logout ยกเลิก Session ฝั่ง Server", async () => {
    const signInResponse = await authHandler.POST(
      new Request("http://localhost/api/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testUser),
      })
    );
    const cookie = signInResponse.headers.get("set-cookie") ?? "";

    const beforeLogout = await auth.api.getSession({
      headers: new Headers({ cookie }),
    });
    expect(beforeLogout).not.toBeNull();

    const logoutResponse = await authHandler.POST(
      new Request("http://localhost/api/auth/sign-out", {
        method: "POST",
        headers: { cookie },
      })
    );

    expect(logoutResponse.status).toBe(200);

    const afterLogout = await auth.api.getSession({
      headers: new Headers({ cookie }),
    });
    expect(afterLogout).toBeNull();
  });

  test("API ข้อมูลไม่มี Session ต้องได้ 401 และมี Session จึงทำงานได้", async () => {
    const { GET: getMonths } = await import("@/app/api/months/route");

    const unauthorizedResponse = await getMonths(
      new Request("http://localhost/api/months")
    );
    expect(unauthorizedResponse.status).toBe(401);

    const signInResponse = await authHandler.POST(
      new Request("http://localhost/api/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testUser),
      })
    );
    const cookie = signInResponse.headers.get("set-cookie") ?? "";

    const authorizedResponse = await getMonths(
      new Request("http://localhost/api/months", {
        headers: { cookie },
      })
    );
    expect(authorizedResponse.status).toBe(200);
  });
});

