import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { NextResponse } from "next/server";

import Month from "@/app/Models/Month";
import TravelDay from "@/app/Models/TravelDay";

import { GenerateMonthDaysSchema } from "@/schemas/GenerateMonthDaysSchema";
import { generateMonthDays } from "@/lib/calender";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();

  // 1. รับ Month ID
  const { id } = await params;

  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json(
      {
        message: "Month ID ไม่ถูกต้อง",
      },
      { status: 400 }
    );
  }

  // 2. หา Month
  const month = await Month.findById(id);

  if (!month) {
    return NextResponse.json(
      {
        message: "ไม่พบเดือนที่ระบุ",
      },
      { status: 404 }
    );
  }

  const body: unknown = await req.json();
  const result = GenerateMonthDaysSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      {
        message: "ข้อมูลไม่ถูกต้อง",
        errors: result.error.flatten(),
      },
      { status: 400 }
    );
  }

  const { workDays, offDates } = result.data;


  // 5. ตรวจว่าเดือนนี้มี TravelDay อยู่แล้วหรือยัง
  const existingDays = await TravelDay.countDocuments({
    monthId: id,
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

  // 6. ตรวจ offDates ให้อยู่ในเดือนเดียวกัน
  const monthString = `${month.year}-${String(
    month.month
  ).padStart(2, "0")}`;

  const invalidOffDate = offDates.find(
    (date) => !date.startsWith(`${monthString}-`)
  );

  if (invalidOffDate) {
    return NextResponse.json(
      {
        message: "offDates มีวันที่ไม่ตรงกับเดือนที่กำหนด",
        invalidDate: invalidOffDate,
      },
      { status: 400 }
    );
  }

  // 7. สร้าง Calendar
  const calendarDays = generateMonthDays(
    month.year,
    month.month,
    workDays,
    offDates,
    month.defaultDailyCost
  );

  // 8. แปลงเป็นข้อมูลสำหรับ TravelDay
  const travelDays = calendarDays.map((day) => ({
    monthId: new mongoose.Types.ObjectId(id),
    date: day.date,
    status: day.status,
    cost: day.cost,
  }));

  try {
    // 9. บันทึกทั้งหมดทีเดียว
    const createdTravelDays = await TravelDay.insertMany(
      travelDays
    );

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
        travelDays: createdTravelDays,
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
        {
          message: "พบวันที่ซ้ำในปฏิทิน",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        message: "เกิดข้อผิดพลาดในการสร้างปฏิทิน",
      },
      { status: 500 }
    );
  }
}
