import mongoose from "mongoose";
import { beforeAll, afterAll, describe, expect, test, vi } from "vitest";

import Month from "@/app/Models/Month";
import TravelDay from "@/app/Models/TravelDay";
import TravelRoute from "@/app/Models/TravelRoute";

import {
  GET as getMonth,
  PATCH as updateMonth,
} from "@/app/api/months/[id]/route";
import { POST as generateDays } from "@/app/api/months/[id]/generate-days/route";
import { POST as regenerateDays } from "@/app/api/months/[id]/regenerate-days/route";
import { GET as getHistory } from "@/app/api/months/history/route";
import { POST as createMonth } from "@/app/api/months/route";
import { POST as createTravelDay } from "@/app/api/travel-days/route";
import { PATCH as updateTravelDay } from "@/app/api/travel-days/[id]/route";
import {
  GET as getRoutes,
  POST as createRoute,
} from "@/app/api/routes/route";
import {
  DELETE as deleteRoute,
  PATCH as updateRoute,
} from "@/app/api/routes/[id]/route";
const TEST_DB_URL =
  "mongodb://127.0.0.1:27017/commute-tracker-test?replicaSet=rs0";

let testMonth: InstanceType<typeof Month>;
let settingsMonth: InstanceType<typeof Month>;
let regenerateMonth: InstanceType<typeof Month>;
let historyWithCalendarMonth: InstanceType<typeof Month>;
let historyEmptyMonth: InstanceType<typeof Month>;
let historyOtherMonth: InstanceType<typeof Month>;
let integrityMonth: InstanceType<typeof Month>;

