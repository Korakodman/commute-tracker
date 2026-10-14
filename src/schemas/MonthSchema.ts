import { z } from "zod";

const yearSchema = z.number().int().min(2000);

const monthNumberSchema = z
  .number()
  .int()
  .min(1)
  .max(12);

const dailyCostSchema = z.number().min(0);

const workDaysSchema = z
  .array(
    z.number().int().min(0).max(6)
  )
  .refine(
    (days) => new Set(days).size === days.length,
    "ห้ามกำหนดวันในสัปดาห์ซ้ำ"
  );

const offDatesSchema = z.array(
  z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    "รูปแบบวันที่ต้องเป็น YYYY-MM-DD"
  )
);

// ใช้ตอนสร้างเดือน
export const MonthSchema = z.object({
  year: yearSchema,
  month: monthNumberSchema,
  defaultDailyCost: dailyCostSchema,
  workDays: workDaysSchema.default([1, 2, 3, 4, 5]),
  offDates: offDatesSchema.default([]),
});

// ใช้ตอนแก้การตั้งค่าของเดือนที่มีอยู่แล้ว
export const UpdateMonthSchema = z
  .object({
    defaultDailyCost: dailyCostSchema.optional(),
    workDays: workDaysSchema.optional(),
    offDates: offDatesSchema.optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    "ต้องระบุข้อมูลอย่างน้อยหนึ่ง field"
  );
