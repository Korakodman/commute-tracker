export interface TravelDay {
  _id: string;
  monthId: string;
  date: string;
  status: "WORK" | "OFF";
  cost: number;
  note?: string;
}

export interface CalendarMonth {
  year: number;
  month: number;
}

export interface CalendarCell {
  dayNumber: number;
  date: string;
  record?: TravelDay;
}

interface CalendarSectionProps {
  month: CalendarMonth;
  totalDays: number;
  calendarCells: Array<CalendarCell | null>;
  selectedDay: TravelDay | null;
  onSelectDay: (record: TravelDay | undefined) => void;
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

export default function CalendarSection({
  month,
  totalDays,
  calendarCells,
  selectedDay,
  onSelectDay,
}: CalendarSectionProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#13131B]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.07] px-5 py-5 sm:px-6">
        <div>
          <h3 className="text-lg font-semibold">
            {formatMonth(month.year, month.month)}
          </h3>
          <p className="mt-1 text-sm text-zinc-500">{totalDays} วันในเดือนนี้</p>
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
              onClick={() => onSelectDay(record)}
              key={cell.date}
              className={`min-h-20 border-b border-r border-white/[0.05] p-1.5 transition sm:min-h-28 sm:p-3 ${
                isWork
                  ? "bg-pink-500/[0.035] hover:bg-pink-500/[0.08]"
                  : "hover:bg-white/[0.035]"
              } ${record ? "cursor-pointer" : "cursor-default"} ${
                selectedDay?._id === record?._id
                  ? "ring-2 ring-inset ring-pink-400/70"
                  : ""
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-medium sm:text-sm ${
                    isWork ? "bg-pink-500/15 text-pink-300" : "text-zinc-500"
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
                      isWork ? "text-zinc-100" : "text-zinc-600"
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
  );
}