beforeAll(async () => {
  // ให้ integration test ใช้ DB แยกจาก DB ที่เราใช้พัฒนา
  process.env.MONGODB_URL = TEST_DB_URL;

  await mongoose.connect(TEST_DB_URL);

  // เคลียร์ข้อมูลเก่าจาก test DB
  await TravelDay.deleteMany({});
  await Month.deleteMany({});
  await TravelRoute.deleteMany({});

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

regenerateMonth = await Month.create({
  year: 2026,
  month: 11,
  defaultDailyCost: 100,
  workDays: [1, 2, 3, 4, 5],
  offDates: [],
});

historyWithCalendarMonth = await Month.create({
  year: 2027,
  month: 1,
  defaultDailyCost: 100,
  workDays: [1, 2, 3, 4, 5],
  offDates: [],
});

historyEmptyMonth = await Month.create({
  year: 2026,
  month: 12,
  defaultDailyCost: 200,
  workDays: [1, 2, 3, 4, 5],
  offDates: [],
});

historyOtherMonth = await Month.create({
  year: 2025,
  month: 12,
  defaultDailyCost: 300,
  workDays: [1, 2, 3, 4, 5],
  offDates: [],
});

integrityMonth = await Month.create({
  year: 2036,
  month: 1,
  defaultDailyCost: 100,
  workDays: [1, 2, 3, 4, 5],
  offDates: [],
});

await TravelDay.create([
  {
    monthId: historyWithCalendarMonth._id,
    date: "2027-01-04",
    status: "WORK",
    cost: 999,
  },
  {
    monthId: historyWithCalendarMonth._id,
    date: "2027-01-03",
    status: "OFF",
    cost: 0,
  },
  {
    monthId: historyOtherMonth._id,
    date: "2025-12-01",
    status: "WORK",
    cost: 50,
  },
]);
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

await TravelDay.deleteMany({
  monthId: regenerateMonth._id,
});

await Month.deleteOne({
  _id: regenerateMonth._id,
});

await TravelDay.deleteMany({
  monthId: {
    $in: [
      historyWithCalendarMonth._id,
      historyEmptyMonth._id,
      historyOtherMonth._id,
    ],
  },
});

await Month.deleteMany({
  _id: {
    $in: [
      historyWithCalendarMonth._id,
      historyEmptyMonth._id,
      historyOtherMonth._id,
    ],
  },
});

await TravelDay.deleteMany({ monthId: integrityMonth._id });
await Month.deleteOne({ _id: integrityMonth._id });

  await TravelRoute.deleteMany({ name: /^integration-route-/ });
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

describe("Regenerate Month API Integration", () => {
  test("ควร regenerate ตาม settings ใหม่ แทนที่วันเดิม และคำนวณ totalCost ใหม่", async () => {
    await TravelDay.create([
      {
        monthId: regenerateMonth._id,
        date: "legacy-1",
        status: "WORK",
        cost: 999,
      },
      {
        monthId: regenerateMonth._id,
        date: "legacy-2",
        status: "OFF",
        cost: 0,
      },
    ]);

    const response = await regenerateDays(
      new Request(
        `http://localhost/api/months/${regenerateMonth._id}/regenerate-days`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            defaultDailyCost: 250,
            workDays: [0],
            offDates: ["2026-11-01"],
          }),
        }
      ),
      {
        params: Promise.resolve({ id: regenerateMonth._id.toString() }),
      }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      message: "สร้างปฏิทินใหม่สำเร็จ",
      totalDays: 30,
      workDays: 4,
      offDays: 26,
      totalCost: 1000,
    });
    expect(body.travelDays).toHaveLength(30);

    const savedDays = await TravelDay.find({
      monthId: regenerateMonth._id,
    }).sort({ date: 1 });

    expect(savedDays).toHaveLength(30);
    expect(savedDays.some((day) => day.date.startsWith("legacy-"))).toBe(false);
    expect(savedDays.filter((day) => day.status === "WORK")).toHaveLength(4);
    expect(savedDays.reduce((total, day) => total + day.cost, 0)).toBe(1000);

    const savedMonth = await Month.findById(regenerateMonth._id);
    expect(savedMonth).toMatchObject({
      defaultDailyCost: 250,
      workDays: [0],
      offDates: ["2026-11-01"],
    });

    const offDate = savedDays.find((day) => day.date === "2026-11-01");
    expect(offDate).toMatchObject({ status: "OFF", cost: 0 });
  });

  test("ถ้า insert TravelDay ล้มเหลว ต้อง rollback และเก็บข้อมูลเดิมไว้", async () => {
    const monthBefore = await Month.findById(regenerateMonth._id).lean();
    const daysBefore = await TravelDay.find({
      monthId: regenerateMonth._id,
    }).sort({ date: 1 });
    const insertManySpy = vi
      .spyOn(TravelDay, "insertMany")
      .mockRejectedValueOnce(new Error("forced insert failure"));

    try {
      const response = await regenerateDays(
        new Request(
          `http://localhost/api/months/${regenerateMonth._id}/regenerate-days`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              defaultDailyCost: 999,
              workDays: [1, 2, 3, 4, 5],
              offDates: [],
            }),
          }
        ),
        {
          params: Promise.resolve({ id: regenerateMonth._id.toString() }),
        }
      );

      expect(response.status).toBe(500);

      const daysAfter = await TravelDay.find({
        monthId: regenerateMonth._id,
      }).sort({ date: 1 });

      expect(daysAfter.map((day) => day.date)).toEqual(
        daysBefore.map((day) => day.date)
      );
      expect(daysAfter.map((day) => day.cost)).toEqual(
        daysBefore.map((day) => day.cost)
      );
      expect(await Month.findById(regenerateMonth._id).lean()).toEqual(monthBefore);
    } finally {
      insertManySpy.mockRestore();
    }
  });
});

