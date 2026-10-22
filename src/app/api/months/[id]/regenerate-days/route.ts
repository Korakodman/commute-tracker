import mongoose from "mongoose";
import { NextResponse } from "next/server";

import Month from "@/app/Models/Month";
import TravelDay from "@/app/Models/TravelDay";
import { connectDB } from "@/lib/db";
import { generateMonthDays } from "@/lib/calender";

function isValidDateString(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;

  const [year, month, day] = date.split("-").map(Number);
  const testDate = new Date(Date.UTC(year, month - 1, day));

  return (
    testDate.getUTCFullYear() === year &&
    testDate.getUTCMonth() === month - 1 &&
    testDate.getUTCDate() === day
  );
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json(
      { message: "Month ID ไม่ถูกต้อง" },
      { status: 400 }
    );
  }

  try {
    await connectDB();

    const month = await Month.findById(id);

    if (!month) {
      return NextResponse.json(
        { message: "ไม่พบเดือนที่ระบุ" },
        { status: 404 }
      );
    }

    const workDays = month.workDays ?? [1, 2, 3, 4, 5];
    const offDates = month.offDates ?? [];
    const invalidOffDate = offDates.find((date: string) => {
      if (!isValidDateString(date)) return true;

      const [year, monthNumber] = date.split("-").map(Number);

      return year !== month.year || monthNumber !== month.month;
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

    const calendarDays = generateMonthDays(
      month.year,
      month.month,
      workDays,
      offDates,
      month.defaultDailyCost
    );

    const travelDays = calendarDays.map((day) => ({
      monthId: month._id,
      date: day.date,
      status: day.status,
      cost: day.cost,
    }));

    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      await TravelDay.deleteMany({ monthId: month._id }).session(session);
      const createdTravelDays = await TravelDay.insertMany(travelDays, {
        session,
      });

      await session.commitTransaction();

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
          message: "สร้างปฏิทินใหม่สำเร็จ",
          totalDays: createdTravelDays.length,
          workDays: workDayCount,
          offDays: offDayCount,
          totalCost,
          travelDays: createdTravelDays,
        },
        { status: 200 }
      );
    } catch (error) {
      await session.abortTransaction();
      console.error("Regenerate month days failed:", error);

      return NextResponse.json(
        { message: "เกิดข้อผิดพลาดในการสร้างปฏิทินใหม่" },
        { status: 500 }
      );
    } finally {
      await session.endSession();
    }
  } catch (error) {
    console.error("Regenerate month days request failed:", error);

    return NextResponse.json(
      { message: "เกิดข้อผิดพลาดในการสร้างปฏิทินใหม่" },
      { status: 500 }
    );
  }
}
