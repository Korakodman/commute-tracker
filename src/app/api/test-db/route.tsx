import { connectDB } from "@/lib/db";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";



export async function GET(req: Request) {
    if (process.env.NODE_ENV === "production") {
        return NextResponse.json(
            { message: "ไม่พบ Endpoint" },
            { status: 404 }
        );
    }

    const unauthorized = await requireAuth(req);
    if (unauthorized) return unauthorized;

    try {
        await connectDB();
    } catch {
        return NextResponse.json(
            { message: "ไม่สามารถตรวจสอบการเชื่อมต่อฐานข้อมูลได้" },
            { status: 503 }
        );
    }

    return NextResponse.json(
        { message: "เชื่อมฐานข้อมูลสำเร็จ" },
        { status: 200 }
    );
    
}
