import mongoose from "mongoose";
import { NextResponse } from "next/server";

import Month from "@/app/Models/Month";
import TravelDay from "@/app/Models/TravelDay";
import TravelRoute from "@/app/Models/TravelRoute";
import { connectDB } from "@/lib/db";
import {
  calculateMonthlyCost,
  calculateSelectedRoutesCost,
} from "@/lib/calculations";
import { generateMonthDays } from "@/lib/calender";
import { findInvalidOffDate } from "@/lib/month-validation";
import { findValidatedRouteSelection } from "@/lib/route-selection";
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
    selectedOutboundRouteId: string | null;
    selectedReturnRouteId: string | null;
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

      const selectedOutboundRouteId =
        "selectedOutboundRouteId" in requestedSettings
          ? requestedSettings.selectedOutboundRouteId
          : month.selectedOutboundRouteId?.toString() ?? null;
      const selectedReturnRouteId =
        "selectedReturnRouteId" in requestedSettings
          ? requestedSettings.selectedReturnRouteId
          : month.selectedReturnRouteId?.toString() ?? null;

      const selectedRoutes: {
        id: string | null | undefined;
        expectedType: "OUTBOUND" | "RETURN";
      }[] = [
        { id: selectedOutboundRouteId, expectedType: "OUTBOUND" },
        { id: selectedReturnRouteId, expectedType: "RETURN" },
      ];
      const routeDocuments: Array<InstanceType<typeof TravelRoute> | null> = [];

      for (const selection of selectedRoutes) {
        const selectionResult = await findValidatedRouteSelection(
          selection.id,
          selection.expectedType,
          session
        );

        if ("error" in selectionResult) {
          await session.abortTransaction();
          return NextResponse.json(
            { message: selectionResult.error.message },
            { status: selectionResult.error.status }
          );
        }

        routeDocuments.push(selectionResult.route);
      }

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

      const settingsToSave: Record<string, unknown> = nextSettings;
      settingsToSave.selectedOutboundRouteId = selectedOutboundRouteId;
      settingsToSave.selectedReturnRouteId = selectedReturnRouteId;

      const updatedMonth = await Month.findByIdAndUpdate(id, settingsToSave, {
        returnDocument: "after",
        runValidators: true,
        session,
      });

      if (!updatedMonth) {
        throw new Error("Month disappeared during transaction");
      }

      const routeDailyCost =
        calculateSelectedRoutesCost(routeDocuments[0], routeDocuments[1]) ??
        updatedMonth.defaultDailyCost;

      const calendarDays = generateMonthDays(
        updatedMonth.year,
        updatedMonth.month,
        updatedMonth.workDays,
        updatedMonth.offDates,
        routeDailyCost
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
