"use client";

import { useMemo, useState } from "react";
import { SectionCard } from "@/components/SectionCard";
import { StatusBadge } from "@/components/StatusBadge";
import { STATUS_OPTIONS } from "@/lib/constants";
import { formatDateTime, formatNumber, joinText } from "@/lib/utils";
import type { OrderRecord, OrderStatus } from "@/lib/types";

type OrderListProps = {
  orders: OrderRecord[];
  onStatusChange: (id: string, status: OrderStatus) => void;
};

export function OrderList({ orders, onStatusChange }: OrderListProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"전체" | OrderStatus>("전체");
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);

  const filteredOrders = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesStatus = status === "전체" ? true : order.status === status;
      const matchesSearch = keyword
        ? [order.customer, order.site, order.item_name, order.item_code, order.pid]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(keyword))
        : true;

      return matchesStatus && matchesSearch;
    });
  }, [orders, search, status]);

  return (
    <SectionCard title="주문 목록" description="등록된 주문을 검색하고 상태를 바꾸거나 상세 정보를 빠르게 확인할 수 있습니다.">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="거래처, 현장, 품명, 품목코드, PID 검색"
            className="min-w-[18rem] flex-1 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-[var(--primary)]"
          />
          <div className="flex flex-wrap gap-2">
            {(["전체", ...STATUS_OPTIONS] as Array<"전체" | OrderStatus>).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setStatus(option)}
                className={[
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                  status === option ? "bg-[var(--primary)] text-white" : "bg-[#f4f7fb] text-[var(--foreground)]"
                ].join(" ")}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#f8fafb] text-xs uppercase tracking-[0.08em] text-[var(--muted)]">
              <tr>
                {[
                  "등록일시",
                  "상태",
                  "거래처",
                  "현장",
                  "공정",
                  "품목코드",
                  "품명",
                  "가로",
                  "세로",
                  "수량",
                  "평수",
                  "의뢰번호",
                  "NO",
                  "라인",
                  "등록자"
                ].map((label) => (
                  <th key={label} className="px-3 py-3 font-semibold">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id} onClick={() => setSelectedOrder(order)} className="cursor-pointer border-t border-black/5 hover:bg-[#f9fbfc]">
                  <td className="px-3 py-3">{formatDateTime(order.created_at)}</td>
                  <td className="px-3 py-3"><StatusBadge status={order.status} /></td>
                  <td className="px-3 py-3 font-semibold text-[var(--foreground)]">{order.customer}</td>
                  <td className="px-3 py-3">{order.site ?? "-"}</td>
                  <td className="px-3 py-3">{order.process ?? "-"}</td>
                  <td className="px-3 py-3">{order.item_code ?? "-"}</td>
                  <td className="px-3 py-3">{order.item_name}</td>
                  <td className="px-3 py-3">{formatNumber(order.width)}</td>
                  <td className="px-3 py-3">{formatNumber(order.height)}</td>
                  <td className="px-3 py-3">{formatNumber(order.quantity)}</td>
                  <td className="px-3 py-3">{order.area_pyeong ? `${order.area_pyeong}` : "-"}</td>
                  <td className="px-3 py-3">{order.request_no ?? "-"}</td>
                  <td className="px-3 py-3">{order.no ?? "-"}</td>
                  <td className="px-3 py-3">{order.line ?? "-"}</td>
                  <td className="px-3 py-3">{order.registrant ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selectedOrder ? (
          <div className="rounded-2xl border border-black/5 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[var(--primary)]">{selectedOrder.customer}</p>
                <h3 className="mt-1 text-xl font-bold text-[var(--foreground)]">{selectedOrder.item_name}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  {joinText([
                    selectedOrder.site,
                    selectedOrder.width && selectedOrder.height ? `${selectedOrder.width} x ${selectedOrder.height}` : null,
                    selectedOrder.line,
                    selectedOrder.pid
                  ])}
                </p>
              </div>
              <StatusBadge status={selectedOrder.status} />
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => onStatusChange(selectedOrder.id, option)}
                  className={[
                    "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                    selectedOrder.status === option ? "bg-[var(--primary)] text-white" : "bg-[#f4f7fb] text-[var(--foreground)]"
                  ].join(" ")}
                >
                  {option}
                </button>
              ))}
            </div>

            {selectedOrder.memo ? (
              <div className="mt-5 rounded-2xl bg-[#f8fafb] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
                {selectedOrder.memo}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}
