import { X } from "lucide-react";
import type { FormEvent } from "react";

import { calculateRouteCost } from "@/lib/calculations";
import type { TravelRoute } from "@/components/commute/TravelRouteManager";

export interface MonthSettingsMonth {
  year: number;
  month: number;
  defaultDailyCost: number;
  workDays?: number[];
  offDates?: string[];
  selectedOutboundRouteId?: string | null;
  selectedReturnRouteId?: string | null;
}

interface WorkDayOption {
  value: number;
  label: string;
}

interface MonthSettingsProps {
  selectedMonth: MonthSettingsMonth;
  routes: TravelRoute[];
  settingsDailyCost: number | "";
  settingsWorkDays: number[];
  settingsOffDates: string[];
  settingsOutboundRouteId: string | null;
  settingsReturnRouteId: string | null;
  settingsOffDateInput: string;
  settingsRouteCost: number | undefined;
  settingsError: string;
  settingsSuccess: string;
  isSavingSettings: boolean;
  showRegenerateConfirmation: boolean;
  hasPendingSettingsPayload: boolean;
  numberInputClass: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  onDailyCostChange: (value: number | "") => void;
  onOutboundRouteChange: (routeId: string | null) => void;
  onReturnRouteChange: (routeId: string | null) => void;
  onToggleWorkDay: (day: number, checked: boolean) => void;
  onOffDateInputChange: (value: string) => void;
  onAddOffDate: () => void;
  onRemoveOffDate: (date: string) => void;
  onCancelRegenerateConfirmation: () => void;
  onConfirmRegenerate: () => void;
}

const settingsWorkDayOptions: WorkDayOption[] = [
  { value: 1, label: "จันทร์" },
  { value: 2, label: "อังคาร" },
  { value: 3, label: "พุธ" },
  { value: 4, label: "พฤหัสบดี" },
  { value: 5, label: "ศุกร์" },
  { value: 6, label: "เสาร์" },
  { value: 0, label: "อาทิตย์" },
];

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

