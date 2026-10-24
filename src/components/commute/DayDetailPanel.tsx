import type { FormEvent } from "react";

import type { TravelDay } from "@/components/commute/CalendarSection";

interface DayDetailPanelProps {
  selectedDay: TravelDay;
  isEditingDay: boolean;
  editStatus: TravelDay["status"];
  editCost: number | "";
  isSavingDay: boolean;
  editDayError: string;
  editDaySuccess: string;
  numberInputClass: string;
  onStartEditing: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onStatusChange: (status: TravelDay["status"]) => void;
  onCostChange: (cost: number | "") => void;
  onCancelEditing: () => void;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function DayDetailPanel({
  selectedDay,
  isEditingDay,
  editStatus,
  editCost,
  isSavingDay,
  editDayError,
  editDaySuccess,
  numberInputClass,
  onStartEditing,
  onSubmit,
  onStatusChange,
  onCostChange,
  onCancelEditing,
}: DayDetailPanelProps) {
  return (
    <section className="rounded-2xl border border-pink-500/20 bg-[#15151D] p-5 shadow-lg shadow-pink-950/10 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-pink-400">
            DAY DETAIL
          </p>
          <h3 className="mt-2 text-xl font-bold text-white">{selectedDay.date}</h3>
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
            onClick={onStartEditing}
            className="rounded-lg border border-pink-500/30 px-3 py-1.5 text-xs font-semibold text-pink-300 transition hover:bg-pink-500/10"
          >
            แก้ไข
          </button>
        </div>
      </div>

      {isEditingDay && (
        <form
          onSubmit={onSubmit}
          className="mt-5 space-y-4 rounded-xl border border-pink-500/20 bg-pink-500/[0.04] p-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-zinc-300">
              สถานะ
              <select
                value={editStatus}
                onChange={(event) =>
                  onStatusChange(event.target.value as TravelDay["status"])
                }
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
                  onCostChange(
                    event.target.value === ""
                      ? ""
                      : Number(event.target.value)
                  )
                }
                disabled={editStatus === "OFF"}
                className={`${numberInputClass} disabled:cursor-not-allowed disabled:opacity-50`}
              />
              {editStatus === "WORK" && (
                <p className="text-xs text-zinc-500">พิมพ์ตัวเลขได้โดยตรง</p>
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
              onClick={onCancelEditing}
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
            {selectedDay.status === "WORK" ? "วันทำงาน" : "วันหยุด"}
          </p>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
          <p className="text-xs text-zinc-500">ค่าเดินทาง</p>
          {selectedDay.status === "WORK" ? (
            <p className="mt-2 text-lg font-semibold text-pink-300">
              {formatMoney(selectedDay.cost)}
            </p>
          ) : (
            <p className="mt-2 font-semibold text-zinc-400">ไม่มีค่าเดินทาง</p>
          )}
        </div>
      </div>
    </section>
  );
}
