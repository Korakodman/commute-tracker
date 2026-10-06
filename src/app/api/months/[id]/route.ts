import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { NextResponse } from "next/server";

import Month from "@/app/Models/Month";
import TravelDay from "@/app/Models/TravelDay";

import { calculateMonthlyCost } from "@/lib/calculations";

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