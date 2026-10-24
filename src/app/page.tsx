"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {
  CalendarDays,
  RefreshCw,
  Wallet,
  BriefcaseBusiness,
  Coffee,
  Plus,
  X,
  History,
  LayoutDashboard,
  Eye,
} from "lucide-react";
import { calculateRouteCost } from "@/lib/calculations";
interface MonthItem {
  _id: string;
  year: number;
  month: number;
  defaultDailyCost: number;
  workDays?: number[];
  offDates?: string[];
}

interface TravelDay {
  _id: string;
  monthId: string;
  date: string;
  status: "WORK" | "OFF";
  cost: number;
  note?: string;
}

interface MonthDetail {
  month: MonthItem;
  travelDays: TravelDay[];
  summary: {
    totalDays: number;
    workDays: number;
    offDays: number;
    totalCost: number;
  };
}

interface MonthlyHistoryItem {
  year: number;
  month: number;
  totalDays: number;
  workDays: number;
  offDays: number;
  totalCost: number;
  hasCalendar: boolean;
}

interface MonthSettingsPayload {
  defaultDailyCost: number;
  workDays: number[];
  offDates: string[];
}

interface TravelRouteSegment {
  _id?: string;
  name: string;
  cost: number;
}

interface TravelRoute {
  _id: string;
  name: string;
  type: "OUTBOUND" | "RETURN";
  segments: TravelRouteSegment[];
}

interface TravelRouteForm {
  name: string;
  type: TravelRoute["type"];
  segments: Array<Pick<TravelRouteSegment, "name"> & { cost: number | "" }>;
}

const weekdayLabels = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];

