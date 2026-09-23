import mongoose from "mongoose";
const {Schema} = mongoose

interface TravelDay {
    monthId:mongoose.Types.ObjectId,
    date:string,
    status:"WORK"|"OFF",
    cost:number,
    note?:string
}

const TravelDaySchema = new Schema<TravelDay>({
    monthId:{
        type:Schema.Types.ObjectId,
        ref:"Month",
        required:true
    },
    date:{
        type:String,
        required:true
    },
    status:{
       type:String,
       enum:["WORK","OFF"],
       required:true,
    },
    cost:{
     type:Number,
     required:true,
     min:0,
    },
  note:{
    type:String
  }
}) 

TravelDaySchema.index(
    {monthId:1,date:1},
    {unique:true}
)

const TravelDay = mongoose.models.TravelDay || mongoose.model("TravelDay",TravelDaySchema)

export default TravelDay