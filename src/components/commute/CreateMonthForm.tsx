import { Plus, X } from "lucide-react";
import type { FormEvent } from "react";

interface CreateMonthFormProps {
  createYear: number | "";
  createMonth: number;
  createDailyCost: number | "";
  createWorkDays: number[];
  createOffDates: string[];
  offDateInput: string;
  createError: string;
  isCreatingMonth: boolean;
  numberInputClass: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  onYearChange: (year: number | "") => void;
  onMonthChange: (month: number) => void;
  onDailyCostChange: (cost: number | "") => void;
  onToggleWorkDay: (day: number, checked: boolean) => void;
  onOffDateInputChange: (value: string) => void;
  onAddOffDate: () => void;
  onRemoveOffDate: (date: string) => void;
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

export default function CreateMonthForm({
  createYear,
  createMonth,
  createDailyCost,
  createWorkDays,
  createOffDates,
  offDateInput,
  createError,
  isCreatingMonth,
  numberInputClass,
  onSubmit,
  onClose,
  onYearChange,
  onMonthChange,
  onDailyCostChange,
  onToggleWorkDay,
  onOffDateInputChange,
  onAddOffDate,
  onRemoveOffDate,
}: CreateMonthFormProps) {
  const monthPrefix =
    createYear === ""
      ? undefined
      : `${createYear}-${String(createMonth).padStart(2, "0")}`;
  const lastDay =
    createYear === ""
      ? undefined
      : new Date(Number(createYear), createMonth, 0).getDate();

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-6 rounded-2xl border border-pink-500/20 bg-[#15151D] p-5 sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-pink-400">NEW MONTH</p>
          <h3 className="mt-1 text-xl font-bold text-white">สร้างเดือนใหม่</h3>
          <p className="mt-1 text-sm text-zinc-500">ตั้งค่าการเดินทางสำหรับเดือนนี้</p>
        </div>

        <button
          type="button"
          onClick={onClose}
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
              onYearChange(
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
            onChange={(event) => onMonthChange(Number(event.target.value))}
            className="w-full rounded-xl border border-white/10 bg-[#0C0C12] px-3 py-3 text-white outline-none focus:border-pink-500"
          >
            {Array.from({ length: 12 }, (_, index) => index + 1).map(
              (monthNumber) => (
                <option key={monthNumber} value={monthNumber}>
                  {new Intl.DateTimeFormat("th-TH", {
                    month: "long",
                    timeZone: "UTC",
                  }).format(new Date(Date.UTC(2026, monthNumber - 1, 1)))}
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
              onDailyCostChange(
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
          <h4 className="font-semibold text-white">วันทำงานประจำสัปดาห์</h4>
          <p className="mt-1 text-xs text-zinc-500">เลือกวันทำงานของเดือนนี้</p>
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
          <p className="mt-1 text-xs text-zinc-500">
            วันที่เลือกจะเป็น OFF แม้ตรงกับวันทำงานประจำ
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="date"
            value={offDateInput}
            min={monthPrefix ? `${monthPrefix}-01` : undefined}
            max={
              monthPrefix && lastDay !== undefined
                ? `${monthPrefix}-${String(lastDay).padStart(2, "0")}`
                : undefined
            }
            onChange={(event) => onOffDateInputChange(event.target.value)}
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#0C0C12] px-3 py-3 text-sm text-white outline-none focus:border-pink-500"
          />
          <button
            type="button"
            onClick={onAddOffDate}
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

      {createError && (
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
          {createError}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-2 border-t border-white/[0.07] pt-4">
        <button
          type="button"
          onClick={onClose}
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
  );
}