export default function MonthSettings({
  selectedMonth,
  routes,
  settingsDailyCost,
  settingsWorkDays,
  settingsOffDates,
  settingsOutboundRouteId,
  settingsReturnRouteId,
  settingsOffDateInput,
  settingsRouteCost,
  settingsError,
  settingsSuccess,
  isSavingSettings,
  showRegenerateConfirmation,
  hasPendingSettingsPayload,
  numberInputClass,
  onSubmit,
  onCancel,
  onDailyCostChange,
  onOutboundRouteChange,
  onReturnRouteChange,
  onToggleWorkDay,
  onOffDateInputChange,
  onAddOffDate,
  onRemoveOffDate,
  onCancelRegenerateConfirmation,
  onConfirmRegenerate,
}: MonthSettingsProps) {
  const monthPrefix = `${selectedMonth.year}-${String(selectedMonth.month).padStart(2, "0")}`;
  const lastDay = new Date(selectedMonth.year, selectedMonth.month, 0).getDate();

  return (
    <>
      <form
        onSubmit={onSubmit}
        className="space-y-6 rounded-2xl border border-pink-500/20 bg-[#15151D] p-5 sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-pink-400">MONTH SETTINGS</p>
            <h3 className="mt-1 text-xl font-bold text-white">
              ตั้งค่าเดือน {formatMonth(selectedMonth.year, selectedMonth.month)}
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              แก้ไขค่าเดินทาง วันทำงาน และวันหยุดพิเศษ
            </p>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white"
            aria-label="ปิดการตั้งค่าเดือน"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm text-zinc-300">
            Route ขาไป (OUTBOUND)
            <select
              value={settingsOutboundRouteId ?? ""}
              onChange={(event) => onOutboundRouteChange(event.target.value || null)}
              className="w-full rounded-xl border border-white/10 bg-[#0C0C12] px-3 py-3 text-white outline-none focus:border-pink-500"
            >
              <option value="">ไม่ใช้ Route ขาไป</option>
              {routes.filter((route) => route.type === "OUTBOUND").map((route) => (
                <option key={route._id} value={route._id}>
                  {route.name} ({formatMoney(calculateRouteCost(route.segments))})
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm text-zinc-300">
            Route ขากลับ (RETURN)
            <select
              value={settingsReturnRouteId ?? ""}
              onChange={(event) => onReturnRouteChange(event.target.value || null)}
              className="w-full rounded-xl border border-white/10 bg-[#0C0C12] px-3 py-3 text-white outline-none focus:border-pink-500"
            >
              <option value="">ไม่ใช้ Route ขากลับ</option>
              {routes.filter((route) => route.type === "RETURN").map((route) => (
                <option key={route._id} value={route._id}>
                  {route.name} ({formatMoney(calculateRouteCost(route.segments))})
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="rounded-xl border border-pink-500/20 bg-pink-500/[0.06] p-4 text-sm">
          <p className="text-zinc-400">ค่าเริ่มต้นของวัน WORK</p>
          <p className="mt-1 text-xl font-semibold text-pink-300">
            {formatMoney(settingsRouteCost ?? (Number(settingsDailyCost) || 0))}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {settingsRouteCost === undefined
              ? "ยังไม่ได้เลือก Route ใช้ค่าเดินทางเริ่มต้นของเดือน"
              : "คำนวณจาก Route ที่เลือกเท่านั้น"}
          </p>
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
              onDailyCostChange(
                event.target.value === "" ? "" : Number(event.target.value)
              )
            }
            className={numberInputClass}
          />
          <p className="text-xs text-zinc-500">พิมพ์ตัวเลขได้โดยตรง</p>
        </label>

        <div className="space-y-3">
          <div>
            <h4 className="font-semibold text-white">วันทำงานประจำสัปดาห์</h4>
            <p className="mt-1 text-xs text-zinc-500">ต้องเลือกอย่างน้อย 1 วัน</p>
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
                    onChange={(event) => onToggleWorkDay(day.value, event.target.checked)}
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
            <h4 className="font-semibold text-white">วันหยุดพิเศษ</h4>
            <p className="mt-1 text-xs text-zinc-500">วันที่ต้องอยู่ในเดือนที่กำลังเลือก</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="date"
              value={settingsOffDateInput}
              min={`${monthPrefix}-01`}
              max={`${monthPrefix}-${String(lastDay).padStart(2, "0")}`}
              onChange={(event) => onOffDateInputChange(event.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#0C0C12] px-3 py-3 text-sm text-white outline-none focus:border-pink-500"
            />
            <button
              type="button"
              onClick={onAddOffDate}
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
                    onClick={() => onRemoveOffDate(date)}
                    className="text-zinc-500 transition hover:text-pink-400"
                    aria-label={`ลบวันหยุด ${date}`}
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-500">ยังไม่มีวันหยุดพิเศษ</p>
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
            onClick={onCancel}
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

      {showRegenerateConfirmation && hasPendingSettingsPayload && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onCancelRegenerateConfirmation();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="regenerate-confirmation-title"
            className="w-full max-w-md rounded-2xl border border-pink-500/30 bg-[#15151D] p-6 shadow-2xl"
          >
            <h3 id="regenerate-confirmation-title" className="text-lg font-semibold text-white">
              ยืนยันการสร้างปฏิทินใหม่
            </h3>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              การบันทึก Settings จะลบและสร้างข้อมูล TravelDay ของเดือนนี้ใหม่
              ข้อมูลค่าใช้จ่ายรายวันที่แก้เองอาจถูกเขียนทับ ต้องการดำเนินการต่อหรือไม่
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={onCancelRegenerateConfirmation}
                disabled={isSavingSettings}
                autoFocus
                className="rounded-xl border border-white/10 px-4 py-3 text-sm text-zinc-300 transition hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={onConfirmRegenerate}
                disabled={isSavingSettings}
                className="rounded-xl bg-pink-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-pink-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSavingSettings ? "กำลังสร้างใหม่..." : "สร้างใหม่"}
              </button>
            </div>
          </section>
        </div>
      )}

    </>
  );
}
