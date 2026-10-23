
import { MonthSchema } from "@/schemas/MonthSchema";
import Month from "@/app/Models/Month";
import { connectDB } from "@/lib/db";
import { findInvalidOffDate } from "@/lib/month-validation";
import { NextResponse } from "next/server";

export async function GET() {
    await connectDB()

  const MonthAll = await Month.find()

  return NextResponse.json({MonthAll},{status:200})

}

export async function POST(req:Request) {
    await connectDB()

    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { message: "ข้อมูล JSON ไม่ถูกต้อง" },
        { status: 400 }
      );
    }

   const result = MonthSchema.safeParse(body)

if(!result.success){
    return NextResponse.json(
        {
            message:"ข้อมูลไม่ถูกต้อง",
            errors:result.error.flatten()
        },
        {status:400}
    )
}

const invalidOffDate = findInvalidOffDate(
  result.data.offDates,
  result.data.year,
  result.data.month
);

if (invalidOffDate) {
  return NextResponse.json(
    {
      message: "วันที่หยุดไม่ถูกต้องหรือไม่ตรงกับเดือนที่ระบุ",
      invalidDate: invalidOffDate,
    },
    { status: 400 }
  );
}

try {
  const NewMonth = await Month.create(result.data)

  return NextResponse.json({NewMonth},{status:201})
} catch (error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  ) {
    return NextResponse.json(
      { message: "เดือนนี้มีอยู่แล้ว" },
      { status: 409 }
    );
  }

  return NextResponse.json(
    { message: "เกิดข้อผิดพลาดในการสร้างเดือน" },
    { status: 500 }
  );
}


}
