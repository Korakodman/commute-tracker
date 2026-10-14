import mongoose from "mongoose";
const {Schema} = mongoose


interface Month{
    year:number,
    month:number,
    defaultDailyCost:number,
    workDays:number[],
    offDates:string[]
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
    },
    workDays:{
        type:[Number],
        required:true,
        default:[1,2,3,4,5],
        validate:{
            validator:(days:number[]) =>
                days.every((day) => Number.isInteger(day) && day >= 0 && day <= 6)
        }
    },
    offDates:{
        type:[String],
        required:true,
        default:[]
    }
})


MonthSchema.index(
    {year:1,month:1},
    {unique:true}
)

const Month = mongoose.models.Month || mongoose.model("Month",MonthSchema)

export default Month
