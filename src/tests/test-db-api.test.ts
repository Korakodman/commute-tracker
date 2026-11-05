import { afterEach, describe, expect, test, vi } from "vitest";

const connectDB = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  connectDB,
}));

import { GET } from "@/app/api/test-db/route";

afterEach(() => {
  connectDB.mockReset();
  vi.unstubAllEnvs();
});

describe("GET /api/test-db", () => {
  test("Production ต้องปิด Endpoint และไม่เชื่อมต่อ Database", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ message: "ไม่พบ Endpoint" });
    expect(connectDB).not.toHaveBeenCalled();
  });

  test("Development ตรวจสอบ Database ได้โดยไม่เปิดเผยข้อมูลภายใน", async () => {
    vi.stubEnv("NODE_ENV", "development");
    connectDB.mockResolvedValue(undefined);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ message: "เชื่อมฐานข้อมูลสำเร็จ" });
    expect(JSON.stringify(body)).not.toMatch(
      /mongodb|password|credential|database|stack/i
    );
  });

  test("Database Connection Error ไม่เปิดเผยรายละเอียดภายใน", async () => {
    vi.stubEnv("NODE_ENV", "development");
    connectDB.mockRejectedValue(
      new Error("mongodb://user:secret@internal-host/database")
    );

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({
      message: "ไม่สามารถตรวจสอบการเชื่อมต่อฐานข้อมูลได้",
    });
    expect(JSON.stringify(body)).not.toMatch(
      /mongodb|secret|internal-host|stack/i
    );
  });
});

