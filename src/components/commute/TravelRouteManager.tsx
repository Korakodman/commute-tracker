import { Plus, X } from "lucide-react";
import type { FormEvent } from "react";

import { calculateRouteCost } from "@/lib/calculations";
import type { TravelRoute, TravelRouteForm } from "@/lib/route-types";

interface TravelRouteManagerProps {
  routes: TravelRoute[];
  routesByType: Record<TravelRoute["type"], TravelRoute[]>;
  routesLoading: boolean;
  routesError: string;
  routeFormSuccess: string;
  showRouteForm: boolean;
  editingRouteId: string | null;
  routeForm: TravelRouteForm;
  routeFormError: string;
  isSavingRoute: boolean;
  routeToDelete: TravelRoute | null;
  isDeletingRoute: boolean;
  routeDeleteError: string;
  numberInputClass: string;
  onCreateRoute: () => void;
  onEditRoute: (route: TravelRoute) => void;
  onRequestDelete: (route: TravelRoute) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCloseForm: () => void;
  onRouteNameChange: (name: string) => void;
  onRouteTypeChange: (type: TravelRoute["type"]) => void;
  onAddSegment: () => void;
  onUpdateSegment: (index: number, field: "name" | "cost", value: string) => void;
  onRemoveSegment: (index: number) => void;
  onCloseDelete: () => void;
  onConfirmDelete: () => void;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function TravelRouteManager({
  routes,
  routesByType,
  routesLoading,
  routesError,
  routeFormSuccess,
  showRouteForm,
  editingRouteId,
  routeForm,
  routeFormError,
  isSavingRoute,
  routeToDelete,
  isDeletingRoute,
  routeDeleteError,
  numberInputClass,
  onCreateRoute,
  onEditRoute,
  onRequestDelete,
  onSubmit,
  onCloseForm,
  onRouteNameChange,
  onRouteTypeChange,
  onAddSegment,
  onUpdateSegment,
  onRemoveSegment,
  onCloseDelete,
  onConfirmDelete,
}: TravelRouteManagerProps) {
  return (
    <>
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
            onClick={onCreateRoute}
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
                            <span className="min-w-0 truncate text-zinc-300">{segment.name}</span>
                            <span className="shrink-0 text-zinc-400">{formatMoney(segment.cost)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => onEditRoute(route)}
                          className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 transition hover:bg-white/[0.06]"
                        >
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={() => onRequestDelete(route)}
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
          <form onSubmit={onSubmit} className="space-y-5 rounded-xl border border-pink-500/20 bg-[#15151D] p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-pink-400">{editingRouteId ? "EDIT ROUTE" : "NEW ROUTE"}</p>
                <h4 className="mt-1 font-semibold text-white">
                  {editingRouteId ? "แก้ไขเส้นทาง" : "สร้างเส้นทางใหม่"}
                </h4>
              </div>
              <button
                type="button"
                onClick={onCloseForm}
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
                  onChange={(event) => onRouteNameChange(event.target.value)}
                  placeholder="เช่น บ้าน → ที่ทำงาน"
                  className="w-full rounded-xl border border-white/10 bg-[#0C0C12] px-3 py-3 text-white outline-none focus:border-pink-500"
                />
              </label>
              <label className="space-y-2 text-sm text-zinc-300">
                ประเภท Route
                <select
                  value={routeForm.type}
                  onChange={(event) => onRouteTypeChange(event.target.value as TravelRoute["type"])}
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
                  onClick={onAddSegment}
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
                    onChange={(event) => onUpdateSegment(index, "name", event.target.value)}
                    placeholder="เช่น บ้าน → BTS"
                    aria-label={`ชื่อ Segment ${index + 1}`}
                    className="rounded-xl border border-white/10 bg-[#0C0C12] px-3 py-3 text-sm text-white outline-none focus:border-pink-500"
                  />
                  <input
                    type="number"
                    min={0}
                    step="1"
                    value={segment.cost}
                    onChange={(event) => onUpdateSegment(index, "cost", event.target.value)}
                    placeholder="200"
                    aria-label={`ค่าใช้จ่าย Segment ${index + 1}`}
                    className={numberInputClass}
                  />
                  <button
                    type="button"
                    onClick={() => onRemoveSegment(index)}
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
                onClick={onCloseForm}
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
            if (event.target === event.currentTarget && !isDeletingRoute) onCloseDelete();
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
                onClick={onCloseDelete}
                disabled={isDeletingRoute}
                className="rounded-xl border border-white/10 px-4 py-3 text-sm text-zinc-300 transition hover:bg-white/[0.05] disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={onConfirmDelete}
                disabled={isDeletingRoute}
                className="rounded-xl bg-red-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeletingRoute ? "กำลังลบ..." : "ลบ Route"}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
