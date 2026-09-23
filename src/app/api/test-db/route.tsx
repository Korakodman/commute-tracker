import { connectDB } from "@/lib/db";
import { NextResponse } from "next/server";



export async function GET() {
    await connectDB()

    return NextResponse.json({message:"เชื่อมฐานข้อมูลสำเร็จ"},{status:200})
    
}