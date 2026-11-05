import { afterEach, describe, expect, test, vi } from "vitest";

const connectDB = vi.hoisted(() => vi.fn());
const requireAuth = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  connectDB,
}));

vi.mock("@/lib/auth-guard", () => ({
  requireAuth,
}));

import { GET } from "@/app/api/test-db/route";

afterEach(() => {
  connectDB.mockReset();
  vi.unstubAllEnvs();
});

describe("GET /api/test-db", () => {
  test("Production ต้องปิด Endpoint และไม่เชื่อมต่อ Database", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const response = await GET(
      new Request("http://localhost/api/test-db")
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ message: "ไม่พบ Endpoint" });
    expect(connectDB).not.toHaveBeenCalled();
  });

  test("Development ตรวจสอบ Database ได้โดยไม่เปิดเผยข้อมูลภายใน", async () => {
    vi.stubEnv("NODE_ENV", "development");
    requireAuth.mockResolvedValue(null);
    connectDB.mockResolvedValue(undefined);

    const response = await GET(
      new Request("http://localhost/api/test-db")
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ message: "เชื่อมฐานข้อมูลสำเร็จ" });
    expect(JSON.stringify(body)).not.toMatch(
      /mongodb|password|credential|database|stack/i
    );
  });

  test("Database Connection Error ไม่เปิดเผยรายละเอียดภายใน", async () => {
    vi.stubEnv("NODE_ENV", "development");
    requireAuth.mockResolvedValue(null);
    connectDB.mockRejectedValue(
      new Error("mongodb://user:secret@internal-host/database")
    );

    const response = await GET(
      new Request("http://localhost/api/test-db")
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({
      message: "ไม่สามารถตรวจสอบการเชื่อมต่อฐานข้อมูลได้",
    });
    expect(JSON.stringify(body)).not.toMatch(
      /mongodb|secret|internal-host|stack/i
    );
  });

  test("Development ที่ไม่มี Session ต้องได้ 401", async () => {
    vi.stubEnv("NODE_ENV", "development");
    requireAuth.mockResolvedValue(
      new Response(JSON.stringify({ message: "กรุณาเข้าสู่ระบบ" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    );

    const response = await GET(new Request("http://localhost/api/test-db"));

    expect(response.status).toBe(401);
    expect(connectDB).not.toHaveBeenCalled();
  });
});

