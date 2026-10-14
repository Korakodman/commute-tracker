import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { NextResponse } from "next/server";

import Month from "@/app/Models/Month";
import TravelDay from "@/app/Models/TravelDay";
import { generateMonthDays } from "@/lib/calender";

function isValidDateString(date: string) {
  const [year, month, day] = date.split("-").map(Number);

  const testDate = new Date(
    Date.UTC(year, month - 1, day)
  );

  return (
    testDate.getUTCFullYear() === year &&
    testDate.getUTCMonth() === month - 1 &&
    testDate.getUTCDate() === day
  );
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();

  // 1. ตรวจสอบ Month ID
  const { id } = await params;

  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json(
      { message: "Month ID ไม่ถูกต้อง" },
      { status: 400 }
    );
  }

  // 2. ค้นหา Month
  const month = await Month.findById(id);

  if (!month) {
    return NextResponse.json(
      { message: "ไม่พบเดือนที่ระบุ" },
      { status: 404 }
    );
  }

  // 3. อ่านการตั้งค่าจาก MongoDB
  const workDays = month.workDays ?? [1, 2, 3, 4, 5];
  const offDates = month.offDates ?? [];

  // 4. ตรวจสอบวันหยุดพิเศษ
  const invalidOffDate = offDates.find((date) => {
    if (!isValidDateString(date)) {
      return true;
    }

    const [year, monthNumber] = date.split("-").map(Number);

    return (
      year !== month.year ||
      monthNumber !== month.month
    );
  });

  if (invalidOffDate) {
    return NextResponse.json(
      {
        message: "พบวันหยุดที่ไม่ถูกต้องหรือไม่ตรงกับเดือน",
        invalidDate: invalidOffDate,
      },
      { status: 400 }
    );
  }

  // 5. ป้องกันการ Generate ซ้ำ
  const existingDays = await TravelDay.countDocuments({
    monthId: month._id,
  });

  if (existingDays > 0) {
    return NextResponse.json(
      {
        message: "เดือนนี้มีปฏิทินอยู่แล้ว",
        existingDays,
      },
      { status: 409 }
    );
  }

  // 6. สร้างวันทั้งหมดจากการตั้งค่าของ Month
  const calendarDays = generateMonthDays(
    month.year,
    month.month,
    workDays,
    offDates,
    month.defaultDailyCost
  );

  // 7. เตรียมข้อมูลสำหรับบันทึก
  const travelDays = calendarDays.map((day) => ({
    monthId: month._id,
    date: day.date,
    status: day.status,
    cost: day.cost,
  }));

  try {
    // 8. บันทึกวันทั้งหมด
    const createdTravelDays =
      await TravelDay.insertMany(travelDays);

    const workDayCount = createdTravelDays.filter(
      (day) => day.status === "WORK"
    ).length;

    const offDayCount = createdTravelDays.filter(
      (day) => day.status === "OFF"
    ).length;

    const totalCost = createdTravelDays.reduce(
      (total, day) => total + day.cost,
      0
    );

    return NextResponse.json(
      {
        message: "สร้างปฏิทินสำเร็จ",
        totalDays: createdTravelDays.length,
        workDays: workDayCount,
        offDays: offDayCount,
        totalCost,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        { message: "พบวันที่ซ้ำในปฏิทิน" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: "เกิดข้อผิดพลาดในการสร้างปฏิทิน" },
      { status: 500 }
    );
  }
}