describe("TravelDay data integrity integration", () => {
  test("POST OFF ที่มี cost มากกว่า 0 ต้องบันทึก cost เป็น 0", async () => {
    const response = await createTravelDay(
      new Request("http://localhost/api/travel-days", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthId: integrityMonth._id.toString(),
          date: "2036-01-02",
          status: "OFF",
          cost: 999,
          note: "integrity test",
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.travelDay.cost).toBe(0);
  });

  test("PATCH WORK เป็น OFF โดยไม่ส่ง cost ต้อง zero cost", async () => {
    const createResponse = await createTravelDay(
      new Request("http://localhost/api/travel-days", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthId: integrityMonth._id.toString(),
          date: "2036-01-03",
          status: "WORK",
          cost: 321,
          note: "integrity test",
        }),
      })
    );
    const created = await createResponse.json();

    const response = await updateTravelDay(
      new Request("http://localhost/api/travel-days", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "OFF" }),
      }),
      { params: Promise.resolve({ id: created.travelDay._id.toString() }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.travelDay.status).toBe("OFF");
    expect(body.travelDay.cost).toBe(0);
  });

  test("PATCH OFF ที่ส่ง cost มากกว่า 0 ต้องยังบันทึกเป็น 0", async () => {
    const travelDay = await TravelDay.findOne({
      monthId: integrityMonth._id,
      date: "2036-01-02",
    });

    const response = await updateTravelDay(
      new Request("http://localhost/api/travel-days", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "OFF", cost: 500 }),
      }),
      { params: Promise.resolve({ id: travelDay!._id.toString() }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.travelDay.cost).toBe(0);
  });

  test("PATCH WORK พร้อม cost ปกติต้องเก็บค่าใช้จ่ายที่ส่งมา", async () => {
    const travelDay = await TravelDay.findOne({
      monthId: integrityMonth._id,
      date: "2036-01-02",
    });

    const response = await updateTravelDay(
      new Request("http://localhost/api/travel-days", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "WORK", cost: 321 }),
      }),
      { params: Promise.resolve({ id: travelDay!._id.toString() }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.travelDay.status).toBe("WORK");
    expect(body.travelDay.cost).toBe(321);
  });
});

describe("Month offDates validation integration", () => {
  async function postMonth(year: number, month: number, offDates: string[]) {
    return createMonth(
      new Request("http://localhost/api/months", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year,
          month,
          defaultDailyCost: 100,
          workDays: [1, 2, 3, 4, 5],
          offDates,
        }),
      })
    );
  }

  test.each([
    [2037, 1, ["2037-01-01x"]],
    [2038, 2, ["2038-02-30"]],
    [2039, 9, ["2039-10-01"]],
  ])("POST ต้อง reject offDate ที่ไม่ถูกต้อง: %s-%s", async (year, month, offDates) => {
    const response = await postMonth(year, month, offDates);

    expect(response.status).toBe(400);
    expect(await Month.findOne({ year, month })).toBeNull();
  });

  test("POST ต้องยอมรับวัน leap year ที่ถูกต้องและวันปกติในเดือน", async () => {
    const leapResponse = await postMonth(2040, 2, ["2040-02-29"]);
    const validResponse = await postMonth(2041, 9, ["2041-09-15"]);

    expect(leapResponse.status).toBe(201);
    expect(validResponse.status).toBe(201);
    expect((await leapResponse.json()).NewMonth.offDates).toContain("2040-02-29");
    expect((await validResponse.json()).NewMonth.offDates).toContain("2041-09-15");
  });

  test("PATCH ต้อง reject offDate ที่ไม่ถูกต้องและไม่เปลี่ยนข้อมูลเดิม", async () => {
    const month = await Month.create({
      year: 2042,
      month: 9,
      defaultDailyCost: 100,
      workDays: [1, 2, 3, 4, 5],
      offDates: [],
    });

    for (const offDate of ["2042-09-31", "2042-10-01", "2042-09-01x"]) {
      const response = await updateMonth(
        new Request("http://localhost/api/months", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ offDates: [offDate] }),
        }),
        { params: Promise.resolve({ id: month._id.toString() }) }
      );

      expect(response.status).toBe(400);
    }

    const unchanged = await Month.findById(month._id);
    expect(unchanged?.offDates).toEqual([]);

    const validResponse = await updateMonth(
      new Request("http://localhost/api/months", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offDates: ["2042-09-29"] }),
      }),
      { params: Promise.resolve({ id: month._id.toString() }) }
    );

    expect(validResponse.status).toBe(200);
    expect((await Month.findById(month._id))?.offDates).toEqual(["2042-09-29"]);
    await Month.deleteOne({ _id: month._id });
  });
});

