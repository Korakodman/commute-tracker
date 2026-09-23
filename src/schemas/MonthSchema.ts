import {z} from "zod"

export const MonthSchema = z.object({
    year:z.number(),
    month:z.number().min(1).max(12),
    defaultDailyCost:z.number().min(0)
})