function formatMoney(value: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatMonth(year: number, month: number) {
  return new Intl.DateTimeFormat("th-TH", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function isValidDateString(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

async function readJson<T>(response: Response): Promise<T | null> {
  const text = await response.text();

  if (!text.trim()) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

async function fetchMonthDetail(monthId: string): Promise<MonthDetail> {
  const response = await fetch(`/api/months/${monthId}`);
  const payload = await readJson<MonthDetail & { message?: string }>(
    response
  );

  if (!response.ok || !payload?.month) {
    throw new Error(
      payload?.message ?? "โหลดข้อมูลปฏิทินไม่สำเร็จ"
    );
  }

  return payload;
}

const workDayOptions = [
  { value: 0, label: "อาทิตย์" },
  { value: 1, label: "จันทร์" },
  { value: 2, label: "อังคาร" },
  { value: 3, label: "พุธ" },
  { value: 4, label: "พฤหัสบดี" },
  { value: 5, label: "ศุกร์" },
  { value: 6, label: "เสาร์" },
];

const settingsWorkDayOptions = [
  ...workDayOptions.slice(1),
  workDayOptions[0],
];

const numberInputClass =
  "w-full rounded-xl border border-white/10 bg-[#0C0C12] px-3 py-3 text-white outline-none focus:border-pink-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

export default function Home() {
  const [months, setMonths] = useState<MonthItem[]>([]);
  const [selectedMonthId, setSelectedMonthId] = useState("");
  const [selectedDay, setSelectedDay] = useState<TravelDay | null>(null);
  const [isEditingDay, setIsEditingDay] = useState(false);
  const [editStatus, setEditStatus] = useState<TravelDay["status"]>(
    "WORK"
  );
  const [editCost, setEditCost] = useState<number | "">(0);
  const [isSavingDay, setIsSavingDay] = useState(false);
  const [editDayError, setEditDayError] = useState("");
  const [editDaySuccess, setEditDaySuccess] = useState("");
  const [data, setData] = useState<MonthDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [viewMode, setViewMode] = useState<"dashboard" | "history">(
    "dashboard"
  );
  const [history, setHistory] = useState<MonthlyHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyYear, setHistoryYear] = useState("all");

  const [monthsReloadKey, setMonthsReloadKey] = useState(0);

const [showSettings, setShowSettings] = useState(false);
const [settingsDailyCost, setSettingsDailyCost] = useState<number | "">(0);
const [settingsWorkDays, setSettingsWorkDays] = useState<number[]>([]);
const [settingsOffDates, setSettingsOffDates] = useState<string[]>([]);
const [settingsOffDateInput, setSettingsOffDateInput] = useState("");
const [settingsError, setSettingsError] = useState("");
const [settingsSuccess, setSettingsSuccess] = useState("");
const [isSavingSettings, setIsSavingSettings] = useState(false);
const [showRegenerateConfirmation, setShowRegenerateConfirmation] = useState(false);
const [pendingSettingsPayload, setPendingSettingsPayload] =
  useState<MonthSettingsPayload | null>(null);

const [showCreateForm, setShowCreateForm] = useState(false);
const [isCreatingMonth, setIsCreatingMonth] = useState(false);

const [createError, setCreateError] = useState("");
const [createSuccess, setCreateSuccess] = useState("");

const [createYear, setCreateYear] = useState<number | "">(
  new Date().getFullYear()
);
const [createMonth, setCreateMonth] = useState(
  new Date().getMonth() + 1
);
const [createDailyCost, setCreateDailyCost] = useState<number | "">(134);

const [createWorkDays, setCreateWorkDays] = useState<number[]>([
  1, 2, 3, 4, 5,
]);

const [createOffDates, setCreateOffDates] = useState<string[]>([]);
const [offDateInput, setOffDateInput] = useState("");

const [routes, setRoutes] = useState<TravelRoute[]>([]);
const [routesLoading, setRoutesLoading] = useState(true);
const [routesError, setRoutesError] = useState("");
const [showRouteForm, setShowRouteForm] = useState(false);
const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
const [routeForm, setRouteForm] = useState<TravelRouteForm>({
  name: "",
  type: "OUTBOUND",
  segments: [{ name: "", cost: "" }],
});
const [routeFormError, setRouteFormError] = useState("");
const [routeFormSuccess, setRouteFormSuccess] = useState("");
const [isSavingRoute, setIsSavingRoute] = useState(false);
const [routeToDelete, setRouteToDelete] = useState<TravelRoute | null>(null);
const [isDeletingRoute, setIsDeletingRoute] = useState(false);
const [routeDeleteError, setRouteDeleteError] = useState("");

const routesByType = useMemo(
  () => ({
    OUTBOUND: routes.filter((route) => route.type === "OUTBOUND"),
    RETURN: routes.filter((route) => route.type === "RETURN"),
  }),
  [routes]
);

  const loadRoutes = useCallback(async function loadRoutes(): Promise<boolean> {
    setRoutesLoading(true);
    setRoutesError("");

    try {
      const response = await fetch("/api/routes");
      const payload = await readJson<{ Routes?: TravelRoute[]; message?: string }>(
        response
      );

      if (!response.ok || !payload?.Routes) {
        throw new Error(payload?.message ?? "โหลดรายการ Route ไม่สำเร็จ");
      }

      setRoutes(payload.Routes);
      return true;
    } catch (routeError) {
      setRoutesError(
        routeError instanceof Error
          ? routeError.message
          : "เกิดข้อผิดพลาดในการโหลด Route"
      );
      return false;
    } finally {
      setRoutesLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadRoutes();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadRoutes]);



  // โหลดรายการเดือน
  useEffect(() => {
    let active = true;

    async function loadMonths() {
      try {
        const response = await fetch("/api/months");

        if (!response.ok) {
          throw new Error("โหลดรายการเดือนไม่สำเร็จ");
        }

        const body: { MonthAll: MonthItem[] } =
          await response.json();

        const sortedMonths = [...body.MonthAll].sort(
          (a, b) =>
            b.year - a.year || b.month - a.month
        );

        if (!active) return;

        setMonths(sortedMonths);

        if (sortedMonths.length > 0) {
          setSelectedMonthId((currentId) => {
            if (
              currentId &&
              sortedMonths.some((item) => item._id === currentId)
            ) {
              return currentId;
            }

            return sortedMonths[0]._id;
          });
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "เกิดข้อผิดพลาด"
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadMonths();

    return () => {
      active = false;
    };
  }, [monthsReloadKey]);

  // โหลดรายละเอียดเดือนที่เลือก
  useEffect(() => {
    if (!selectedMonthId) return;

    let active = true;

    async function loadMonth() {
      setLoading(true);
      setError("");
      setData(null);

      try {
        const result = await fetchMonthDetail(selectedMonthId);

        if (active) setData(result);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "เกิดข้อผิดพลาด"
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadMonth();

    return () => {
      active = false;
    };
  }, [selectedMonthId, reloadKey]);

  useEffect(() => {
    if (viewMode !== "history") return;

    let active = true;

    async function loadHistory() {
      setHistoryLoading(true);
      setHistoryError("");

      try {
        const response = await fetch("/api/months/history");
        const payload = await readJson<{
          history?: MonthlyHistoryItem[];
          message?: string;
        }>(response);

        if (!response.ok || !payload?.history) {
          throw new Error(
            payload?.message ?? "โหลดประวัติรายเดือนไม่สำเร็จ"
          );
        }

        if (active) setHistory(payload.history);
      } catch (err) {
        if (active) {
          setHistory([]);
          setHistoryError(
            err instanceof Error
              ? err.message
              : "เกิดข้อผิดพลาดในการโหลดประวัติรายเดือน"
          );
        }
      } finally {
        if (active) setHistoryLoading(false);
      }
    }

    loadHistory();

    return () => {
      active = false;
    };
  }, [viewMode]);

  // แปลงข้อมูล TravelDay เป็นช่องปฏิทิน
  const calendarCells = useMemo(() => {
    if (!data) return [];

    const { year, month } = data.month;

    // จัดปฏิทินให้เริ่มต้นวันจันทร์
    const firstWeekday = new Date(
      Date.UTC(year, month - 1, 1)
    ).getUTCDay();

    const leadingBlanks = (firstWeekday + 6) % 7;

    const daysInMonth = new Date(
      Date.UTC(year, month, 0)
    ).getUTCDate();

    const daysByDate = new Map(
      data.travelDays.map((day) => [day.date, day])
    );

    const cells: (
      | {
          dayNumber: number;
          date: string;
          record?: TravelDay;
        }
      | null
    )[] = Array.from(
      { length: leadingBlanks },
      () => null
    );

    for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber++) {
      const date =
        `${year}-${String(month).padStart(2, "0")}-` +
        String(dayNumber).padStart(2, "0");

      cells.push({
        dayNumber,
        date,
        record: daysByDate.get(date),
      });
    }

    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    return cells;
  }, [data]);

  const selectedMonth = data?.month;
  const historyYears = useMemo(
    () => [...new Set(history.map((item) => item.year))].sort((a, b) => b - a),
    [history]
  );
  const filteredHistory = useMemo(
    () =>
      historyYear === "all"
        ? history
        : history.filter((item) => item.year === Number(historyYear)),
    [history, historyYear]
  );

  function openSettings() {
    if (!selectedMonth) return;

    setSettingsDailyCost(selectedMonth.defaultDailyCost);
    setSettingsWorkDays([...(selectedMonth.workDays ?? [])]);
    setSettingsOffDates([...(selectedMonth.offDates ?? [])]);
    setSettingsOffDateInput("");
    setSettingsError("");
    setSettingsSuccess("");
    setShowSettings(true);
  }

  function cancelSettings() {
    setShowSettings(false);
    setSettingsError("");
    setSettingsSuccess("");
    setSettingsOffDateInput("");
  }

  function cancelRegenerateConfirmation() {
    if (isSavingSettings) return;
    setShowRegenerateConfirmation(false);
    setPendingSettingsPayload(null);
  }

  useEffect(() => {
    if (!showRegenerateConfirmation) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSavingSettings) {
        setShowRegenerateConfirmation(false);
        setPendingSettingsPayload(null);
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showRegenerateConfirmation, isSavingSettings]);

  function addSettingsOffDate() {
    setSettingsError("");

    if (!selectedMonth || !settingsOffDateInput) {
      setSettingsError("กรุณาเลือกวันที่ต้องการหยุด");
      return;
    }

    if (!isValidDateString(settingsOffDateInput)) {
      setSettingsError("รูปแบบวันที่ต้องเป็น YYYY-MM-DD");
      return;
    }

    const monthPrefix =
      `${selectedMonth.year}-${String(selectedMonth.month).padStart(2, "0")}-`;

    if (!settingsOffDateInput.startsWith(monthPrefix)) {
      setSettingsError("วันหยุดต้องอยู่ในเดือนที่เลือก");
      return;
    }

    if (settingsOffDates.includes(settingsOffDateInput)) {
      setSettingsError("วันที่นี้ถูกเพิ่มไปแล้ว");
      return;
    }

    setSettingsOffDates((current) =>
      [...current, settingsOffDateInput].sort()
    );
    setSettingsOffDateInput("");
  }

  async function handleSaveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSettingsError("");
    setSettingsSuccess("");

    const dailyCost = Number(settingsDailyCost);

    if (!Number.isFinite(dailyCost) || dailyCost < 0) {
      setSettingsError("ค่าเดินทางต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป");
      setIsSavingSettings(false);
      return;
    }

    if (settingsWorkDays.length === 0) {
      setSettingsError("ต้องเลือกวันทำงานอย่างน้อย 1 วัน");
      setIsSavingSettings(false);
      return;
    }

    if (!selectedMonthId || !selectedMonth) {
      setSettingsError("ยังไม่ได้เลือกเดือน");
      setIsSavingSettings(false);
      return;
    }

    const monthPrefix =
      `${selectedMonth.year}-${String(selectedMonth.month).padStart(2, "0")}-`;
    const hasInvalidDate = settingsOffDates.some(
      (date) =>
        !isValidDateString(date) || !date.startsWith(monthPrefix)
    );
    const hasDuplicateDate =
      new Set(settingsOffDates).size !== settingsOffDates.length;

    if (hasInvalidDate) {
      setSettingsError(
        "วันหยุดต้องเป็นวันที่จริงและอยู่ในเดือนที่เลือก"
      );
      setIsSavingSettings(false);
      return;
    }

    if (hasDuplicateDate) {
      setSettingsError("วันหยุดห้ามซ้ำกัน");
      setIsSavingSettings(false);
      return;
    }

    const payload = {
      defaultDailyCost: dailyCost,
      workDays: [...settingsWorkDays].sort((a, b) => a - b),
      offDates: [...settingsOffDates].sort(),
    };

    setPendingSettingsPayload(payload);
    setShowRegenerateConfirmation(true);
  }

  async function handleConfirmRegenerate() {
    if (!selectedMonthId || !pendingSettingsPayload) return;

    setIsSavingSettings(true);
    setSettingsError("");

    try {
      const response = await fetch(
        `/api/months/${selectedMonthId}/regenerate-days`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(pendingSettingsPayload),
        }
      );
      const responsePayload = await readJson<{ message?: string }>(response);

      if (!response.ok) {
        throw new Error(
          responsePayload?.message ?? "บันทึกการตั้งค่าไม่สำเร็จ"
        );
      }

      const refreshedData = await fetchMonthDetail(selectedMonthId);

      setData(refreshedData);
      setSettingsDailyCost(refreshedData.month.defaultDailyCost);
      setSettingsWorkDays([...(refreshedData.month.workDays ?? [])]);
      setSettingsOffDates([...(refreshedData.month.offDates ?? [])]);
      setSettingsOffDateInput("");
      setShowSettings(false);
      setSettingsSuccess("บันทึกการตั้งค่าสำเร็จ");
      setShowRegenerateConfirmation(false);
      setPendingSettingsPayload(null);
    } catch (saveError) {
      setSettingsError(
        saveError instanceof Error
          ? saveError.message
          : "เกิดข้อผิดพลาดในการบันทึกการตั้งค่า"
      );
    } finally {
      setIsSavingSettings(false);
    }
  }

  function handleSelectDay(record: TravelDay | undefined) {
    setEditDayError("");
    setEditDaySuccess("");
    setIsEditingDay(false);

    if (!record) {
      setSelectedDay(null);
      return;
    }

    setSelectedDay(record);
    setEditStatus(record.status);
    setEditCost(record.status === "OFF" ? 0 : record.cost);
  }

  async function handleSaveDay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedDay) return;

    const nextCost = editStatus === "OFF" ? 0 : Number(editCost);

    if (!Number.isFinite(nextCost) || nextCost < 0) {
      setEditDayError("กรุณาระบุค่าเดินทางเป็นตัวเลขตั้งแต่ 0 ขึ้นไป");
      return;
    }

    setIsSavingDay(true);
    setEditDayError("");
    setEditDaySuccess("");

    try {
      const response = await fetch(
        `/api/travel-days/${selectedDay._id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: editStatus,
            cost: nextCost,
          }),
        }
      );

      const payload = await readJson<{
        message?: string;
        travelDay?: TravelDay;
      }>(response);

      if (!response.ok) {
        throw new Error(
          payload?.message ?? "บันทึกข้อมูลไม่สำเร็จ"
        );
      }

      const refreshedData = await fetchMonthDetail(selectedMonthId);
      const latestDay = refreshedData.travelDays.find(
        (day) => day._id === selectedDay._id
      );

      if (!latestDay) {
        throw new Error("ไม่พบข้อมูลวันที่อัปเดตแล้ว");
      }

      setData(refreshedData);
      setSelectedDay(latestDay);
      setEditStatus(latestDay.status);
      setEditCost(latestDay.status === "OFF" ? 0 : latestDay.cost);
      setIsEditingDay(false);
      setEditDaySuccess("บันทึกสำเร็จ");
    } catch (err) {
      setEditDayError(
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึก"
      );
    } finally {
      setIsSavingDay(false);
    }
  }

  function addOffDate() {
  setCreateError("");

  if (!offDateInput) {
    setCreateError("กรุณาเลือกวันที่ต้องการหยุด");
    return;
  }

  if (createYear === "") {
    setCreateError("กรุณาระบุปีเป็นตัวเลขก่อนเพิ่มวันหยุด");
    return;
  }

  const monthPrefix =
    `${createYear}-${String(createMonth).padStart(2, "0")}-`;

  if (!offDateInput.startsWith(monthPrefix)) {
    setCreateError("วันหยุดต้องอยู่ในเดือนที่เลือก");
    return;
  }

  if (createOffDates.includes(offDateInput)) {
    setCreateError("วันที่นี้ถูกเพิ่มไปแล้ว");
    return;
  }

  setCreateOffDates((current) =>
    [...current, offDateInput].sort()
  );

  setOffDateInput("");
}

async function handleCreateMonth(
  event: FormEvent<HTMLFormElement>
) {
  event.preventDefault();

  setCreateError("");
  setCreateSuccess("");

  const year = Number(createYear);
  const dailyCost = Number(createDailyCost);

  if (
    createYear === "" ||
    !Number.isInteger(year) ||
    year < 2000
  ) {
    setCreateError("กรุณาระบุปีเป็นจำนวนเต็มตั้งแต่ 2000 ขึ้นไป");
    return;
  }

  if (
    createDailyCost === "" ||
    !Number.isFinite(dailyCost) ||
    dailyCost < 0
  ) {
    setCreateError("กรุณาระบุค่าเดินทางเป็นตัวเลขตั้งแต่ 0 ขึ้นไป");
    return;
  }

  const monthPrefix =
    `${year}-${String(createMonth).padStart(2, "0")}-`;

  if (createOffDates.some((date) => !date.startsWith(monthPrefix))) {
    setCreateError(
      "มีวันหยุดจากเดือนอื่น กรุณาลบออกก่อนสร้างเดือน"
    );
    return;
  }

  setIsCreatingMonth(true);

  try {
    const response = await fetch("/api/months", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        year,
        month: Number(createMonth),
        defaultDailyCost: dailyCost,
        workDays: createWorkDays,
        offDates: createOffDates,
      }),
    });

    const payload = await readJson<{
      NewMonth?: MonthItem;
      month?: MonthItem;
      message?: string;
    }>(response);

    if (!response.ok) {
      if (response.status === 409) {
        throw new Error("เดือนนี้มีอยู่แล้ว");
      }

      throw new Error(
        payload?.message ?? "เซิร์ฟเวอร์ส่งข้อมูลไม่ถูกต้อง"
      );
    }

    const createdMonth = payload?.NewMonth ?? payload?.month;

    if (!createdMonth?._id) {
      throw new Error(
        "ไม่พบข้อมูลเดือนที่สร้างใน API response"
      );
    }

    const generateResponse = await fetch(
      `/api/months/${createdMonth._id}/generate-days`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workDays: createWorkDays,
          offDates: createOffDates,
        }),
      }
    );

    const generatePayload = await readJson<{ message?: string }>(
      generateResponse
    );

    if (!generateResponse.ok) {
      throw new Error(
        generatePayload?.message ?? "เซิร์ฟเวอร์ส่งข้อมูลไม่ถูกต้อง"
      );
    }

    setSelectedMonthId(createdMonth._id);
    setSelectedDay(null);
    setIsEditingDay(false);
    setEditDaySuccess("");
    setShowSettings(false);
    setMonthsReloadKey((current) => current + 1);

    setShowCreateForm(false);
    setCreateSuccess("สร้างเดือนสำเร็จ!");
    setCreateOffDates([]);
    setOffDateInput("");
  } catch (err) {
    setCreateError(
      err instanceof Error ? err.message : "เกิดข้อผิดพลาด"
    );
  } finally {
    setIsCreatingMonth(false);
  }
}

  function resetRouteForm() {
    setRouteForm({
      name: "",
      type: "OUTBOUND",
      segments: [{ name: "", cost: "" }],
    });
    setEditingRouteId(null);
    setRouteFormError("");
  }

  function openCreateRouteForm() {
    resetRouteForm();
    setRouteFormSuccess("");
    setShowRouteForm(true);
  }

  function openEditRouteForm(route: TravelRoute) {
    setEditingRouteId(route._id);
    setRouteForm({
      name: route.name,
      type: route.type,
      segments: route.segments.map((segment) => ({
        name: segment.name,
        cost: segment.cost,
      })),
    });
    setRouteFormError("");
    setRouteFormSuccess("");
    setShowRouteForm(true);
  }

  function updateRouteSegment(index: number, field: "name" | "cost", value: string) {
    setRouteForm((current) => ({
      ...current,
      segments: current.segments.map((segment, segmentIndex) =>
        segmentIndex === index
          ? {
              ...segment,
              [field]: field === "cost" ? (value === "" ? "" : Number(value)) : value,
            }
          : segment
      ),
    }));
  }

  function addRouteSegment() {
    setRouteForm((current) => ({
      ...current,
      segments: [...current.segments, { name: "", cost: "" }],
    }));
  }

  function removeRouteSegment(index: number) {
    setRouteForm((current) => ({
      ...current,
      segments: current.segments.filter((_, segmentIndex) => segmentIndex !== index),
    }));
  }

  async function handleRouteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRouteFormError("");
    setRouteFormSuccess("");

    const name = routeForm.name.trim();
    const segments = routeForm.segments.map((segment) => ({
      name: segment.name.trim(),
      cost: segment.cost,
    }));

    if (!name) {
      setRouteFormError("กรุณาระบุชื่อ Route");
      return;
    }
    if (segments.length === 0) {
      setRouteFormError("ต้องมีอย่างน้อย 1 Segment");
      return;
    }
    if (segments.some((segment) => !segment.name)) {
      setRouteFormError("กรุณาระบุชื่อของทุก Segment");
      return;
    }
    if (
      segments.some(
        (segment) =>
          typeof segment.cost !== "number" ||
          !Number.isFinite(segment.cost) ||
          segment.cost < 0
      )
    ) {
      setRouteFormError("ค่าใช้จ่ายต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป");
      return;
    }

    const payload = {
      name,
      type: routeForm.type,
      segments: segments.map((segment) => ({
        name: segment.name,
        cost: Number(segment.cost),
      })),
    };

    setIsSavingRoute(true);
    try {
      const response = await fetch(
        editingRouteId ? `/api/routes/${editingRouteId}` : "/api/routes",
        {
          method: editingRouteId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const responsePayload = await readJson<{ message?: string }>(response);

      if (!response.ok) {
        throw new Error(responsePayload?.message ?? "บันทึก Route ไม่สำเร็จ");
      }

      const routesReloaded = await loadRoutes();
      if (!routesReloaded) {
        throw new Error("บันทึก Route แล้ว แต่โหลดรายการล่าสุดไม่สำเร็จ");
      }
      setShowRouteForm(false);
      setRouteFormSuccess(editingRouteId ? "แก้ไข Route สำเร็จ" : "สร้าง Route สำเร็จ");
      resetRouteForm();
    } catch (routeError) {
      setRouteFormError(
        routeError instanceof Error ? routeError.message : "เกิดข้อผิดพลาดในการบันทึก Route"
      );
    } finally {
      setIsSavingRoute(false);
    }
  }

  async function handleConfirmDeleteRoute() {
    if (!routeToDelete) return;

    setIsDeletingRoute(true);
    setRouteDeleteError("");
    try {
      const response = await fetch(`/api/routes/${routeToDelete._id}`, {
        method: "DELETE",
      });
      const responsePayload = await readJson<{ message?: string }>(response);

      if (!response.ok) {
        throw new Error(responsePayload?.message ?? "ลบ Route ไม่สำเร็จ");
      }

      const routesReloaded = await loadRoutes();
      if (!routesReloaded) {
        throw new Error("ลบ Route แล้ว แต่โหลดรายการล่าสุดไม่สำเร็จ");
      }
      setRouteToDelete(null);
      setRouteFormSuccess("ลบ Route สำเร็จ");
    } catch (routeError) {
      setRouteDeleteError(
        routeError instanceof Error ? routeError.message : "เกิดข้อผิดพลาดในการลบ Route"
      );
    } finally {
      setIsDeletingRoute(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0C0C12] px-4 py-6 text-zinc-100 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-pink-500 text-white shadow-lg shadow-pink-950/40">
              <CalendarDays size={23} />
            </div>

            <div>
              <h1 className="text-xl font-bold tracking-tight">
                Commute Tracker
              </h1>
              <p className="text-xs tracking-[0.2em] text-zinc-500">
                PERSONAL FINANCE
              </p>
            </div>
          </div>

        <div className="flex flex-wrap justify-end gap-2">
  <button
    type="button"
    onClick={() => setViewMode("dashboard")}
    className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm transition ${
      viewMode === "dashboard"
        ? "bg-pink-500 font-semibold text-white"
        : "border border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]"
    }`}
  >
    <LayoutDashboard size={16} />
    Dashboard
  </button>

  <button
    type="button"
    onClick={() => {
      setHistoryError("");
      setViewMode("history");
    }}
    className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm transition ${
      viewMode === "history"
        ? "bg-pink-500 font-semibold text-white"
        : "border border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]"
    }`}
  >
    <History size={16} />
    Monthly History
  </button>

  {viewMode === "dashboard" && (
    <>
  <button
    type="button"
    onClick={() => {
      setShowCreateForm((current) => !current);
      setCreateError("");
    }}
    className="flex items-center gap-2 rounded-xl bg-pink-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-pink-400"
  >
    <Plus size={16} />
    สร้างเดือนใหม่
  </button>

  <button
    type="button"
    onClick={() => {
      setSelectedDay(null);
      setIsEditingDay(false);
      setEditDaySuccess("");
      setShowSettings(false);
      setMonthsReloadKey((current) => current + 1);
      setReloadKey((current) => current + 1);
    }}
    disabled={loading}
    className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-300 transition hover:bg-white/[0.08] disabled:opacity-50"
  >
    <RefreshCw size={16} />
    รีเฟรชข้อมูล
  </button>

  <button
    type="button"
    onClick={openSettings}
    disabled={!selectedMonthId || !selectedMonth}
    className="flex items-center gap-2 rounded-xl border border-pink-500/30 bg-pink-500/[0.06] px-4 py-2.5 text-sm text-pink-300 transition hover:bg-pink-500/10 disabled:cursor-not-allowed disabled:opacity-50"
  >
    ตั้งค่าเดือน
  </button>
    </>
  )}
</div>
        </header>

        {viewMode === "history" ? (
          <section className="space-y-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="mb-2 text-sm text-pink-400">MONTHLY HISTORY</p>
                <h2 className="text-3xl font-bold sm:text-4xl">
                  ประวัติค่าเดินทาง
                </h2>
                <p className="mt-2 text-sm text-zinc-500">
                  ดูสรุปค่าเดินทางย้อนหลังจากข้อมูลจริงในระบบ
                </p>
              </div>

              {historyYears.length > 0 && (
                <label className="flex items-center gap-3 text-sm text-zinc-400">
                  ปี
                  <select
                    value={historyYear}
                    onChange={(event) => setHistoryYear(event.target.value)}
                    className="min-w-36 rounded-xl border border-white/10 bg-[#181820] px-4 py-3 text-sm text-white outline-none transition focus:border-pink-500"
                  >
                    <option value="all">ทั้งหมด</option>
                    {historyYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            {historyError && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
                {historyError}
              </div>
            )}

            {historyLoading && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center text-sm text-zinc-400">
                กำลังโหลดประวัติรายเดือน...
              </div>
            )}

            {!historyLoading && !historyError && history.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center">
                <History className="mx-auto mb-3 text-pink-400" size={34} />
                <h3 className="font-semibold">ยังไม่มีประวัติรายเดือน</h3>
                <p className="mt-2 text-sm text-zinc-500">
                  สร้างเดือนและปฏิทินก่อน แล้วประวัติจะแสดงตรงนี้
                </p>
              </div>
            )}

            {!historyLoading && !historyError && history.length > 0 && filteredHistory.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-sm text-zinc-500">
                ไม่พบประวัติของปีที่เลือก
              </div>
            )}

            {!historyLoading && !historyError && filteredHistory.length > 0 && (
              <div className="grid gap-4 lg:grid-cols-2">
                {filteredHistory.map((item) => {
                  const matchingMonth = months.find(
                    (month) =>
                      month.year === item.year && month.month === item.month
                  );
                  const canOpenCalendar = item.hasCalendar && Boolean(matchingMonth);

                  return (
                    <article
                      key={`${item.year}-${item.month}`}
                      className="rounded-2xl border border-white/10 bg-[#13131B] p-5 transition hover:border-pink-500/30 sm:p-6"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold tracking-[0.18em] text-pink-400">
                            MONTH
                          </p>
                          <h3 className="mt-2 text-xl font-bold text-white">
                            {formatMonth(item.year, item.month)}
                          </h3>
                        </div>
                        <span
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                            item.hasCalendar
                              ? "bg-pink-500/15 text-pink-300"
                              : "bg-zinc-700/40 text-zinc-400"
                          }`}
                        >
                          {item.hasCalendar ? "มีปฏิทินแล้ว" : "ยังไม่มีปฏิทิน"}
                        </span>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                          <p className="text-xs text-zinc-500">ทั้งหมด</p>
                          <p className="mt-2 font-semibold text-white">{item.totalDays} วัน</p>
                        </div>
                        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                          <p className="text-xs text-zinc-500">วันทำงาน</p>
                          <p className="mt-2 font-semibold text-pink-300">{item.workDays} วัน</p>
                        </div>
                        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                          <p className="text-xs text-zinc-500">วันหยุด</p>
                          <p className="mt-2 font-semibold text-zinc-300">{item.offDays} วัน</p>
                        </div>
                        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                          <p className="text-xs text-zinc-500">รวม</p>
                          <p className="mt-2 font-semibold text-white">{formatMoney(item.totalCost)}</p>
                        </div>
                      </div>

                      <div className="mt-5 flex justify-end">
                        {canOpenCalendar ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (!matchingMonth) return;

                              setSelectedDay(null);
                              setIsEditingDay(false);
                              setShowSettings(false);
                              setEditDaySuccess("");
                              setData(null);
                              setLoading(true);
                              setError("");
                              setSelectedMonthId(matchingMonth._id);
                              setViewMode("dashboard");
                            }}
                            className="flex items-center gap-2 rounded-xl border border-pink-500/30 px-4 py-2.5 text-sm font-semibold text-pink-300 transition hover:bg-pink-500/10"
                          >
                            <Eye size={16} />
                            ดูปฏิทิน
                          </button>
                        ) : (
                          <span className="text-sm text-zinc-600">
                            ยังไม่มีข้อมูลวันเดินทาง
                          </span>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
        <>
        {/* Title and month selector */}
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-sm text-pink-400">
              MONTHLY OVERVIEW
            </p>
            <h2 className="text-3xl font-bold sm:text-4xl">
              ปฏิทินค่าเดินทาง
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              ดูวันทำงาน วันหยุด และค่าใช้จ่ายของแต่ละเดือน
            </p>
          </div>

          <select
            value={selectedMonthId}
            onChange={(event) => {
              setSelectedDay(null);
              setIsEditingDay(false);
              setEditDaySuccess("");
              setShowSettings(false);
              setData(null);
              setLoading(true);
              setSelectedMonthId(event.target.value);
            }}
            disabled={months.length === 0}
            className="min-w-56 rounded-xl border border-white/10 bg-[#181820] px-4 py-3 text-sm text-white outline-none transition focus:border-pink-500"
          >
            {months.length === 0 && (
              <option value="">ยังไม่มีเดือน</option>
            )}

            {months.map((item) => (
              <option key={item._id} value={item._id}>
                {formatMonth(item.year, item.month)}
              </option>
            ))}
          </select>
        </section>
{createSuccess && (
  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
    {createSuccess}
  </div>
)}

{showCreateForm && (
  <form
    onSubmit={handleCreateMonth}
    className="space-y-6 rounded-2xl border border-pink-500/20 bg-[#15151D] p-5 sm:p-6"
  >
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-pink-400">
          NEW MONTH
        </p>
        <h3 className="mt-1 text-xl font-bold text-white">
          สร้างเดือนใหม่
        </h3>
        <p className="mt-1 text-sm text-zinc-500">
          ตั้งค่าการเดินทางสำหรับเดือนนี้
        </p>
      </div>

      <button
        type="button"
        onClick={() => setShowCreateForm(false)}
        className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white"
        aria-label="ปิดฟอร์ม"
      >
        <X size={18} />
      </button>
    </div>

    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <label className="space-y-2 text-sm text-zinc-300">
        ปี
        <input
          type="number"
          min={2000}
          required
          placeholder="2026"
          value={createYear}
          onChange={(event) =>
            setCreateYear(
              event.target.value === "" ? "" : Number(event.target.value)
            )
          }
          className={numberInputClass}
        />
        <p className="text-xs text-zinc-500">พิมพ์ปีได้โดยตรง</p>
      </label>

      <label className="space-y-2 text-sm text-zinc-300">
        เดือน
        <select
          value={createMonth}
          onChange={(event) =>
            setCreateMonth(Number(event.target.value))
          }
          className="w-full rounded-xl border border-white/10 bg-[#0C0C12] px-3 py-3 text-white outline-none focus:border-pink-500"
        >
          {Array.from({ length: 12 }, (_, index) => index + 1).map(
            (monthNumber) => (
              <option key={monthNumber} value={monthNumber}>
                {new Intl.DateTimeFormat("th-TH", {
                  month: "long",
                  timeZone: "UTC",
                }).format(
                  new Date(Date.UTC(2026, monthNumber - 1, 1))
                )}
              </option>
            )
          )}
        </select>
      </label>

      <label className="space-y-2 text-sm text-zinc-300">
        ค่าเดินทางตั้งต้น (บาท/วัน)
        <input
          type="number"
          min={0}
          step="1"
          required
          placeholder="200"
          value={createDailyCost}
          onChange={(event) =>
            setCreateDailyCost(
              event.target.value === "" ? "" : Number(event.target.value)
            )
          }
          className={numberInputClass}
        />
        <p className="text-xs text-zinc-500">พิมพ์ตัวเลขได้โดยตรง</p>
      </label>
    </div>

    <div className="space-y-3">
      <div>
        <h4 className="font-semibold text-white">
          วันทำงานประจำสัปดาห์
        </h4>
        <p className="mt-1 text-xs text-zinc-500">
          เลือกวันทำงานของเดือนนี้
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {workDayOptions.map((day) => {
          const checked = createWorkDays.includes(day.value);

          return (
            <label
              key={day.value}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition ${
                checked
                  ? "border-pink-500/40 bg-pink-500/10 text-pink-200"
                  : "border-white/10 bg-[#0C0C12] text-zinc-400 hover:border-white/20"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(event) => {
                  setCreateWorkDays((current) =>
                    event.target.checked
                      ? [...current, day.value].sort((a, b) => a - b)
                      : current.filter((value) => value !== day.value)
                  );
                }}
                className="accent-pink-500"
              />
              {day.label}
            </label>
          );
        })}
      </div>
    </div>

    <div className="space-y-3">
      <div>
        <h4 className="font-semibold text-white">
          วันหยุดพิเศษ
        </h4>
        <p className="mt-1 text-xs text-zinc-500">
          วันที่เลือกจะเป็น OFF แม้ตรงกับวันทำงานประจำ
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="date"
          value={offDateInput}
          min={
            createYear === ""
              ? undefined
              : `${createYear}-${String(createMonth).padStart(2, "0")}-01`
          }
          max={
            createYear === ""
              ? undefined
              : `${createYear}-${String(createMonth).padStart(2, "0")}-${String(
                  new Date(Number(createYear), createMonth, 0).getDate()
                ).padStart(2, "0")}`
          }
          onChange={(event) => setOffDateInput(event.target.value)}
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#0C0C12] px-3 py-3 text-sm text-white outline-none focus:border-pink-500"
        />

        <button
          type="button"
          onClick={addOffDate}
          className="flex items-center justify-center gap-2 rounded-xl border border-pink-500/30 px-4 py-3 text-sm text-pink-300 transition hover:bg-pink-500/10"
        >
          <Plus size={16} />
          เพิ่มวันหยุด
        </button>
      </div>

      {createOffDates.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {createOffDates.map((date) => (
            <span
              key={date}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-zinc-300"
            >
              {date}
              <button
                type="button"
                onClick={() =>
                  setCreateOffDates((current) =>
                    current.filter((item) => item !== date)
                  )
                }
                className="text-zinc-500 transition hover:text-pink-400"
                aria-label={`ลบวันหยุด ${date}`}
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-zinc-500">
          ยังไม่มีวันหยุดพิเศษ
        </p>
      )}
    </div>

    {createError && (
      <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
        {createError}
      </p>
    )}

    <div className="flex flex-wrap justify-end gap-2 border-t border-white/[0.07] pt-4">
      <button
        type="button"
        onClick={() => setShowCreateForm(false)}
        className="rounded-xl border border-white/10 px-4 py-3 text-sm text-zinc-300 transition hover:bg-white/[0.05]"
      >
        ยกเลิก
      </button>

      <button
        type="submit"
        disabled={isCreatingMonth}
        className="flex items-center gap-2 rounded-xl bg-pink-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-pink-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus size={16} />
        {isCreatingMonth ? "กำลังสร้าง..." : "สร้างเดือน"}
      </button>
    </div>
  </form>
)}
        {showSettings && selectedMonth && (
          <form
            onSubmit={handleSaveSettings}
            className="space-y-6 rounded-2xl border border-pink-500/20 bg-[#15151D] p-5 sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-pink-400">
                  MONTH SETTINGS
                </p>
                <h3 className="mt-1 text-xl font-bold text-white">
                  ตั้งค่าเดือน {formatMonth(selectedMonth.year, selectedMonth.month)}
                </h3>
                <p className="mt-1 text-sm text-zinc-500">
                  แก้ไขค่าเดินทาง วันทำงาน และวันหยุดพิเศษ
                </p>
              </div>

              <button
                type="button"
                onClick={cancelSettings}
                className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white"
                aria-label="ปิดการตั้งค่าเดือน"
              >
                <X size={18} />
              </button>
            </div>

            <label className="block max-w-sm space-y-2 text-sm text-zinc-300">
              ค่าเดินทางเริ่มต้น (บาท/วัน)
              <input
                type="number"
                min={0}
                step="1"
                placeholder="200"
                value={settingsDailyCost}
                onChange={(event) =>
                  setSettingsDailyCost(
                    event.target.value === ""
                      ? ""
                      : Number(event.target.value)
                  )
                }
                className={numberInputClass}
              />
              <p className="text-xs text-zinc-500">
                พิมพ์ตัวเลขได้โดยตรง
              </p>
            </label>

            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-white">
                  วันทำงานประจำสัปดาห์
                </h4>
                <p className="mt-1 text-xs text-zinc-500">
                  ต้องเลือกอย่างน้อย 1 วัน
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {settingsWorkDayOptions.map((day) => {
                  const checked = settingsWorkDays.includes(day.value);

                  return (
                    <label
                      key={day.value}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition ${
                        checked
                          ? "border-pink-500/40 bg-pink-500/10 text-pink-200"
                          : "border-white/10 bg-[#0C0C12] text-zinc-400 hover:border-white/20"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => {
                          setSettingsWorkDays((current) =>
                            event.target.checked
                              ? [...current, day.value].sort(
                                  (a, b) => a - b
                                )
                              : current.filter(
                                  (value) => value !== day.value
                                )
                          );
                        }}
                        className="accent-pink-500"
                      />
                      {day.label}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-white">
                  วันหยุดพิเศษ
                </h4>
                <p className="mt-1 text-xs text-zinc-500">
                  วันที่ต้องอยู่ในเดือนที่กำลังเลือก
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="date"
                  value={settingsOffDateInput}
                  min={`${selectedMonth.year}-${String(selectedMonth.month).padStart(2, "0")}-01`}
                  max={`${selectedMonth.year}-${String(selectedMonth.month).padStart(2, "0")}-${String(
                    new Date(
                      selectedMonth.year,
                      selectedMonth.month,
                      0
                    ).getDate()
                  ).padStart(2, "0")}`}
                  onChange={(event) =>
                    setSettingsOffDateInput(event.target.value)
                  }
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#0C0C12] px-3 py-3 text-sm text-white outline-none focus:border-pink-500"
                />
                <button
                  type="button"
                  onClick={addSettingsOffDate}
                  className="rounded-xl border border-pink-500/30 px-4 py-3 text-sm text-pink-300 transition hover:bg-pink-500/10"
                >
                  เพิ่มวันหยุด
                </button>
              </div>

              {settingsOffDates.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {settingsOffDates.map((date) => (
                    <span
                      key={date}
                      className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-zinc-300"
                    >
                      {date}
                      <button
                        type="button"
                        onClick={() =>
                          setSettingsOffDates((current) =>
                            current.filter((item) => item !== date)
                          )
                        }
                        className="text-zinc-500 transition hover:text-pink-400"
                        aria-label={`ลบวันหยุด ${date}`}
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500">
                  ยังไม่มีวันหยุดพิเศษ
                </p>
              )}
            </div>

            {settingsError && (
              <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                {settingsError}
              </p>
            )}

            {settingsSuccess && (
              <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                {settingsSuccess}
              </p>
            )}

            <div className="flex flex-wrap justify-end gap-2 border-t border-white/[0.07] pt-4">
              <button
                type="button"
                onClick={cancelSettings}
                disabled={isSavingSettings}
                className="rounded-xl border border-white/10 px-4 py-3 text-sm text-zinc-300 transition hover:bg-white/[0.05] disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isSavingSettings}
                className="rounded-xl bg-pink-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-pink-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSavingSettings ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </form>
        )}

        {showRegenerateConfirmation && pendingSettingsPayload && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                cancelRegenerateConfirmation();
              }
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="regenerate-confirmation-title"
              className="w-full max-w-md rounded-2xl border border-pink-500/30 bg-[#15151D] p-6 shadow-2xl"
            >
              <h3
                id="regenerate-confirmation-title"
                className="text-lg font-semibold text-white"
              >
                ยืนยันการสร้างปฏิทินใหม่
              </h3>
              <p className="mt-3 text-sm leading-6 text-zinc-300">
                การบันทึก Settings จะลบและสร้างข้อมูล TravelDay ของเดือนนี้ใหม่
                ข้อมูลค่าใช้จ่ายรายวันที่แก้เองอาจถูกเขียนทับ ต้องการดำเนินการต่อหรือไม่
              </p>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={cancelRegenerateConfirmation}
                  disabled={isSavingSettings}
                  autoFocus
                  className="rounded-xl border border-white/10 px-4 py-3 text-sm text-zinc-300 transition hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRegenerate}
                  disabled={isSavingSettings}
                  className="rounded-xl bg-pink-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-pink-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSavingSettings ? "กำลังสร้างใหม่..." : "สร้างใหม่"}
                </button>
              </div>
            </section>
          </div>
        )}

        {settingsSuccess && !showSettings && (
          <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
            {settingsSuccess}
          </p>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {loading && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-zinc-400">
            กำลังโหลดข้อมูล...
          </div>
        )}

        {!loading && !error && !data && (
          <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center">
            <CalendarDays className="mx-auto mb-3 text-pink-400" size={34} />
            <h3 className="font-semibold">ยังไม่มีข้อมูลเดือน</h3>
            <p className="mt-2 text-sm text-zinc-500">
              สร้างเดือนผ่าน API ก่อน แล้วเดือนจะแสดงตรงนี้
            </p>
          </div>
        )}

        {!loading && data && selectedMonth && (
          <>
            {/* Summary Cards */}
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-pink-500/20 bg-gradient-to-br from-pink-500/10 to-[#181820] p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-zinc-400">
                    ค่าเดินทางรวม
                  </p>
                  <Wallet className="text-pink-400" size={20} />
                </div>
                <p className="mt-4 text-3xl font-bold text-pink-300">
                  {formatMoney(data.summary.totalCost)}
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  ยอดรวมของเดือนที่เลือก
                </p>
              </div>

              <SummaryCard
                label="วันเดินทาง"
                value={`${data.summary.workDays} วัน`}
                detail="วันที่มีสถานะ WORK"
                icon={<BriefcaseBusiness size={20} />}
              />

              <SummaryCard
                label="วันหยุด"
                value={`${data.summary.offDays} วัน`}
                detail="วันที่มีสถานะ OFF"
                icon={<Coffee size={20} />}
              />

              <SummaryCard
                label="ค่าเดินทางต่อวัน"
                value={formatMoney(selectedMonth.defaultDailyCost)}
                detail="ค่าเริ่มต้นของเดือนนี้"
                icon={<Wallet size={20} />}
              />
            </section>

            {/* Travel Routes */}
            <section className="space-y-5 rounded-2xl border border-white/10 bg-[#13131B] p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-pink-400">TRAVEL ROUTES</p>
                  <h3 className="mt-1 text-xl font-bold text-white">เส้นทางการเดินทาง</h3>
                  <p className="mt-1 text-sm text-zinc-500">
                    จัดการเส้นทางไปและกลับหลายรายการได้ตามต้องการ
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openCreateRouteForm}
                  className="flex items-center gap-2 rounded-xl bg-pink-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-pink-400"
                >
                  <Plus size={16} />
                  เพิ่ม Route
                </button>
              </div>

              {routesError && (
                <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                  {routesError}
                </p>
              )}

              {routeFormSuccess && !showRouteForm && (
                <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                  {routeFormSuccess}
                </p>
              )}

              {routesLoading ? (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-zinc-400">
                  กำลังโหลด Route...
                </div>
              ) : routes.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-zinc-500">
                  ยังไม่มี Route ในระบบ
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {(["OUTBOUND", "RETURN"] as const).map((type) => (
                    <div key={type} className="space-y-3">
                      <h4 className="text-sm font-semibold text-zinc-300">
                        {type === "OUTBOUND" ? "ขาไป (OUTBOUND)" : "ขากลับ (RETURN)"}
                      </h4>
                      {routesByType[type].length === 0 ? (
                        <p className="rounded-xl border border-white/[0.08] p-4 text-sm text-zinc-600">
                          ยังไม่มี Route ประเภทนี้
                        </p>
                      ) : (
                        routesByType[type].map((route) => (
                          <article
                            key={route._id}
                            className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h5 className="font-semibold text-white">{route.name}</h5>
                                <p className="mt-1 text-xs text-pink-300">{route.type}</p>
                              </div>
                              <p className="text-right text-sm font-semibold text-pink-300">
                                {formatMoney(calculateRouteCost(route.segments))}
                                <span className="block text-xs font-normal text-zinc-500">รวม</span>
                              </p>
                            </div>

                            <div className="mt-4 space-y-2">
                              {route.segments.map((segment, index) => (
                                <div
                                  key={segment._id ?? `${route._id}-${index}`}
                                  className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-[#0C0C12] px-3 py-2 text-sm"
                                >
                                  <span className="min-w-0 truncate text-zinc-300">
                                    {segment.name}
                                  </span>
                                  <span className="shrink-0 text-zinc-400">
                                    {formatMoney(segment.cost)}
                                  </span>
                                </div>
                              ))}
                            </div>

                            <div className="mt-4 flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openEditRouteForm(route)}
                                className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 transition hover:bg-white/[0.06]"
                              >
                                แก้ไข
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setRouteDeleteError("");
                                  setRouteToDelete(route);
                                }}
                                className="rounded-lg border border-red-500/20 px-3 py-2 text-xs text-red-300 transition hover:bg-red-500/10"
                              >
                                ลบ
                              </button>
                            </div>
                          </article>
                        ))
                      )}
                    </div>
                  ))}
                </div>
              )}

              {showRouteForm && (
                <form
                  onSubmit={handleRouteSubmit}
                  className="space-y-5 rounded-xl border border-pink-500/20 bg-[#15151D] p-4 sm:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-pink-400">{editingRouteId ? "EDIT ROUTE" : "NEW ROUTE"}</p>
                      <h4 className="mt-1 font-semibold text-white">
                        {editingRouteId ? "แก้ไขเส้นทาง" : "สร้างเส้นทางใหม่"}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowRouteForm(false);
                        setRouteFormError("");
                      }}
                      className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white"
                      aria-label="ปิดฟอร์ม Route"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2 text-sm text-zinc-300">
                      ชื่อ Route
                      <input
                        type="text"
                        value={routeForm.name}
                        onChange={(event) =>
                          setRouteForm((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        placeholder="เช่น บ้าน → ที่ทำงาน"
                        className="w-full rounded-xl border border-white/10 bg-[#0C0C12] px-3 py-3 text-white outline-none focus:border-pink-500"
                      />
                    </label>
                    <label className="space-y-2 text-sm text-zinc-300">
                      ประเภท Route
                      <select
                        value={routeForm.type}
                        onChange={(event) =>
                          setRouteForm((current) => ({
                            ...current,
                            type: event.target.value as TravelRoute["type"],
                          }))
                        }
                        className="w-full rounded-xl border border-white/10 bg-[#0C0C12] px-3 py-3 text-white outline-none focus:border-pink-500"
                      >
                        <option value="OUTBOUND">OUTBOUND (ขาไป)</option>
                        <option value="RETURN">RETURN (ขากลับ)</option>
                      </select>
                    </label>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h5 className="font-semibold text-white">Segments</h5>
                        <p className="mt-1 text-xs text-zinc-500">ต้องมีอย่างน้อย 1 รายการ</p>
                      </div>
                      <button
                        type="button"
                        onClick={addRouteSegment}
                        className="rounded-lg border border-pink-500/30 px-3 py-2 text-xs text-pink-300 transition hover:bg-pink-500/10"
                      >
                        เพิ่ม Segment
                      </button>
                    </div>

                    {routeForm.segments.map((segment, index) => (
                      <div key={index} className="grid gap-2 sm:grid-cols-[1fr_150px_auto]">
                        <input
                          type="text"
                          value={segment.name}
                          onChange={(event) => updateRouteSegment(index, "name", event.target.value)}
                          placeholder="เช่น บ้าน → BTS"
                          aria-label={`ชื่อ Segment ${index + 1}`}
                          className="rounded-xl border border-white/10 bg-[#0C0C12] px-3 py-3 text-sm text-white outline-none focus:border-pink-500"
                        />
                        <input
                          type="number"
                          min={0}
                          step="1"
                          value={segment.cost}
                          onChange={(event) => updateRouteSegment(index, "cost", event.target.value)}
                          placeholder="200"
                          aria-label={`ค่าใช้จ่าย Segment ${index + 1}`}
                          className={numberInputClass}
                        />
                        <button
                          type="button"
                          onClick={() => removeRouteSegment(index)}
                          disabled={routeForm.segments.length <= 1}
                          className="rounded-xl border border-white/10 px-3 py-3 text-zinc-400 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-30"
                          aria-label={`ลบ Segment ${index + 1}`}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {routeFormError && (
                    <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                      {routeFormError}
                    </p>
                  )}

                  <div className="flex justify-end gap-2 border-t border-white/[0.07] pt-4">
                    <button
                      type="button"
                      onClick={() => setShowRouteForm(false)}
                      disabled={isSavingRoute}
                      className="rounded-xl border border-white/10 px-4 py-3 text-sm text-zinc-300 transition hover:bg-white/[0.05] disabled:opacity-50"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingRoute}
                      className="rounded-xl bg-pink-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-pink-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSavingRoute ? "กำลังบันทึก..." : "บันทึก Route"}
                    </button>
                  </div>
                </form>
              )}
            </section>

            {routeToDelete && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
                role="presentation"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget && !isDeletingRoute) {
                    setRouteToDelete(null);
                  }
                }}
              >
                <section
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="delete-route-title"
                  className="w-full max-w-md rounded-2xl border border-red-500/30 bg-[#15151D] p-6 shadow-2xl"
                >
                  <h3 id="delete-route-title" className="text-lg font-semibold text-white">
                    ยืนยันการลบ Route
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-300">
                    ต้องการลบ Route <span className="font-semibold text-pink-300">{routeToDelete.name}</span> หรือไม่
                  </p>
                  {routeDeleteError && (
                    <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                      {routeDeleteError}
                    </p>
                  )}
                  <div className="mt-6 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setRouteToDelete(null)}
                      disabled={isDeletingRoute}
                      className="rounded-xl border border-white/10 px-4 py-3 text-sm text-zinc-300 transition hover:bg-white/[0.05] disabled:opacity-50"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmDeleteRoute}
                      disabled={isDeletingRoute}
                      className="rounded-xl bg-red-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isDeletingRoute ? "กำลังลบ..." : "ลบ Route"}
                    </button>
                  </div>
                </section>
              </div>
            )}

            {/* Calendar */}
            <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#13131B]">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.07] px-5 py-5 sm:px-6">
                <div>
                  <h3 className="text-lg font-semibold">
                    {formatMonth(
                      selectedMonth.year,
                      selectedMonth.month
                    )}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-500">
                    {data.summary.totalDays} วันในเดือนนี้
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs text-zinc-400">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-pink-400" />
                    WORK
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
                    OFF
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-7 border-b border-white/[0.07]">
                {weekdayLabels.map((label) => (
                  <div
                    key={label}
                    className="py-3 text-center text-xs font-medium text-zinc-500 sm:text-sm"
                  >
                    {label}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {calendarCells.map((cell, index) => {
                  if (!cell) {
                    return (
                      <div
                        key={`blank-${index}`}
                        className="min-h-20 border-b border-r border-white/[0.05] bg-black/10 sm:min-h-28"
                      />
                    );
                  }

                  const record = cell.record;
                  const isWork = record?.status === "WORK";

                  return (
                    <div
                      onClick={() => handleSelectDay(record)}
                      key={cell.date}
                      className={`min-h-20 border-b border-r border-white/[0.05] p-1.5 transition sm:min-h-28 sm:p-3 ${
                        isWork
                          ? "bg-pink-500/[0.035] hover:bg-pink-500/[0.08]"
                          : "hover:bg-white/[0.035]"
                      } ${
                        record
                          ? "cursor-pointer"
                          : "cursor-default"
                      } ${
                        selectedDay?._id === record?._id
                          ? "ring-2 ring-inset ring-pink-400/70"
                          : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-medium sm:text-sm ${
                            isWork
                              ? "bg-pink-500/15 text-pink-300"
                              : "text-zinc-500"
                          }`}
                        >
                          {cell.dayNumber}
                        </span>

                        {record && (
                          <span
                            className={`hidden rounded-md px-1.5 py-1 text-[9px] font-semibold sm:inline-block ${
                              isWork
                                ? "bg-pink-500/10 text-pink-300"
                                : "bg-zinc-700/40 text-zinc-400"
                            }`}
                          >
                            {record.status}
                          </span>
                        )}
                      </div>

                      {record ? (
                        <div className="mt-2 sm:mt-4">
                          <p
                            className={`text-[10px] font-medium sm:text-sm ${
                              isWork
                                ? "text-zinc-100"
                                : "text-zinc-600"
                            }`}
                          >
                            {formatMoney(record.cost)}
                          </p>

                          {record.note && (
                            <p className="mt-1 hidden truncate text-xs text-zinc-500 sm:block">
                              {record.note}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="mt-3 text-[10px] text-zinc-600 sm:mt-4 sm:text-xs">
                          ไม่มีข้อมูล
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {selectedDay && (
              <section className="rounded-2xl border border-pink-500/20 bg-[#15151D] p-5 shadow-lg shadow-pink-950/10 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold tracking-[0.18em] text-pink-400">
                      DAY DETAIL
                    </p>
                    <h3 className="mt-2 text-xl font-bold text-white">
                      {selectedDay.date}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                        selectedDay.status === "WORK"
                          ? "bg-pink-500/15 text-pink-300"
                          : "bg-zinc-700/40 text-zinc-300"
                      }`}
                    >
                      {selectedDay.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditStatus(selectedDay.status);
                        setEditCost(
                          selectedDay.status === "OFF"
                            ? 0
                            : selectedDay.cost
                        );
                        setEditDayError("");
                        setEditDaySuccess("");
                        setIsEditingDay(true);
                      }}
                      className="rounded-lg border border-pink-500/30 px-3 py-1.5 text-xs font-semibold text-pink-300 transition hover:bg-pink-500/10"
                    >
                      แก้ไข
                    </button>
                  </div>
                </div>

                {isEditingDay && (
                  <form
                    onSubmit={handleSaveDay}
                    className="mt-5 space-y-4 rounded-xl border border-pink-500/20 bg-pink-500/[0.04] p-4"
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="space-y-2 text-sm text-zinc-300">
                        สถานะ
                        <select
                          value={editStatus}
                          onChange={(event) => {
                            const nextStatus = event.target.value as TravelDay["status"];
                            setEditStatus(nextStatus);
                            if (nextStatus === "OFF") {
                              setEditCost(0);
                            }
                          }}
                          className="w-full rounded-xl border border-white/10 bg-[#0C0C12] px-3 py-3 text-white outline-none focus:border-pink-500"
                        >
                          <option value="WORK">WORK</option>
                          <option value="OFF">OFF</option>
                        </select>
                      </label>

                      <label className="space-y-2 text-sm text-zinc-300">
                        ค่าเดินทาง (บาท)
                        <input
                          type="number"
                          min={0}
                          step="1"
                          placeholder="200"
                          value={editStatus === "OFF" ? "0" : editCost}
                          onChange={(event) =>
                            setEditCost(
                              event.target.value === ""
                                ? ""
                                : Number(event.target.value)
                            )
                          }
                          disabled={editStatus === "OFF"}
                          className={`${numberInputClass} disabled:cursor-not-allowed disabled:opacity-50`}
                        />
                        {editStatus === "WORK" && (
                          <p className="text-xs text-zinc-500">
                            พิมพ์ตัวเลขได้โดยตรง
                          </p>
                        )}
                      </label>
                    </div>

                    {editDayError && (
                      <p className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                        {editDayError}
                      </p>
                    )}

                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingDay(false);
                          setEditDayError("");
                        }}
                        disabled={isSavingDay}
                        className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-zinc-300 transition hover:bg-white/[0.05] disabled:opacity-50"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingDay}
                        className="rounded-lg bg-pink-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-pink-400 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSavingDay ? "กำลังบันทึก..." : "บันทึก"}
                      </button>
                    </div>
                  </form>
                )}

                {editDaySuccess && !isEditingDay && (
                  <p className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                    {editDaySuccess}
                  </p>
                )}

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                    <p className="text-xs text-zinc-500">สถานะ</p>
                    <p className="mt-2 font-semibold text-white">
                      {selectedDay.status === "WORK"
                        ? "วันทำงาน"
                        : "วันหยุด"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                    <p className="text-xs text-zinc-500">
                      ค่าเดินทาง
                    </p>
                    {selectedDay.status === "WORK" ? (
                      <p className="mt-2 text-lg font-semibold text-pink-300">
                        {formatMoney(selectedDay.cost)}
                      </p>
                    ) : (
                      <p className="mt-2 font-semibold text-zinc-400">
                        ไม่มีค่าเดินทาง
                      </p>
                    )}
                  </div>
                </div>
              </section>
            )}

            <p className="text-center text-xs text-zinc-600">
              เลือกเดือนด้านบนเพื่อดูปฏิทินและสรุปค่าเดินทางของเดือนอื่น
            </p>
          </>
        )}
        </>
        )}
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#15151D] p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">{label}</p>
        <span className="text-zinc-500">{icon}</span>
      </div>
      <p className="mt-4 text-2xl font-bold text-white">{value}</p>
      <p className="mt-2 text-xs text-zinc-500">{detail}</p>
    </div>
  );
}
