import {z} from "zod";


// สร้าง schema โดยให้ zod เป็นตัว validate ข้อมูลและส่งออกไปใช้ validate ได้

export const TravelRouteSchema = z.object({
    name:z.string().min(1),
    type:z.enum(["OUTBOUND","RETURN"]),
    segments:z.array(z.object({
        name:z.string().min(1),
        cost:z.number().min(0)
    })).min(1)
})

