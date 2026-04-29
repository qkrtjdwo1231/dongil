import { classifyProductFamily } from "@/lib/product-family";
import type { OrderRecord } from "@/lib/types";

export type AnalyticsRangeKey = "7d" | "30d" | "90d" | "180d" | "365d" | "all";
export type AnalyticsMetric = "quantity" | "area";
export type AnalyticsDimension =
  | "customer"
  | "site"
  | "item"
  | "productFamily"
  | "line"
  | "process"
  | "registrant";
export type AnalyticsGranularity = "day" | "week" | "month";

function parseDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function filterOrdersByRange(orders: OrderRecord[], range: AnalyticsRangeKey) {
  if (range === "all") {
    return orders;
  }

  const latest = orders
    .map((order) => parseDate(order.created_at))
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  if (!latest) {
    return orders;
  }

  const daysMap: Record<Exclude<AnalyticsRangeKey, "all">, number> = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
    "180d": 180,
    "365d": 365
  };

  const threshold = new Date(latest);
  threshold.setDate(threshold.getDate() - daysMap[range]);

  return orders.filter((order) => {
    const date = parseDate(order.created_at);
    return date ? date >= threshold : false;
  });
}

export function sumMetric(orders: OrderRecord[], metric: AnalyticsMetric) {
  return orders.reduce((total, order) => {
    if (metric === "quantity") {
      return total + (order.quantity || 0);
    }
    return total + (order.area_pyeong || 0);
  }, 0);
}

export function groupOrdersByDimension(orders: OrderRecord[], dimension: AnalyticsDimension) {
  const map = new Map<string, OrderRecord[]>();

  orders.forEach((order) => {
    const key =
      dimension === "customer"
        ? order.customer || "미지정 거래처"
        : dimension === "site"
          ? order.site || "미지정 현장"
          : dimension === "item"
            ? order.item_name || "미지정 품명"
            : dimension === "productFamily"
              ? order.product_family || classifyProductFamily(order.item_name || "")
              : dimension === "line"
                ? order.line || "미지정 라인"
                : dimension === "process"
                  ? order.process || "미지정 공정"
                  : order.registrant || "미지정 등록자";

    const bucket = map.get(key) ?? [];
    bucket.push(order);
    map.set(key, bucket);
  });

  return [...map.entries()].map(([label, items]) => ({
    label,
    orders: items,
    quantity: sumMetric(items, "quantity"),
    area: sumMetric(items, "area")
  }));
}

export function buildTrendSeries(orders: OrderRecord[], granularity: AnalyticsGranularity) {
  const map = new Map<string, { label: string; quantity: number; area: number; count: number }>();

  orders.forEach((order) => {
    const date = parseDate(order.created_at);
    if (!date) {
      return;
    }

    const label =
      granularity === "day"
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
        : granularity === "week"
          ? `${date.getFullYear()}-${String(getWeekNumber(date)).padStart(2, "0")}주`
          : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    const existing = map.get(label) ?? { label, quantity: 0, area: 0, count: 0 };
    existing.quantity += order.quantity || 0;
    existing.area += order.area_pyeong || 0;
    existing.count += 1;
    map.set(label, existing);
  });

  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, "ko"));
}

function getWeekNumber(date: Date) {
  const start = new Date(date.getFullYear(), 0, 1);
  const diff = Math.floor((date.getTime() - start.getTime()) / 86400000);
  return Math.floor(diff / 7) + 1;
}

export function getUniqueCount(values: Array<string | null | undefined>) {
  return new Set(values.filter(Boolean)).size;
}

export function getLatestOrderDate(orders: OrderRecord[]) {
  return (
    orders
      .map((order) => parseDate(order.created_at))
      .filter((date): date is Date => Boolean(date))
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null
  );
}

export function getTodayOrders(orders: OrderRecord[]) {
  const latest = getLatestOrderDate(orders);
  if (!latest) {
    return [];
  }

  const year = latest.getFullYear();
  const month = latest.getMonth();
  const day = latest.getDate();

  return orders.filter((order) => {
    const date = parseDate(order.created_at);
    return date
      ? date.getFullYear() === year && date.getMonth() === month && date.getDate() === day
      : false;
  });
}

export function getPreviousPeriodOrders(orders: OrderRecord[], range: Exclude<AnalyticsRangeKey, "all">) {
  const latest = getLatestOrderDate(orders);
  if (!latest) {
    return [];
  }

  const spanMap: Record<Exclude<AnalyticsRangeKey, "all">, number> = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
    "180d": 180,
    "365d": 365
  };

  const days = spanMap[range];
  const currentStart = new Date(latest);
  currentStart.setDate(currentStart.getDate() - days);
  const previousStart = new Date(currentStart);
  previousStart.setDate(previousStart.getDate() - days);

  return orders.filter((order) => {
    const date = parseDate(order.created_at);
    return date ? date >= previousStart && date < currentStart : false;
  });
}

export function calculateChange(current: number, previous: number) {
  if (!previous) {
    return current ? 100 : 0;
  }

  return ((current - previous) / previous) * 100;
}

export function calculateTopSharePercent(
  orders: OrderRecord[],
  dimension: AnalyticsDimension,
  topCount: number,
  metric: AnalyticsMetric
) {
  const total = sumMetric(orders, metric);
  if (!total) {
    return 0;
  }

  const grouped = groupOrdersByDimension(orders, dimension)
    .sort((left, right) => (metric === "quantity" ? right.quantity - left.quantity : right.area - left.area))
    .slice(0, topCount);

  const topTotal = grouped.reduce(
    (sum, group) => sum + (metric === "quantity" ? group.quantity : group.area),
    0
  );

  return (topTotal / total) * 100;
}

export function calculateMissingRate(
  orders: OrderRecord[],
  field: "site" | "customer" | "item_name" | "line" | "pid"
) {
  if (!orders.length) {
    return 0;
  }

  const missingCount = orders.filter((order) => {
    const value = order[field];
    return value === null || value === undefined || String(value).trim() === "";
  }).length;

  return (missingCount / orders.length) * 100;
}
