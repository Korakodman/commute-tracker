import { describe, expect, test } from "vitest";
import {
  calculateDailyCost,
  calculateRouteCost,
  calculateMonthlyCost,
  calculateSelectedRoutesCost,
} from "./calculations";

describe("calculateRouteCost", () => {
  test("ควรคำนวณค่าเดินทางรวมของ route ได้ถูกต้อง", () => {
    const segments = [
      {
        name: "บ้าน → BTS",
        cost: 15,
      },
      {
        name: "BTS → MRT",
        cost: 35,
      },
      {
        name: "MRT → ที่ทำงาน",
        cost: 17,
      },
    ];

    const result = calculateRouteCost(segments);

    expect(result).toBe(67);
  });
});

describe("calculateDailyCost", () => {
  test("ควรคำนวณค่าเดินทางไป-กลับต่อวันได้ถูกต้อง", () => {
    const outbound = [
      {
        name: "บ้าน → BTS",
        cost: 15,
      },
      {
        name: "BTS → MRT",
        cost: 35,
      },
      {
        name: "MRT → ที่ทำงาน",
        cost: 17,
      },
    ];

    const returnRoute = [
      {
        name: "ที่ทำงาน → MRT",
        cost: 17,
      },
      {
        name: "MRT → BTS",
        cost: 35,
      },
      {
        name: "BTS → บ้าน",
        cost: 15,
      },
    ];

    const result = calculateDailyCost(
      outbound,
      returnRoute
    );

    expect(result).toBe(134);
  });
});

test("route ว่างควรมีค่าเป็น 0", () => {
  const result = calculateRouteCost([]);

  expect(result).toBe(0);
});

test("ควรรวมเฉพาะ Route ที่เลือก และคืน undefined เมื่อไม่เลือก Route", () => {
  const outbound = { segments: [{ name: "bus", cost: 15 }] };
  const returnRoute = { segments: [{ name: "train", cost: 25 }] };

  expect(calculateSelectedRoutesCost(outbound, returnRoute)).toBe(40);
  expect(calculateSelectedRoutesCost(outbound, null)).toBe(15);
  expect(calculateSelectedRoutesCost(null, null)).toBeUndefined();
});


describe("calculateMonthlyCost", () => {
  test("ควรคำนวณยอดรวมและจำนวนวันที่เดินทางได้ถูกต้อง", () => {
    const travelDays = [
      {
        date: "2026-09-01",
        status: "WORK" as const,
        cost: 134,
      },
      {
        date: "2026-09-02",
        status: "WORK" as const,
        cost: 134,
      },
      {
        date: "2026-09-03",
        status: "OFF" as const,
        cost: 0,
      },
      {
        date: "2026-09-04",
        status: "WORK" as const,
        cost: 150,
      },
    ];

    const result = calculateMonthlyCost(travelDays);

    expect(result).toEqual({
      totalCost: 418,
      travelDays: 3,
    });
  });

  test("ถ้าทุกวันเป็น OFF ควรได้ค่าเป็น 0", () => {
    const travelDays = [
      {
        date: "2026-09-01",
        status: "OFF" as const,
        cost: 0,
      },
      {
        date: "2026-09-02",
        status: "OFF" as const,
        cost: 0,
      },
    ];

    const result = calculateMonthlyCost(travelDays);

    expect(result).toEqual({
      totalCost: 0,
      travelDays: 0,
    });
  });

  test("ถ้าไม่มีข้อมูลควรได้ค่าเริ่มต้น", () => {
    const result = calculateMonthlyCost([]);

    expect(result).toEqual({
      totalCost: 0,
      travelDays: 0,
    });
  });

  test("วัน OFF ที่มี cost ต้องไม่ถูกนำมาคำนวณ", () => {
  const travelDays = [
    {
      date: "2026-09-03",
      status: "OFF" as const,
      cost: 200,
    },
  ];

  const result = calculateMonthlyCost(travelDays);

  expect(result).toEqual({
    totalCost: 0,
    travelDays: 0,
  });
});

test("วัน WORK ที่มีค่าเดินทาง 0 บาท ต้องนับเป็นวันเดินทาง", () => {
  const travelDays = [
    {
      date: "2026-09-03",
      status: "WORK" as const,
      cost: 0,
    },
  ];

  const result = calculateMonthlyCost(travelDays);

  expect(result).toEqual({
    totalCost: 0,
    travelDays: 1,
  });
});
});
