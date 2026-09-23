import { connectDB } from "@/lib/db";
import { NextResponse } from "next/server";
import TravelRoute from "@/app/Models/TravelRoute";
import { TravelRouteSchema } from "@/schemas/TravelRouteSchema";
import mongoose from "mongoose";


export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}) {

    // ทำให้ทุก field เป็น ตัวเลือกทั้งหมด

    const UpdateTravelRouteSchema = TravelRouteSchema.partial()
    
    await connectDB()


    // รับ ID จาก param route/id ต่อท้าย
    const {id} = await params

    //ให้ mongoose ตรวจสอบ ID ว่าเป็น objectID มั้ย

    if(!mongoose.isValidObjectId(id)){
        return NextResponse.json(
            {
            message:"ID ไม่ถูกต้อง"},{status:400})
    }

    const body:unknown= await req.json()    


    // ตรวจสอบข้อมูลจาก request
    const result = UpdateTravelRouteSchema.safeParse(body)

    
    //เช็คข้อมูล โดยอิงจาก schema กำหนดไว้แล้ว

    if(!result.success){
        return NextResponse.json(
            {
            message:"ข้อมูลไม่ถูกต้อง",
            errors:result.error.flatten()
        },{status:400}
    )
    }


    // ค้นหาและแก้ไขข้อมูล
    const updateRoute = await TravelRoute.findByIdAndUpdate(id,result.data,{
        returnDocument:"after",
        runValidators:true
    })

    // ID ถูกต้อง แต่ไม่มีข้อมูลใน DB
    if(!updateRoute){

        return NextResponse.json({
            message:"ไม่พบ Route ที่ต้องการแก้ไข"
        },{status:404})
    }

 
    return NextResponse.json({updateRoute},{status:200})


}

export async function DELETE(req:Request,{params}:{params:Promise<{id:string}>}) {

    await connectDB()

    const {id} = await params

   
  

    const DeleteRoute = await TravelRoute.findByIdAndDelete(id)

    return NextResponse.json({message:"ลบสำเร็จ"},{status:200})

}