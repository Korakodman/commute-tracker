import { connectDB } from "@/lib/db";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

import TravelDay from "@/app/Models/TravelDay";
import Month from "@/app/Models/Month";
import { TravelDaySchema } from "@/schemas/TravelDaySchema";

const UpdateTravelDaySchema = TravelDaySchema.partial();

function isValidDateString(data: string) {
  const [year, month, day] = data.split("-").map(Number);

  const testDate = new Date(
    Date.UTC(year, month - 1, day)
  );

  return (
    testDate.getUTCFullYear() === year &&
    testDate.getUTCMonth() === month - 1 &&
    testDate.getUTCDate() === day
  );
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();

  const { id } = await params;

  // 1. ตรวจ TravelDay ID
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json(
      { message: "ID ไม่ถูกต้อง" },
      { status: 400 }
    );
  }

  // 2. รับ body
  const body: unknown = await req.json();

  // 3. Validate body
  const result = UpdateTravelDaySchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      {
        message: "ข้อมูลไม่ถูกต้อง",
        errors: result.error.flatten(),
      },
      { status: 400 }
    );
  }

  // 4. หา TravelDay เดิม
  const currentTravelDay = await TravelDay.findById(id);

  if (!currentTravelDay) {
    return NextResponse.json(
      { message: "ไม่พบ TravelDay ที่ต้องการแก้ไข" },
      { status: 404 }
    );
  }

  // 5. ถ้าส่ง monthId ใหม่มา ให้ตรวจสอบก่อน
  if (result.data.monthId) {
    if (!mongoose.isValidObjectId(result.data.monthId)) {
      return NextResponse.json(
        { message: "monthId ไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const month = await Month.findById(result.data.monthId);

    if (!month) {
      return NextResponse.json(
        { message: "ไม่พบเดือนที่ระบุ" },
        { status: 404 }
      );
    }
  }

  // 6. หา Month เป้าหมาย
  const targetMonthId =
    result.data.monthId ?? currentTravelDay.monthId;

  const targetMonth = await Month.findById(targetMonthId);

  if (!targetMonth) {
    return NextResponse.json(
      { message: "ไม่พบเดือนที่ TravelDay อ้างอิง" },
      { status: 404 }
    );
  }

  // 7. หา date เป้าหมาย
  const targetDate =
    result.data.date ?? currentTravelDay.date;

  // 8. ตรวจว่าเป็นวันที่จริง
  if (!isValidDateString(targetDate)) {
    return NextResponse.json(
      { message: "วันที่ไม่ถูกต้อง" },
      { status: 400 }
    );
  }

  // 9. ตรวจว่า date อยู่ในเดือนเดียวกับ Month
  const [year, monthNumber] = targetDate
    .split("-")
    .map(Number);

  if (
    year !== targetMonth.year ||
    monthNumber !== targetMonth.month
  ) {
    return NextResponse.json(
      { message: "วันที่ไม่ตรงกับเดือนที่ระบุ" },
      { status: 400 }
    );
  }

  // 10. Update
  try {
    const updatedTravelDay =
      await TravelDay.findByIdAndUpdate(
        id,
        result.data,
        {
          returnDocument: "after",
          runValidators: true,
        }
      );

    return NextResponse.json(
      {
        message: "แก้ไข TravelDay สำเร็จ",
        travelDay: updatedTravelDay,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    // Duplicate key
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
        message: "เกิดข้อผิดพลาดในการแก้ไข TravelDay",
      },
      { status: 500 }
    );
  }
}