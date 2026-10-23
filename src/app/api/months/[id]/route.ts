import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { NextResponse } from "next/server";

import Month from "@/app/Models/Month";
import TravelDay from "@/app/Models/TravelDay";
import { UpdateMonthSchema } from "@/schemas/MonthSchema";

import { calculateMonthlyCost } from "@/lib/calculations";
import { isDateInMonth, isValidDateString } from "@/lib/month-validation";

export async function GET(req:Request,{params}:{params : Promise<{id:string}>}) {
    await connectDB()

    const {id} = await params

    if(!mongoose.isValidObjectId(id)){
        return NextResponse.json({message:"Month ID ไม่ถูกต้อง"},{status:400})
    }

    const month = await Month.findById(id)

    if(!month){
        return NextResponse.json({message:"ไม่พบเดือนที่ระบุ"},{status:404})
    }
    
    const travelDays = await TravelDay.find({
        monthId:id,
    }).sort({date:1})

   const calculationDay = travelDays.map((day)=>({
    date:day.date,
    status:day.status as "WORK" | "OFF",
    cost:day.cost,
   }))

   const monthlyCost = calculateMonthlyCost(calculationDay)
   
   const totalDays = travelDays.length
   const offDays = totalDays - monthlyCost.travelDays

   return NextResponse.json({
    month,travelDays,summary:{
        totalDays,
        workDays:monthlyCost.travelDays,
        offDays,
        totalCost:monthlyCost.totalCost,
    }
   },{status:200})

}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();

  const { id } = await params;

  // 1. ตรวจสอบ Month ID
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json(
      { message: "Month ID ไม่ถูกต้อง" },
      { status: 400 }
    );
  }

  // 2. ตรวจสอบว่า Month มีอยู่จริง
  const month = await Month.findById(id);

  if (!month) {
    return NextResponse.json(
      { message: "ไม่พบเดือนที่ต้องการแก้ไข" },
      { status: 404 }
    );
  }

  // 3. Validate body ด้วย Zod
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { message: "ข้อมูล JSON ไม่ถูกต้อง" },
      { status: 400 }
    );
  }
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

  // 4. ตรวจสอบว่าวันหยุดเป็นวันที่จริง
  const invalidDate = result.data.offDates?.find(
    (date) => !isValidDateString(date)
  );

  if (invalidDate) {
    return NextResponse.json(
      {
        message: "วันที่ไม่ถูกต้อง",
        invalidDate,
      },
      { status: 400 }
    );
  }

  // 5. ตรวจว่าวันหยุดอยู่ในเดือนที่กำลังแก้ไข
  const outsideMonthDate = result.data.offDates?.find(
    (date) => isValidDateString(date) && !isDateInMonth(date, month.year, month.month)
  );

  if (outsideMonthDate) {
    return NextResponse.json(
      {
        message: "วันที่หยุดไม่ตรงกับเดือนที่ระบุ",
        invalidDate: outsideMonthDate,
      },
      { status: 400 }
    );
  }

  // 6. บันทึกค่าที่แก้ไข
  const updatedMonth = await Month.findByIdAndUpdate(
    id,
    result.data,
    {
      returnDocument: "after",
      runValidators: true,
    }
  );

  if (!updatedMonth) {
    return NextResponse.json(
      { message: "ไม่พบเดือนที่ต้องการแก้ไข" },
      { status: 404 }
    );
  }

  return NextResponse.json(
    {
      message: "แก้ไขการตั้งค่าเดือนสำเร็จ",
      month: updatedMonth,
    },
    { status: 200 }
  );
}
