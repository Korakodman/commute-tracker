import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import TravelDay from "@/app/Models/TravelDay";
import { TravelDaySchema } from "@/schemas/TravelDaySchema";
import { NextResponse } from "next/server";
import Month from "@/app/Models/Month";

 function isValidDateString(date: string) {
  const [year, month, day] = date.split("-").map(Number);

  const testDate = new Date(Date.UTC(year, month - 1, day));

  return (
    testDate.getUTCFullYear() === year &&
    testDate.getUTCMonth() === month - 1 &&
    testDate.getUTCDate() === day
  );
}
   

export async function POST(req: Request) {
  await connectDB();

  const body: unknown = await req.json();

  // 1. Validate ข้อมูลด้วย Zod
  const result = TravelDaySchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      {
        message: "ข้อมูลไม่ถูกต้อง",
        errors: result.error.flatten(),
      },
      { status: 400 }
    );
  }

  const { monthId, date, status, cost, note } = result.data;

  // 2. ตรวจว่า monthId เป็น ObjectId ที่ถูกต้องหรือไม่
  if (!mongoose.isValidObjectId(monthId)) {
    return NextResponse.json(
      {
        message: "monthId ไม่ถูกต้อง",
      },
      { status: 400 }
    );
  }

  // 3. ตรวจว่า Month มีอยู่จริงหรือไม่
  const month = await Month.findById(monthId);

  if (!month) {
    return NextResponse.json(
      {
        message: "ไม่พบเดือนที่ระบุ",
      },
      { status: 404 }
    );
  }

const [year, monthNumber] = date.split("-").map(Number);

if (year !== month.year || monthNumber !== month.month) {
  return NextResponse.json(
    {
      message: "วันที่ไม่ตรงกับเดือนที่ระบุ",
    },
    { status: 400 }
  );
}


  
if (!isValidDateString(date)) {
  return NextResponse.json(
    {
      message: "วันที่ไม่ถูกต้อง",
    },
    { status: 400 }
  );
}

  // 4. สร้าง TravelDay
  try {
    const newTravelDay = await TravelDay.create({
      monthId,
      date,
      status,
      cost,
      note,
    });

    return NextResponse.json(
      {
        message: "สร้าง TravelDay สำเร็จ",
        travelDay: newTravelDay,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    // Duplicate key จาก unique index
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        {
          message: "วันที่นี้มีอยู่ในเดือนนี้แล้ว",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        message: "เกิดข้อผิดพลาดในการสร้าง TravelDay",
      },
      { status: 500 }
    );
  }
}

export async function GET(req:Request) {
    await connectDB()

     // อ่าน query parameter จาก URL
    const {searchParams} = new URL(req.url)
    const monthId = searchParams.get("monthId")

    if(!monthId){
        return NextResponse.json({message:"กรุณาระบุ MonthId"},{status:400})
    }

    if(!mongoose.isValidObjectId(monthId)){
        return NextResponse.json({message:"monthId ไม่ถูกต้อง"},{status:400})
    }
   const TravelDays = await TravelDay.find({monthId}).sort({date:1})

   return NextResponse.json({TravelDays},{status:200})
}
