import { describe, expect, test } from "vitest";
import {
  getTravelDayCost,
  isValidDateString,
  prepareCreateMonthPayload,
  prepareMonthSettingsPayload,
  validateCreateMonthInput,
  validateMonthSettingsInput,
  validateTravelDayCost,
} from "./form-validation";

describe("isValidDateString", () => {
  test("ยอมรับวันที่จริงรูปแบบ YYYY-MM-DD", () => {
    expect(isValidDateString("2026-02-28")).toBe(true);
  });

  test("ปฏิเสธวันที่ไม่มีอยู่จริง", () => {
    expect(isValidDateString("2026-02-29")).toBe(false);
  });

  test("ปฏิเสธรูปแบบวันที่ที่ไม่ถูกต้อง", () => {
    expect(isValidDateString("2026/02/28")).toBe(false);
  });
});

describe("validateCreateMonthInput", () => {
  const validInput = {
    year: 2026,
    month: 9,
    defaultDailyCost: 134,
    workDays: [1, 2, 3, 4, 5],
    offDates: ["2026-09-14"],
  };

  test("ยอมรับข้อมูลสร้างเดือนที่ถูกต้อง", () => {
    expect(validateCreateMonthInput(validInput)).toBeNull();
  });

  test("ยอมรับค่าใช้จ่ายเป็น 0", () => {
    expect(
      validateCreateMonthInput({ ...validInput, defaultDailyCost: 0 })
    ).toBeNull();
  });

  test("ปฏิเสธปีที่ต่ำกว่า 2000", () => {
    expect(
      validateCreateMonthInput({ ...validInput, year: 1999 })
    ).toBe("กรุณาระบุปีเป็นจำนวนเต็มตั้งแต่ 2000 ขึ้นไป");
  });

  test("ปฏิเสธค่าใช้จ่ายติดลบหรือไม่ใช่ตัวเลข", () => {
    expect(
      validateCreateMonthInput({ ...validInput, defaultDailyCost: -1 })
    ).toBe("กรุณาระบุค่าเดินทางเป็นตัวเลขตั้งแต่ 0 ขึ้นไป");
    expect(
      validateCreateMonthInput({ ...validInput, defaultDailyCost: Number.NaN })
    ).toBe("กรุณาระบุค่าเดินทางเป็นตัวเลขตั้งแต่ 0 ขึ้นไป");
  });

  test("ปฏิเสธค่าใช้จ่ายว่างตามพฤติกรรม Create Month เดิม", () => {
    expect(
      validateCreateMonthInput({ ...validInput, defaultDailyCost: "" })
    ).toBe("กรุณาระบุค่าเดินทางเป็นตัวเลขตั้งแต่ 0 ขึ้นไป");
  });

  test("ปฏิเสธ offDate ที่อยู่นอกเดือน", () => {
    expect(
      validateCreateMonthInput({
        ...validInput,
        offDates: ["2026-10-01"],
      })
    ).toBe("มีวันหยุดจากเดือนอื่น กรุณาลบออกก่อนสร้างเดือน");
  });
});

describe("prepareCreateMonthPayload", () => {
  test("แปลงค่า Input เป็น Payload โดยรักษา Settings เดิม", () => {
    expect(
      prepareCreateMonthPayload({
        year: 2026,
        month: 9,
        defaultDailyCost: 134,
        workDays: [5, 1],
        offDates: ["2026-09-14"],
      })
    ).toEqual({
      year: 2026,
      month: 9,
      defaultDailyCost: 134,
      workDays: [5, 1],
      offDates: ["2026-09-14"],
    });
  });
});

describe("validateMonthSettingsInput", () => {
  const month = { year: 2026, month: 9 };
  const validInput = {
    defaultDailyCost: 134,
    workDays: [1, 2, 3, 4, 5],
    offDates: ["2026-09-14"],
    selectedOutboundRouteId: "outbound-id",
    selectedReturnRouteId: "return-id",
  };

  test("ยอมรับ Settings ที่ถูกต้อง", () => {
    expect(validateMonthSettingsInput(validInput, month)).toBeNull();
  });

  test("ต้องมี workDays อย่างน้อยหนึ่งวัน", () => {
    expect(
      validateMonthSettingsInput({ ...validInput, workDays: [] }, month)
    ).toBe("ต้องเลือกวันทำงานอย่างน้อย 1 วัน");
  });

  test("ตรวจวันที่จริงและเดือนเดียวกัน", () => {
    expect(
      validateMonthSettingsInput(
        { ...validInput, offDates: ["2026-02-30"] },
        month
      )
    ).toBe("วันหยุดต้องเป็นวันที่จริงและอยู่ในเดือนที่เลือก");
    expect(
      validateMonthSettingsInput(
        { ...validInput, offDates: ["2026-10-01"] },
        month
      )
    ).toBe("วันหยุดต้องเป็นวันที่จริงและอยู่ในเดือนที่เลือก");
  });

  test("ปฏิเสธ offDate ซ้ำ", () => {
    expect(
      validateMonthSettingsInput(
        { ...validInput, offDates: ["2026-09-14", "2026-09-14"] },
        month
      )
    ).toBe("วันหยุดห้ามซ้ำกัน");
  });
});

describe("prepareMonthSettingsPayload", () => {
  test("เรียงวันและวันที่ พร้อมรักษา Route IDs", () => {
    expect(
      prepareMonthSettingsPayload({
        defaultDailyCost: "",
        workDays: [5, 1, 3],
        offDates: ["2026-09-20", "2026-09-02"],
        selectedOutboundRouteId: "outbound-id",
        selectedReturnRouteId: null,
      })
    ).toEqual({
      defaultDailyCost: 0,
      workDays: [1, 3, 5],
      offDates: ["2026-09-02", "2026-09-20"],
      selectedOutboundRouteId: "outbound-id",
      selectedReturnRouteId: null,
    });
  });
});

describe("TravelDay cost validation", () => {
  test("OFF ต้องได้ cost เป็น 0 เสมอ", () => {
    expect(getTravelDayCost("OFF", 250)).toBe(0);
    expect(validateTravelDayCost("OFF", 250)).toBeNull();
  });

  test("WORK รองรับค่า 0 และช่องว่างตามพฤติกรรมเดิม", () => {
    expect(getTravelDayCost("WORK", 0)).toBe(0);
    expect(getTravelDayCost("WORK", "")).toBe(0);
    expect(validateTravelDayCost("WORK", "")).toBeNull();
  });

  test("ปฏิเสธค่า WORK ที่ติดลบ, NaN หรือ Infinity", () => {
    expect(validateTravelDayCost("WORK", -1)).toBe(
      "กรุณาระบุค่าเดินทางเป็นตัวเลขตั้งแต่ 0 ขึ้นไป"
    );
    expect(validateTravelDayCost("WORK", Number.NaN)).toBe(
      "กรุณาระบุค่าเดินทางเป็นตัวเลขตั้งแต่ 0 ขึ้นไป"
    );
    expect(validateTravelDayCost("WORK", Number.POSITIVE_INFINITY)).toBe(
      "กรุณาระบุค่าเดินทางเป็นตัวเลขตั้งแต่ 0 ขึ้นไป"
    );
  });
});