describe("Monthly History API Integration", () => {
  test("ควรคืนข้อมูลหลายเดือนเรียงจากใหม่ไปเก่า พร้อม summary ที่แยกตามเดือน", async () => {
    const response = await getHistory();
    const body = await response.json();

    expect(response.status).toBe(200);

    const history = body.history as Array<{
      year: number;
      month: number;
      totalDays: number;
      workDays: number;
      offDays: number;
      totalCost: number;
      hasCalendar: boolean;
    }>;

    const historyOrder = history.map((item) => [item.year, item.month]);
    const sortedOrder = [...historyOrder].sort(
      ([yearA, monthA], [yearB, monthB]) =>
        yearB - yearA || monthB - monthA
    );

    expect(historyOrder).toEqual(sortedOrder);

    expect(history).toContainEqual({
      year: 2027,
      month: 1,
      totalDays: 2,
      workDays: 1,
      offDays: 1,
      totalCost: 999,
      hasCalendar: true,
    });

    expect(history).toContainEqual({
      year: 2026,
      month: 12,
      totalDays: 0,
      workDays: 0,
      offDays: 0,
      totalCost: 0,
      hasCalendar: false,
    });

    expect(history).toContainEqual({
      year: 2025,
      month: 12,
      totalDays: 1,
      workDays: 1,
      offDays: 0,
      totalCost: 50,
      hasCalendar: true,
    });

    const currentMonth = history.find(
      (item) => item.year === 2027 && item.month === 1
    );
    const otherMonth = history.find(
      (item) => item.year === 2025 && item.month === 12
    );

    expect(currentMonth?.totalCost).toBe(999);
    expect(otherMonth?.totalCost).toBe(50);
  });

  test("ไม่ควรแก้ไขข้อมูล Month หรือ TravelDay จากการเรียก History API", async () => {
    const monthBefore = await Month.findById(historyWithCalendarMonth._id).lean();
    const daysBefore = await TravelDay.find({
      monthId: historyWithCalendarMonth._id,
    })
      .sort({ date: 1 })
      .lean();

    const response = await getHistory();

    expect(response.status).toBe(200);

    const monthAfter = await Month.findById(historyWithCalendarMonth._id).lean();
    const daysAfter = await TravelDay.find({
      monthId: historyWithCalendarMonth._id,
    })
      .sort({ date: 1 })
      .lean();

    expect(monthAfter).toEqual(monthBefore);
    expect(daysAfter).toEqual(daysBefore);
  });
});

