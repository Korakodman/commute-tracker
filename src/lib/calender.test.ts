import { describe, expect, test } from "vitest";
import { generateMonthDays } from "./calender";

describe("generateMonthDays", () => {
  test("ควรสร้างวันที่ครบตามจำนวนวันของเดือน", () => {
    const result = generateMonthDays(
      2026,
      9,
      [1, 2, 3, 4, 5],
      [],
      134
    );

    expect(result).toHaveLength(30);
  });

  test("วันจันทร์ถึงศุกร์ควรเป็น WORK และเสาร์อาทิตย์ควรเป็น OFF", () => {
    const result = generateMonthDays(
      2026,
      9,
      [1, 2, 3, 4, 5],
      [],
      134
    );

    expect(result.find((day) => day.date === "2026-09-01"))
      .toEqual({
        date: "2026-09-01",
        status: "WORK",
        cost: 134,
      });

    expect(result.find((day) => day.date === "2026-09-05"))
      .toEqual({
        date: "2026-09-05",
        status: "OFF",
        cost: 0,
      });
  });

  test("offDates ควร override วันทำงานให้เป็น OFF", () => {
    const result = generateMonthDays(
      2026,
      9,
      [1, 2, 3, 4, 5],
      ["2026-09-14"],
      134
    );

    expect(result.find((day) => day.date === "2026-09-14"))
      .toEqual({
        date: "2026-09-14",
        status: "OFF",
        cost: 0,
      });
  });

  test("WORK ควรใช้ defaultDailyCost", () => {
    const result = generateMonthDays(
      2026,
      9,
      [1, 2, 3, 4, 5],
      [],
      150
    );

    const workDay = result.find(
      (day) => day.date === "2026-09-01"
    );

    expect(workDay?.cost).toBe(150);
  });

  test("OFF ควรมี cost เป็น 0", () => {
    const result = generateMonthDays(
      2026,
      9,
      [1, 2, 3, 4, 5],
      [],
      150
    );

    const offDay = result.find(
      (day) => day.date === "2026-09-05"
    );

    expect(offDay?.cost).toBe(0);
  });

  test("February ปีปกติควรมี 28 วัน", () => {
    const result = generateMonthDays(
      2026,
      2,
      [1, 2, 3, 4, 5],
      [],
      134
    );

    expect(result).toHaveLength(28);
  });

  test("February ใน Leap Year ควรมี 29 วัน", () => {
    const result = generateMonthDays(
      2028,
      2,
      [1, 2, 3, 4, 5],
      [],
      134
    );

    expect(result).toHaveLength(29);
  });
});