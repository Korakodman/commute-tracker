import mongoose from "mongoose";
import { beforeAll, afterAll, describe, expect, test } from "vitest";

import Month from "@/app/Models/Month";
import TravelDay from "@/app/Models/TravelDay";

import {
  GET as getMonth,
  PATCH as updateMonth,
} from "@/app/api/months/[id]/route";
import { POST as generateDays } from "@/app/api/months/[id]/generate-days/route";
const TEST_DB_URL =
  "mongodb://127.0.0.1:27017/commute-tracker-test";

let testMonth: InstanceType<typeof Month>;
let settingsMonth: InstanceType<typeof Month>;

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
  workDays: [1, 2, 3, 4, 5],
  offDates: ["2026-09-14"],
})

settingsMonth = await Month.create({
  year: 2026,
  month: 10,
  defaultDailyCost: 134,
  workDays: [1, 2, 3, 4, 5],
  offDates: [],
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

await TravelDay.deleteMany({
  monthId: settingsMonth._id,
});

await Month.deleteOne({
  _id: settingsMonth._id,
});

  await mongoose.connection.close();
});
describe("Month API Integration", () => {
  test("POST generate-days ควรสร้าง TravelDay ครบทั้งเดือน", async () => {
    const request = new Request(
      `http://localhost/api/months/${testMonth._id}/generate-days`,
      {
        method: "POST",
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

   expect(response.status).toBe(201);
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
  test("PATCH settings แล้ว Generate ต้องใช้ค่าที่บันทึกใน DB", async () => {
  const monthId = settingsMonth._id.toString();
  const url = `http://localhost/api/months/${monthId}`;

  // 1. ทดสอบวันหยุดผิดเดือน
  const invalidRequest = new Request(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      offDates: ["2026-11-02"],
    }),
  });

  const invalidResponse = await updateMonth(invalidRequest, {
    params: Promise.resolve({ id: monthId }),
  });

  expect(invalidResponse.status).toBe(400);

  // ข้อมูลเดิมใน DB ต้องไม่เปลี่ยน
  const monthAfterInvalid = await Month.findById(monthId);

  expect(monthAfterInvalid?.offDates).toEqual([]);

  // 2. PATCH ด้วยการตั้งค่าที่ถูกต้อง
  const validRequest = new Request(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      workDays: [1, 2, 3, 4, 5],
      offDates: ["2026-10-12", "2026-10-23"],
    }),
  });

  const validResponse = await updateMonth(validRequest, {
    params: Promise.resolve({ id: monthId }),
  });

  expect(validResponse.status).toBe(200);

  // ตรวจว่าค่าถูกบันทึกลง MongoDB จริง
  const updatedMonth = await Month.findById(monthId);

  expect(updatedMonth?.workDays).toEqual([1, 2, 3, 4, 5]);

  expect(updatedMonth?.offDates).toEqual([
    "2026-10-12",
    "2026-10-23",
  ]);

  // 3. Generate โดยไม่ส่ง Body
  const generateRequest = new Request(
    `http://localhost/api/months/${monthId}/generate-days`,
    {
      method: "POST",
    }
  );

  const generateResponse = await generateDays(generateRequest, {
    params: Promise.resolve({ id: monthId }),
  });

  const generatedBody = await generateResponse.json();

  expect(generateResponse.status).toBe(201);

  expect(generatedBody).toMatchObject({
    totalDays: 31,
    workDays: 20,
    offDays: 11,
    totalCost: 2680,
  });

  // 4. ตรวจข้อมูลที่ถูกบันทึกจริง
  const savedDays = await TravelDay.find({
    monthId: settingsMonth._id,
  }).sort({ date: 1 });

  expect(savedDays).toHaveLength(31);

  const offDate1 = savedDays.find(
    (day) => day.date === "2026-10-12"
  );

  const offDate2 = savedDays.find(
    (day) => day.date === "2026-10-23"
  );

  expect(offDate1).toMatchObject({
    status: "OFF",
    cost: 0,
  });

  expect(offDate2).toMatchObject({
    status: "OFF",
    cost: 0,
  });

  // 5. ตรวจว่า GET คืน Summary ตรงกับข้อมูลจริง
  const getRequest = new Request(url);

  const getResponse = await getMonth(getRequest, {
    params: Promise.resolve({ id: monthId }),
  });

  const getBody = await getResponse.json();

  expect(getResponse.status).toBe(200);

  expect(getBody.summary).toEqual({
    totalDays: 31,
    workDays: 20,
    offDays: 11,
    totalCost: 2680,
  });
});
}

);