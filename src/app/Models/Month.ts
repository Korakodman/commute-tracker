import mongoose from "mongoose";
const {Schema} = mongoose


interface Month{
    year:number,
    month:number,
    defaultDailyCost:number
}

const MonthSchema = new Schema<Month>({
    year:{
        type:Number,
        required:true,
    },
    month:{
        type:Number,
        required:true,
        min:1,
        max:12,
    },
    defaultDailyCost:{
        type:Number,
        required:true,
        min:0,
    }
})


MonthSchema.index(
    {year:1,month:1},
    {unique:true}
)

const Month = mongoose.models.Month || mongoose.model("Month",MonthSchema)

export default Month