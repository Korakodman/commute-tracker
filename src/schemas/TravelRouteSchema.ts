import {z} from "zod";


// สร้าง schema โดยให้ zod เป็นตัว validate ข้อมูลและส่งออกไปใช้ validate ได้

const routeNameSchema = z.string().trim().min(1);
const segmentCostSchema = z.number().finite().min(0);

export const TravelRouteSchema = z.object({
    name:routeNameSchema,
    type:z.enum(["OUTBOUND","RETURN"]),
    segments:z.array(z.object({
        name:routeNameSchema,
        cost:segmentCostSchema
    })).min(1)
})

