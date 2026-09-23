import mongoose from "mongoose";
const {Schema} = mongoose

// กำหนดหน้าตา(interface) TravelSegment
interface TravelSegment {
    name:string,
    cost:number
}

// กำหนดหน้าตา(interface) TravelRoute
interface TravelRoute {
    name:string,
    type:"OUTBOUND" | "RETURN",
    // นำ TravelSegment ที่เป็น Object มาเป็น array ของ segment
    segments:TravelSegment[]
}
// สร้าง Schema ของ TravelSegment
// กำหนด <> มันคือ generic ของ typescript เป็นการบอกว่า ข้อมูลนี้ควรอิงตามข้อมูลที่กำหนด
const TravelSegmentSchema = new Schema<TravelSegment>({
    // name คือชื่อ field ของ Schema
    // type:String = mongoose จะเก็บเป็น string
    name:{
        type:String,
        required:true,
    },
    cost:{
        type:Number,
        required:true,
        min:0,
    }
})
// สร้าง Schema ของ TravelRoute
const TravelRouteSchema = new Schema<TravelRoute>({
    name:{
    type:String,
    required:true,
    },
    type:{
        type:String,
        // enum คือเป็นค่าใดค่านึง 1 หรือ 2
        enum:["OUTBOUND","RETURN"],
        required:true,
    },
    segments:{
        type:[TravelSegmentSchema],
        required:true
    }
})




// สร้าง model 
const TravelRoute = mongoose.models.TravelRoute || mongoose.model("TravelRoute",TravelRouteSchema)
// ส่งออก
export default TravelRoute