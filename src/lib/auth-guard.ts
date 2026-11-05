import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

export async function requireAuth(
  request: Request
): Promise<NextResponse | null> {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json(
        { message: "กรุณาเข้าสู่ระบบ" },
        { status: 401 }
      );
    }

    return null;
  } catch {
    return NextResponse.json(
      { message: "ไม่สามารถตรวจสอบสิทธิ์ได้" },
      { status: 503 }
    );
  }
}

