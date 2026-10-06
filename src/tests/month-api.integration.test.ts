import mongoose from "mongoose";
import { beforeAll, afterAll, describe, expect, test } from "vitest";

import Month from "@/app/Models/Month";
import TravelDay from "@/app/Models/TravelDay";

import { POST as generateDays } from "@/app/api/months/[id]/generate-days/route";
import { GET as getMonth } from "@/app/api/months/[id]/route";

const TEST_DB_URL =
  "mongodb://127.0.0.1:27017/commute-tracker-test";

let testMonth: InstanceType<typeof Month>;

beforeAll(async () => {
  // ให้ integration test ใช้ DB แยกจาก DB ที่เราใช้พัฒนา
  process.env.MONGODB_URL = TEST_DB_URL;

  await mongoose.connect(TEST_DB_URL);

  // เคลียร์ข้อมูลเก่าจาก test DB
  await TravelDay.deleteMany({});
  await Month.deleteMany({});

  // สร้าง Month สำหรับทดสอบ
  testMonth = await Month.create({
    year: 2026,
    month: 9,
    defaultDailyCost: 134,
  });
});

afterAll(async () => {
  // ล้าง test data
  await TravelDay.deleteMany({
    monthId: testMonth._id,
  });

  await Month.deleteMany({
    _id: testMonth._id,
  });

  await mongoose.connection.close();
});

describe("Month API Integration", () => {
  test("POST generate-days ควรสร้าง TravelDay ครบทั้งเดือน", async () => {
    const request = new Request(
      `http://localhost/api/months/${testMonth._id}/generate-days`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workDays: [1, 2, 3, 4, 5],
          offDates: ["2026-09-14"],
        }),
      }
    );

    const response = await generateDays(request, {
      params: Promise.resolve({
        id: testMonth._id.toString(),
      }),
    });

    const body = await response.json();

    expect(response.status).toBe(201);

    expect(body.message).toBe("สร้างปฏิทินสำเร็จ");

    expect(body.totalDays).toBe(30);
    expect(body.workDays).toBe(21);
    expect(body.offDays).toBe(9);
    expect(body.totalCost).toBe(2814);

    // ตรวจ MongoDB จริง
    const savedDays = await TravelDay.find({
      monthId: testMonth._id,
    });

    expect(savedDays).toHaveLength(30);
  });

  test("GET month ควรคืน Month + TravelDay + Summary", async () => {
    const request = new Request(
      `http://localhost/api/months/${testMonth._id}`
    );

    const response = await getMonth(request, {
      params: Promise.resolve({
        id: testMonth._id.toString(),
      }),
    });

    const body = await response.json();

    expect(response.status).toBe(200);

    expect(body.month.year).toBe(2026);
    expect(body.month.month).toBe(9);

    expect(body.travelDays).toHaveLength(30);

    expect(body.summary).toEqual({
      totalDays: 30,
      workDays: 21,
      offDays: 9,
      totalCost: 2814,
    });

    // ตรวจ business rule เพิ่ม
    const offDay = body.travelDays.find(
      (day: { date: string }) =>
        day.date === "2026-09-14"
    );

    expect(offDay).toMatchObject({
      date: "2026-09-14",
      status: "OFF",
      cost: 0,
    });
  });
});