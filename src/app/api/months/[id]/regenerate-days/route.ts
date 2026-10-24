import mongoose from "mongoose";
import { NextResponse } from "next/server";

import Month from "@/app/Models/Month";
import TravelDay from "@/app/Models/TravelDay";
import { connectDB } from "@/lib/db";
import { calculateMonthlyCost } from "@/lib/calculations";
import { generateMonthDays } from "@/lib/calender";
import { findInvalidOffDate } from "@/lib/month-validation";
import { UpdateMonthSchema } from "@/schemas/MonthSchema";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json(
      { message: "Month ID ไม่ถูกต้อง" },
      { status: 400 }
    );
  }

  let requestedSettings: Partial<{
    defaultDailyCost: number;
    workDays: number[];
    offDates: string[];
  }> = {};
  try {
    const bodyText = await request.text();

    if (bodyText.trim()) {
      const body: unknown = JSON.parse(bodyText);
      const result = UpdateMonthSchema.safeParse(body);

      if (!result.success) {
        return NextResponse.json(
          {
            message: "ข้อมูลไม่ถูกต้อง",
            errors: result.error.flatten(),
          },
          { status: 400 }
        );
      }

      requestedSettings = result.data;
    }
  } catch {
    return NextResponse.json(
      { message: "ข้อมูล JSON ไม่ถูกต้อง" },
      { status: 400 }
    );
  }

  try {
    await connectDB();
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const month = await Month.findById(id).session(session);

      if (!month) {
        await session.abortTransaction();
        return NextResponse.json(
          { message: "ไม่พบเดือนที่ระบุ" },
          { status: 404 }
        );
      }

      const nextSettings = {
        defaultDailyCost:
          requestedSettings.defaultDailyCost !== undefined
            ? requestedSettings.defaultDailyCost
            : month.defaultDailyCost,
        workDays: Array.isArray(requestedSettings.workDays)
          ? requestedSettings.workDays
          : month.workDays ?? [1, 2, 3, 4, 5],
        offDates: Array.isArray(requestedSettings.offDates)
          ? requestedSettings.offDates
          : month.offDates ?? [],
      };

      const invalidOffDate = findInvalidOffDate(
        nextSettings.offDates,
        month.year,
        month.month
      );

      if (invalidOffDate) {
        await session.abortTransaction();
        return NextResponse.json(
          {
            message: "วันที่หยุดไม่ถูกต้องหรือไม่ตรงกับเดือนที่ระบุ",
            invalidDate: invalidOffDate,
          },
          { status: 400 }
        );
      }

      const updatedMonth = await Month.findByIdAndUpdate(id, nextSettings, {
        returnDocument: "after",
        runValidators: true,
        session,
      });

      if (!updatedMonth) {
        throw new Error("Month disappeared during transaction");
      }

      const calendarDays = generateMonthDays(
        updatedMonth.year,
        updatedMonth.month,
        updatedMonth.workDays,
        updatedMonth.offDates,
        updatedMonth.defaultDailyCost
      );

      const travelDays = calendarDays.map((day) => ({
        monthId: updatedMonth._id,
        date: day.date,
        status: day.status,
        cost: day.status === "OFF" ? 0 : day.cost,
      }));

      await TravelDay.deleteMany({ monthId: updatedMonth._id }).session(session);
      const createdTravelDays = await TravelDay.insertMany(travelDays, {
        session,
      });

      await session.commitTransaction();

      const summary = calculateMonthlyCost(
        createdTravelDays.map((day) => ({
          date: day.date,
          status: day.status,
          cost: day.cost,
        }))
      );
      const workDays = createdTravelDays.filter(
        (day) => day.status === "WORK"
      ).length;

      return NextResponse.json(
        {
          message: "สร้างปฏิทินใหม่สำเร็จ",
          totalDays: createdTravelDays.length,
          workDays,
          offDays: createdTravelDays.length - workDays,
          totalCost: summary.totalCost,
          travelDays: createdTravelDays,
        },
        { status: 200 }
      );
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      console.error("Atomic month settings and regeneration failed:", error);

      return NextResponse.json(
        { message: "เกิดข้อผิดพลาดในการบันทึกการตั้งค่าและสร้างปฏิทินใหม่" },
        { status: 500 }
      );
    } finally {
      await session.endSession();
    }
  } catch (error) {
    console.error("Atomic regeneration request failed:", error);

    return NextResponse.json(
      { message: "เกิดข้อผิดพลาดในการสร้างปฏิทินใหม่" },
      { status: 500 }
    );
  }
}
