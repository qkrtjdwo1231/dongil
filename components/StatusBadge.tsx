import type { OrderStatus } from "@/lib/types";

const statusStyles: Record<OrderStatus, string> = {
  등록: "bg-slate-100 text-slate-700",
  확인필요: "bg-amber-100 text-amber-800",
  진행: "bg-sky-100 text-sky-800",
  완료: "bg-emerald-100 text-emerald-800",
  보류: "bg-rose-100 text-rose-800"
};

type StatusBadgeProps = {
  status: OrderStatus;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[status]}`}>
      {status}
    </span>
  );
}
