import {z} from "zod"

export const TravelDaySchema = z.object({
    monthId:z.string().min(1),
    date:z.string().min(1).regex(/^\d{4}-\d{2}-\d{2}$/, "รูปแบบวันที่ต้องเป็น YYYY-MM-DD"),
status:z.enum(["WORK","OFF"]),
cost:z.number().min(0),
note:z.string()

})