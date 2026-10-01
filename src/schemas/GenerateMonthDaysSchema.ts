import { z } from "zod";

export const GenerateMonthDaysSchema = z.object({
  workDays: z
    .array(
      z
        .number()
        .int()
        .min(0)
        .max(6)
    )
    .min(1),

  offDates: z
    .array(
      z.string().regex(
        /^\d{4}-\d{2}-\d{2}$/,
        "รูปแบบวันที่ต้องเป็น YYYY-MM-DD"
      )
    ),
});