"use client";

import { SectionCard } from "@/components/SectionCard";
import { StatusBadge } from "@/components/StatusBadge";
import { STATUS_OPTIONS } from "@/lib/constants";
import { joinText } from "@/lib/utils";
import type { OrderRecord, OrderStatus } from "@/lib/types";

type NeedsCheckListProps = {
  orders: OrderRecord[];
  onStatusChange: (id: string, status: OrderStatus) => void;
};

function getChecklistReasons(order: OrderRecord) {
  const reasons: string[] = [];

  if (!order.item_name) reasons.push("품명 누락");
  if (!order.quantity || order.quantity === 0) reasons.push("수량 누락");
  if (!order.customer) reasons.push("거래처 누락");
  if (!order.width) reasons.push("가로 누락");
  if (!order.height) reasons.push("세로 누락");
  if (order.status === "확인필요") reasons.push("상태 확인필요");

  return reasons;
}

export function NeedsCheckList({ orders, onStatusChange }: NeedsCheckListProps) {
  const checklistOrders = orders
    .map((order) => ({ order, reasons: getChecklistReasons(order) }))
    .filter((entry) => entry.reasons.length > 0);

  return (
    <SectionCard
      title="체크리스트"
      description="누락 규격이나 확인필요 상태가 있는 주문을 별도로 점검하는 화면입니다."
    >
      <div className="space-y-4">
        {!checklistOrders.length ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
            현재 체크가 필요한 주문이 없습니다.
          </div>
        ) : (
          checklistOrders.map(({ order, reasons }) => (
            <article key={order.id} className="rounded-2xl border border-black/5 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--primary)]">{order.customer}</p>
                  <h3 className="mt-1 text-lg font-bold text-[var(--foreground)]">{order.item_name || "품명 없음"}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    {joinText([
                      order.site,
                      order.width && order.height ? `${order.width} x ${order.height}` : null,
                      order.line
                    ]) || "세부 정보 부족"}
                  </p>
                </div>
                <StatusBadge status={order.status} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {reasons.map((reason) => (
                  <span
                    key={reason}
                    className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800"
                  >
                    {reason}
                  </span>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => onStatusChange(order.id, option)}
                    className={[
                      "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                      order.status === option
                        ? "bg-[var(--primary)] text-white"
                        : "bg-[#f4f7fb] text-[var(--foreground)]"
                    ].join(" ")}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </article>
          ))
        )}
      </div>
    </SectionCard>
  );
}