describe("TravelRoute CRUD API Integration", () => {
  let routeId = "";

  const routePayload = {
    name: "integration-route-main",
    type: "OUTBOUND" as const,
    segments: [
      { name: "บ้าน → BTS", cost: 15 },
      { name: "BTS → ที่ทำงาน", cost: 35 },
    ],
  };

  test("GET เมื่อไม่มี Route ต้องคืน empty collection", async () => {
    const response = await getRoutes();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.Routes).toEqual([]);
  });

  test("POST Route ที่ถูกต้องสำเร็จและบันทึกข้อมูลจริง", async () => {
    const response = await createRoute(
      new Request("http://localhost/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(routePayload),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    routeId = body.newTravelRoute._id;
    expect(body.newTravelRoute).toMatchObject(routePayload);
    expect(await TravelRoute.findById(routeId)).not.toBeNull();
  });

  test.each([
    { type: "INVALID", segments: routePayload.segments },
    { type: "OUTBOUND", segments: [{ name: "", cost: 10 }] },
    { type: "OUTBOUND", segments: [{ name: "bus", cost: -1 }] },
    { type: "OUTBOUND", segments: [{ name: "bus", cost: "10" }] },
    { type: "OUTBOUND", segments: [{ name: "bus", cost: Number.NaN }] },
  ])("POST ข้อมูลไม่ผ่าน validation ต้องคืน 400 และไม่สร้างข้อมูล", async (invalidData) => {
    const before = await TravelRoute.countDocuments({
      name: "integration-route-invalid",
    });
    const response = await createRoute(
      new Request("http://localhost/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "integration-route-invalid",
          ...invalidData,
        }),
      })
    );

    expect(response.status).toBe(400);
    expect(
      await TravelRoute.countDocuments({ name: "integration-route-invalid" })
    ).toBe(before);
  });

  test("POST malformed JSON ต้องคืน 400", async () => {
    const response = await createRoute(
      new Request("http://localhost/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{invalid",
      })
    );

    expect(response.status).toBe(400);
  });

  test("GET ต้องคืน Route ที่บันทึกอยู่จริง", async () => {
    const response = await getRoutes();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.Routes).toHaveLength(1);
    expect(body.Routes[0]._id).toBe(routeId);
  });

  test("PATCH partial update ต้องรักษา field ที่ไม่ได้ส่งมา", async () => {
    const response = await updateRoute(
      new Request("http://localhost/api/routes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "integration-route-renamed" }),
      }),
      { params: Promise.resolve({ id: routeId }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.updateRoute).toMatchObject({
      name: "integration-route-renamed",
      type: routePayload.type,
      segments: routePayload.segments,
    });
  });

  test("PATCH malformed JSON, invalid ID และไม่พบข้อมูลต้องคืน error ที่ถูกต้อง", async () => {
    const malformed = await updateRoute(
      new Request("http://localhost/api/routes", {
        method: "PATCH",
        body: "{invalid",
      }),
      { params: Promise.resolve({ id: routeId }) }
    );
    const invalidId = await updateRoute(
      new Request("http://localhost/api/routes", {
        method: "PATCH",
        body: JSON.stringify({ name: "changed" }),
      }),
      { params: Promise.resolve({ id: "not-an-object-id" }) }
    );
    const missing = await updateRoute(
      new Request("http://localhost/api/routes", {
        method: "PATCH",
        body: JSON.stringify({ name: "changed" }),
      }),
      { params: Promise.resolve({ id: new mongoose.Types.ObjectId().toString() }) }
    );

    expect(malformed.status).toBe(400);
    expect(invalidId.status).toBe(400);
    expect(missing.status).toBe(404);
    expect((await TravelRoute.findById(routeId))?.name).toBe(
      "integration-route-renamed"
    );
  });

  test("PATCH validation error ต้องไม่เปลี่ยนข้อมูลเดิม", async () => {
    const before = await TravelRoute.findById(routeId).lean();
    const response = await updateRoute(
      new Request("http://localhost/api/routes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segments: [{ name: "bad", cost: -5 }] }),
      }),
      { params: Promise.resolve({ id: routeId }) }
    );

    expect(response.status).toBe(400);
    expect(await TravelRoute.findById(routeId).lean()).toEqual(before);
  });

  test("DELETE ต้องตรวจ ID, not found และลบข้อมูลจริง", async () => {
    const invalid = await deleteRoute(new Request("http://localhost/api/routes"), {
      params: Promise.resolve({ id: "invalid-id" }),
    });
    const missing = await deleteRoute(new Request("http://localhost/api/routes"), {
      params: Promise.resolve({ id: new mongoose.Types.ObjectId().toString() }),
    });
    const deleted = await deleteRoute(new Request("http://localhost/api/routes"), {
      params: Promise.resolve({ id: routeId }),
    });

    expect(invalid.status).toBe(400);
    expect(missing.status).toBe(404);
    expect(deleted.status).toBe(200);
    expect(await TravelRoute.findById(routeId)).toBeNull();

    const deletedAgain = await deleteRoute(
      new Request("http://localhost/api/routes"),
      { params: Promise.resolve({ id: routeId }) }
    );
    expect(deletedAgain.status).toBe(404);
  });
});
