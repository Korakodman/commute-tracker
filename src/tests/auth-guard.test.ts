import { describe, expect, test, vi } from "vitest";

const getSession = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession,
    },
  },
}));

import { requireAuth } from "@/lib/auth-guard";

describe("requireAuth", () => {
  test("ไม่มี Session ต้องคืน JSON 401", async () => {
    getSession.mockResolvedValueOnce(null);

    const response = await requireAuth(
      new Request("http://localhost/api/months")
    );

    expect(response?.status).toBe(401);
    expect(await response?.json()).toEqual({
      message: "กรุณาเข้าสู่ระบบ",
    });
  });

  test("มี Session ต้องอนุญาตให้ Handler ทำงานต่อ", async () => {
    getSession.mockResolvedValueOnce({
      user: { id: "owner-id" },
      session: { id: "session-id" },
    });

    await expect(
      requireAuth(new Request("http://localhost/api/months"))
    ).resolves.toBeNull();
  });

  test("Auth/Database Error ต้องคืน JSON 503 โดยไม่เปิดเผยรายละเอียด", async () => {
    getSession.mockRejectedValueOnce(
      new Error("mongodb://user:secret@internal-host/database")
    );

    const response = await requireAuth(
      new Request("http://localhost/api/months")
    );
    const body = await response?.json();

    expect(response?.status).toBe(503);
    expect(body).toEqual({ message: "ไม่สามารถตรวจสอบสิทธิ์ได้" });
    expect(JSON.stringify(body)).not.toMatch(/mongodb|secret|internal-host/i);
  });
});

