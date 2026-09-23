
import { MonthSchema } from "@/schemas/MonthSchema";
import Month from "@/app/Models/Month";
import { connectDB } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
    await connectDB()

  const MonthAll = await Month.find()

  return NextResponse.json({MonthAll},{status:200})

}

export async function POST(req:Request) {
    await connectDB()

    const body:unknown = await req.json()

    const result = MonthSchema.safeParse(body)

    if(!result.success){
        return NextResponse.json({message:"ข้อมูลไม่ถูกต้อง",errors:result.error.flatten()},{status:400})
    }
  
   const NewMonth = await Month.create(result.data)

   return NextResponse.json({NewMonth},{status:201})


}