import { NextResponse } from "next/server";

import Month from "@/app/Models/Month";
import TravelDay from "@/app/Models/TravelDay";
import { calculateMonthlyCost } from "@/lib/calculations";
import { connectDB } from "@/lib/db";

export async function GET() {
  try {
    await connectDB();

    const months = await Month.find().sort({ year: -1, month: -1 });
    const monthIds = months.map((month) => month._id);
    const travelDays = monthIds.length
      ? await TravelDay.find({ monthId: { $in: monthIds } })
      : [];

    const travelDaysByMonth = new Map<string, typeof travelDays>();

    for (const travelDay of travelDays) {
      const monthId = travelDay.monthId.toString();
      const currentDays = travelDaysByMonth.get(monthId) ?? [];

      currentDays.push(travelDay);
      travelDaysByMonth.set(monthId, currentDays);
    }

    const history = months.map((month) => {
      const monthTravelDays = travelDaysByMonth.get(month._id.toString()) ?? [];
      const calculationDays = monthTravelDays.map((day) => ({
        date: day.date,
        status: day.status as "WORK" | "OFF",
        cost: day.cost,
      }));
      const monthlyCost = calculateMonthlyCost(calculationDays);
      const totalDays = monthTravelDays.length;

      return {
        year: month.year,
        month: month.month,
        totalDays,
        workDays: monthlyCost.travelDays,
        offDays: totalDays - monthlyCost.travelDays,
        totalCost: monthlyCost.totalCost,
        hasCalendar: totalDays > 0,
      };
    });

    return NextResponse.json({ history }, { status: 200 });
  } catch (error) {
    console.error("Failed to load monthly history:", error);

    return NextResponse.json(
      { message: "เกิดข้อผิดพลาดในการโหลดประวัติรายเดือน" },
      { status: 500 }
    );
  }
}
