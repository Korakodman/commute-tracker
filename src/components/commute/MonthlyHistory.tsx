import { Eye, History } from "lucide-react";

import type { MonthlyHistoryItem } from "@/lib/month-history-types";

export type { MonthlyHistoryItem } from "@/lib/month-history-types";

interface MonthLookupItem {
  _id: string;
  year: number;
  month: number;
}

interface MonthlyHistoryProps {
  history: MonthlyHistoryItem[];
  historyLoading: boolean;
  historyError: string;
  historyYear: string;
  historyYears: number[];
  filteredHistory: MonthlyHistoryItem[];
  months: MonthLookupItem[];
  onHistoryYearChange: (year: string) => void;
  onOpenCalendar: (monthId: string) => void;
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

export default function MonthlyHistory({
  history,
  historyLoading,
  historyError,
  historyYear,
  historyYears,
  filteredHistory,
  months,
  onHistoryYearChange,
  onOpenCalendar,
}: MonthlyHistoryProps) {
  return (
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
              onChange={(event) => onHistoryYearChange(event.target.value)}
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
              (month) => month.year === item.year && month.month === item.month
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
                        if (matchingMonth) onOpenCalendar(matchingMonth._id);
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
  );
}
