"use client";

import {
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
  History,
  LayoutDashboard,
} from "lucide-react";
import {
  calculateSelectedRoutesCost,
} from "@/lib/calculations";
import {
  getMonthDatePrefix,
  getTravelDayCost,
  isValidDateString,
  prepareCreateMonthPayload,
  prepareMonthSettingsPayload,
  validateCreateMonthInput,
  validateMonthSettingsInput,
  validateTravelDayCost,
  type MonthSettingsPayload,
} from "@/lib/form-validation";
import MonthSettings from "@/components/commute/MonthSettings";
import CalendarSection, {
  type TravelDay,
} from "@/components/commute/CalendarSection";
import DayDetailPanel from "@/components/commute/DayDetailPanel";
import CreateMonthForm from "@/components/commute/CreateMonthForm";
import { useTravelRoutes } from "@/hooks/useTravelRoutes";
import TravelRouteManager from "@/components/commute/TravelRouteManager";
import type { TravelRoute, TravelRouteForm } from "@/lib/route-types";
import MonthlyHistory, {
  type MonthlyHistoryItem,
} from "@/components/commute/MonthlyHistory";
interface MonthItem {
  _id: string;
  year: number;
  month: number;
  defaultDailyCost: number;
  workDays?: number[];
  offDates?: string[];
  selectedOutboundRouteId?: string | null;
  selectedReturnRouteId?: string | null;
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

async function readJson<T>(response: Response): Promise<T | null> {
  const text = await response.text();

  if (!text.trim()) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

async function fetchMonthDetail(
  monthId: string,
  signal?: AbortSignal
): Promise<MonthDetail> {
  const response = await fetch(`/api/months/${monthId}`, { signal });
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
const [settingsOutboundRouteId, setSettingsOutboundRouteId] = useState<string | null>(null);
const [settingsReturnRouteId, setSettingsReturnRouteId] = useState<string | null>(null);
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

  const {
    routes,
    routesByType,
    routesLoading,
    routesError,
    loadRoutes,
  } = useTravelRoutes();



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
    const controller = new AbortController();

    async function loadMonth() {
      setLoading(true);
      setError("");
      setData(null);

      try {
        const result = await fetchMonthDetail(selectedMonthId, controller.signal);

        if (active) setData(result);
      } catch (err) {
        if (active && !controller.signal.aborted) {
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
      controller.abort();
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
  const selectedSettingsOutboundRoute = routes.find(
    (route) => route._id === settingsOutboundRouteId && route.type === "OUTBOUND"
  );
  const selectedSettingsReturnRoute = routes.find(
    (route) => route._id === settingsReturnRouteId && route.type === "RETURN"
  );
  const settingsRouteCost = calculateSelectedRoutesCost(
    selectedSettingsOutboundRoute,
    selectedSettingsReturnRoute
  );

  function openSettings() {
    if (!selectedMonth) return;

    setSettingsDailyCost(selectedMonth.defaultDailyCost);
    setSettingsWorkDays([...(selectedMonth.workDays ?? [])]);
    setSettingsOffDates([...(selectedMonth.offDates ?? [])]);
    setSettingsOutboundRouteId(selectedMonth.selectedOutboundRouteId ?? null);
    setSettingsReturnRouteId(selectedMonth.selectedReturnRouteId ?? null);
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

    const monthPrefix = getMonthDatePrefix(selectedMonth);

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

    if (!selectedMonthId || !selectedMonth) {
      setSettingsError("ยังไม่ได้เลือกเดือน");
      setIsSavingSettings(false);
      return;
    }

    const validationError = validateMonthSettingsInput(
      {
        defaultDailyCost: settingsDailyCost,
        workDays: settingsWorkDays,
        offDates: settingsOffDates,
        selectedOutboundRouteId: settingsOutboundRouteId,
        selectedReturnRouteId: settingsReturnRouteId,
      },
      selectedMonth
    );

    if (validationError) {
      setSettingsError(validationError);
      setIsSavingSettings(false);
      return;
    }

    const payload = prepareMonthSettingsPayload({
      defaultDailyCost: settingsDailyCost,
      workDays: settingsWorkDays,
      offDates: settingsOffDates,
      selectedOutboundRouteId: settingsOutboundRouteId,
      selectedReturnRouteId: settingsReturnRouteId,
    });

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
      setSettingsOutboundRouteId(
        refreshedData.month.selectedOutboundRouteId ?? null
      );
      setSettingsReturnRouteId(
        refreshedData.month.selectedReturnRouteId ?? null
      );
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

    const validationError = validateTravelDayCost(editStatus, editCost);

    if (validationError) {
      setEditDayError(validationError);
      return;
    }

    const nextCost = getTravelDayCost(editStatus, editCost);

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

  const monthPrefix = getMonthDatePrefix({
    year: createYear,
    month: createMonth,
  });

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

  const validationError = validateCreateMonthInput({
    year: createYear,
    month: createMonth,
    defaultDailyCost: createDailyCost,
    workDays: createWorkDays,
    offDates: createOffDates,
  });

  if (validationError) {
    setCreateError(validationError);
    return;
  }

  const createPayload = prepareCreateMonthPayload({
    year: createYear,
    month: createMonth,
    defaultDailyCost: createDailyCost,
    workDays: createWorkDays,
    offDates: createOffDates,
  });

  setIsCreatingMonth(true);

  try {
    const response = await fetch("/api/months", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(createPayload),
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
          workDays: createPayload.workDays,
          offDates: createPayload.offDates,
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
          <MonthlyHistory
            history={history}
            historyLoading={historyLoading}
            historyError={historyError}
            historyYear={historyYear}
            historyYears={historyYears}
            filteredHistory={filteredHistory}
            months={months}
            onHistoryYearChange={setHistoryYear}
            onOpenCalendar={(monthId) => {
              const isSameMonth = monthId === selectedMonthId;

              setSelectedDay(null);
              setIsEditingDay(false);
              setShowSettings(false);
              setEditDaySuccess("");
              setViewMode("dashboard");

              if (isSameMonth) {
                setReloadKey((current) => current + 1);
              } else {
                setSelectedMonthId(monthId);
              }
            }}
          />
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
  <CreateMonthForm
    createYear={createYear}
    createMonth={createMonth}
    createDailyCost={createDailyCost}
    createWorkDays={createWorkDays}
    createOffDates={createOffDates}
    offDateInput={offDateInput}
    createError={createError}
    isCreatingMonth={isCreatingMonth}
    numberInputClass={numberInputClass}
    onSubmit={handleCreateMonth}
    onClose={() => setShowCreateForm(false)}
    onYearChange={setCreateYear}
    onMonthChange={setCreateMonth}
    onDailyCostChange={setCreateDailyCost}
    onToggleWorkDay={(day, checked) => {
      setCreateWorkDays((current) =>
        checked
          ? [...current, day].sort((a, b) => a - b)
          : current.filter((value) => value !== day)
      );
    }}
    onOffDateInputChange={setOffDateInput}
    onAddOffDate={addOffDate}
    onRemoveOffDate={(date) =>
      setCreateOffDates((current) =>
        current.filter((item) => item !== date)
      )
    }
  />
)}
        {showSettings && selectedMonth && (
          <MonthSettings
            selectedMonth={selectedMonth}
            routes={routes}
            settingsDailyCost={settingsDailyCost}
            settingsWorkDays={settingsWorkDays}
            settingsOffDates={settingsOffDates}
            settingsOutboundRouteId={settingsOutboundRouteId}
            settingsReturnRouteId={settingsReturnRouteId}
            settingsOffDateInput={settingsOffDateInput}
            settingsRouteCost={settingsRouteCost}
            settingsError={settingsError}
            settingsSuccess={settingsSuccess}
            isSavingSettings={isSavingSettings}
            showRegenerateConfirmation={showRegenerateConfirmation}
            hasPendingSettingsPayload={Boolean(pendingSettingsPayload)}
            numberInputClass={numberInputClass}
            onSubmit={handleSaveSettings}
            onCancel={cancelSettings}
            onDailyCostChange={setSettingsDailyCost}
            onOutboundRouteChange={setSettingsOutboundRouteId}
            onReturnRouteChange={setSettingsReturnRouteId}
            onToggleWorkDay={(day, checked) => {
              setSettingsWorkDays((current) =>
                checked
                  ? [...current, day].sort((a, b) => a - b)
                  : current.filter((value) => value !== day)
              );
            }}
            onOffDateInputChange={setSettingsOffDateInput}
            onAddOffDate={addSettingsOffDate}
            onRemoveOffDate={(date) =>
              setSettingsOffDates((current) =>
                current.filter((item) => item !== date)
              )
            }
            onCancelRegenerateConfirmation={cancelRegenerateConfirmation}
            onConfirmRegenerate={handleConfirmRegenerate}
          />
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

            <TravelRouteManager
              routes={routes}
              routesByType={routesByType}
              routesLoading={routesLoading}
              routesError={routesError}
              routeFormSuccess={routeFormSuccess}
              showRouteForm={showRouteForm}
              editingRouteId={editingRouteId}
              routeForm={routeForm}
              routeFormError={routeFormError}
              isSavingRoute={isSavingRoute}
              routeToDelete={routeToDelete}
              isDeletingRoute={isDeletingRoute}
              routeDeleteError={routeDeleteError}
              numberInputClass={numberInputClass}
              onCreateRoute={openCreateRouteForm}
              onEditRoute={openEditRouteForm}
              onRequestDelete={(route) => {
                setRouteDeleteError("");
                setRouteToDelete(route);
              }}
              onSubmit={handleRouteSubmit}
              onCloseForm={() => {
                setShowRouteForm(false);
                setRouteFormError("");
              }}
              onRouteNameChange={(name) =>
                setRouteForm((current) => ({ ...current, name }))
              }
              onRouteTypeChange={(type) =>
                setRouteForm((current) => ({ ...current, type }))
              }
              onAddSegment={addRouteSegment}
              onUpdateSegment={updateRouteSegment}
              onRemoveSegment={removeRouteSegment}
              onCloseDelete={() => setRouteToDelete(null)}
              onConfirmDelete={handleConfirmDeleteRoute}
            />

            <CalendarSection
              month={selectedMonth}
              totalDays={data.summary.totalDays}
              calendarCells={calendarCells}
              selectedDay={selectedDay}
              onSelectDay={handleSelectDay}
            />

            {selectedDay && (
              <DayDetailPanel
                selectedDay={selectedDay}
                isEditingDay={isEditingDay}
                editStatus={editStatus}
                editCost={editCost}
                isSavingDay={isSavingDay}
                editDayError={editDayError}
                editDaySuccess={editDaySuccess}
                numberInputClass={numberInputClass}
                onStartEditing={() => {
                  setEditStatus(selectedDay.status);
                  setEditCost(
                    selectedDay.status === "OFF" ? 0 : selectedDay.cost
                  );
                  setEditDayError("");
                  setEditDaySuccess("");
                  setIsEditingDay(true);
                }}
                onSubmit={handleSaveDay}
                onStatusChange={(status) => {
                  setEditStatus(status);
                  if (status === "OFF") setEditCost(0);
                }}
                onCostChange={setEditCost}
                onCancelEditing={() => {
                  setIsEditingDay(false);
                  setEditDayError("");
                }}
              />
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
