import { connectDB } from "@/lib/db";
import { NextResponse } from "next/server";



export async function GET() {
    if (process.env.NODE_ENV === "production") {
        return NextResponse.json(
            { message: "ไม่พบ Endpoint" },
            { status: 404 }
        );
    }

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
