export type NumericInput = number | "";
export type TravelDayStatus = "WORK" | "OFF";

export interface CreateMonthFormValues {
  year: NumericInput;
  month: number;
  defaultDailyCost: NumericInput;
  workDays: number[];
  offDates: string[];
}

export interface MonthSettingsFormValues {
  defaultDailyCost: NumericInput;
  workDays: number[];
  offDates: string[];
  selectedOutboundRouteId: string | null;
  selectedReturnRouteId: string | null;
}

export interface MonthDateContext {
  year: number;
  month: number;
}

export interface CreateMonthPayload {
  year: number;
  month: number;
  defaultDailyCost: number;
  workDays: number[];
  offDates: string[];
}

export interface MonthSettingsPayload {
  defaultDailyCost: number;
  workDays: number[];
  offDates: string[];
  selectedOutboundRouteId: string | null;
  selectedReturnRouteId: string | null;
}

export function isValidDateString(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function getMonthDatePrefix({ year, month }: MonthDateContext) {
  return `${year}-${String(month).padStart(2, "0")}-`;
}

export function validateCreateMonthInput(
  values: CreateMonthFormValues
): string | null {
  const year = Number(values.year);
  const dailyCost = Number(values.defaultDailyCost);

  if (
    values.year === "" ||
    !Number.isInteger(year) ||
    year < 2000
  ) {
    return "กรุณาระบุปีเป็นจำนวนเต็มตั้งแต่ 2000 ขึ้นไป";
  }

  if (
    values.defaultDailyCost === "" ||
    !Number.isFinite(dailyCost) ||
    dailyCost < 0
  ) {
    return "กรุณาระบุค่าเดินทางเป็นตัวเลขตั้งแต่ 0 ขึ้นไป";
  }

  const monthPrefix = getMonthDatePrefix({ year, month: values.month });

  if (values.offDates.some((date) => !date.startsWith(monthPrefix))) {
    return "มีวันหยุดจากเดือนอื่น กรุณาลบออกก่อนสร้างเดือน";
  }

  return null;
}

export function prepareCreateMonthPayload(
  values: CreateMonthFormValues
): CreateMonthPayload {
  return {
    year: Number(values.year),
    month: Number(values.month),
    defaultDailyCost: Number(values.defaultDailyCost),
    workDays: [...values.workDays],
    offDates: [...values.offDates],
  };
}

export function validateMonthSettingsInput(
  values: MonthSettingsFormValues,
  month: MonthDateContext
): string | null {
  const dailyCost = Number(values.defaultDailyCost);

  if (!Number.isFinite(dailyCost) || dailyCost < 0) {
    return "ค่าเดินทางต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป";
  }

  if (values.workDays.length === 0) {
    return "ต้องเลือกวันทำงานอย่างน้อย 1 วัน";
  }

  const monthPrefix = getMonthDatePrefix(month);
  const hasInvalidDate = values.offDates.some(
    (date) => !isValidDateString(date) || !date.startsWith(monthPrefix)
  );

  if (hasInvalidDate) {
    return "วันหยุดต้องเป็นวันที่จริงและอยู่ในเดือนที่เลือก";
  }

  const hasDuplicateDate =
    new Set(values.offDates).size !== values.offDates.length;

  if (hasDuplicateDate) {
    return "วันหยุดห้ามซ้ำกัน";
  }

  return null;
}

export function prepareMonthSettingsPayload(
  values: MonthSettingsFormValues
): MonthSettingsPayload {
  return {
    defaultDailyCost: Number(values.defaultDailyCost),
    workDays: [...values.workDays].sort((a, b) => a - b),
    offDates: [...values.offDates].sort(),
    selectedOutboundRouteId: values.selectedOutboundRouteId,
    selectedReturnRouteId: values.selectedReturnRouteId,
  };
}

export function getTravelDayCost(
  status: TravelDayStatus,
  cost: NumericInput
) {
  return status === "OFF" ? 0 : Number(cost);
}

export function validateTravelDayCost(
  status: TravelDayStatus,
  cost: NumericInput
): string | null {
  const nextCost = getTravelDayCost(status, cost);

  if (!Number.isFinite(nextCost) || nextCost < 0) {
    return "กรุณาระบุค่าเดินทางเป็นตัวเลขตั้งแต่ 0 ขึ้นไป";
  }

  return null;
}
