"use client";

import { useMemo, useState } from "react";
import { ConsoleShell } from "@/components/ConsoleShell";
import { ExecutiveGoalSettings } from "@/components/ExecutiveGoalSettings";
import { ExecutiveSettingsPanel } from "@/components/ExecutiveSettingsPanel";
import { ExistingDataUploadPanel } from "@/components/ExistingDataUploadPanel";
import { RepresentativeAiWorkspace } from "@/components/RepresentativeAiWorkspace";
import { SectionCard } from "@/components/SectionCard";
import {
  type AnalyticsDimension,
  type AnalyticsGranularity,
  type AnalyticsMetric,
  type AnalyticsRangeKey,
  buildTrendSeries,
  calculateChange,
  calculateMissingRate,
  calculateTopSharePercent,
  filterOrdersByRange,
  getPreviousPeriodOrders,
  getTodayOrders,
  getUniqueCount,
  groupOrdersByDimension,
  sumMetric
} from "@/lib/analytics";
import { formatNumber } from "@/lib/utils";
import type { ExecutiveMenu, OrderRecord, UploadedAnalysisFile, UploadImportResult } from "@/lib/types";

const executiveMenus: Array<{ id: ExecutiveMenu; label: string; description: string }> = [
  { id: "dashboard", label: "대시보드", description: "대표가 가장 먼저 보는 핵심 요약 화면입니다." },
  { id: "analysis", label: "다차원 분석", description: "거래처, 품목, 제품군, 현장 기준으로 교차 분석합니다." },
  { id: "targets", label: "목표 설정", description: "월별 생산 목표와 현재 추세를 함께 관리합니다." },
  { id: "data-grid", label: "데이터 그리드", description: "원본에 가까운 형태로 생산실적을 조회합니다." },
  { id: "import", label: "데이터 임포트", description: "엑셀 업로드와 분석용 구조화를 수행합니다." },
  { id: "ai-analysis", label: "AI 분석", description: "업로드된 실적 데이터를 바탕으로 대표용 해석을 제공합니다." },
  { id: "settings", label: "설정", description: "분석 기본값과 AI 규칙을 관리합니다." }
];

const analysisTabs = [
  { id: "pivot", label: "피벗 테이블" },
  { id: "chart", label: "차트 분석" },
  { id: "cross", label: "교차 분석" },
  { id: "concentration", label: "집중도 분석" },
  { id: "trend", label: "추세 분석" },
  { id: "yoy", label: "전년 대비" }
] as const;

type AnalysisTab = (typeof analysisTabs)[number]["id"];
type GroupedRow = ReturnType<typeof groupOrdersByDimension>[number];

function KpiCard({
  label,
  value,
  description,
  delta
}: {
  label: string;
  value: string;
  description: string;
  delta?: number;
}) {
  const positive = delta === undefined ? true : delta >= 0;

  return (
    <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-[0_18px_60px_rgba(24,39,56,0.08)]">
      <p className="text-sm font-medium text-[var(--muted)]">{label}</p>
      <p className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[var(--foreground)]">{value}</p>
      <div className="mt-3 flex items-center justify-between gap-3 text-xs">
        <span className="text-[var(--muted)]">{description}</span>
        {delta !== undefined ? (
          <span className={positive ? "font-semibold text-emerald-700" : "font-semibold text-rose-700"}>
            {positive ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%
          </span>
        ) : null}
      </div>
    </div>
  );
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDateRangeLabel(values: string[]) {
  if (!values.length) {
    return "데이터 범위 없음";
  }

  const sorted = values
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((left, right) => left.getTime() - right.getTime());

  if (!sorted.length) {
    return "데이터 범위 없음";
  }

  const start = sorted[0].toISOString();
  const end = sorted[sorted.length - 1].toISOString();
  return `${formatDateLabel(start)} - ${formatDateLabel(end)}`;
}

function filterOrdersByDateRange(orders: OrderRecord[], start: string, end: string) {
  if (!start && !end) {
    return orders;
  }

  const startDate = start ? new Date(`${start}T00:00:00`) : null;
  const endDate = end ? new Date(`${end}T23:59:59`) : null;

  return orders.filter((order) => {
    const current = new Date(order.created_at);
    if (Number.isNaN(current.getTime())) {
      return false;
    }
    if (startDate && current < startDate) {
      return false;
    }
    if (endDate && current > endDate) {
      return false;
    }
    return true;
  });
}

function getPreviousOrdersForDateRange(orders: OrderRecord[], start: string, end: string) {
  if (!start || !end) {
    return [];
  }

  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T23:59:59`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) {
    return [];
  }

  const span = endDate.getTime() - startDate.getTime();
  const previousEnd = new Date(startDate.getTime() - 1000);
  const previousStart = new Date(previousEnd.getTime() - span);

  return orders.filter((order) => {
    const current = new Date(order.created_at);
    if (Number.isNaN(current.getTime())) {
      return false;
    }
    return current >= previousStart && current <= previousEnd;
  });
}

function getGranularityBucket(value: string, granularity: AnalyticsGranularity) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (granularity === "day") {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  if (granularity === "week") {
    const start = new Date(date.getFullYear(), 0, 1);
    const diff = Math.floor((date.getTime() - start.getTime()) / 86400000);
    return `${date.getFullYear()}-${String(Math.floor(diff / 7) + 1).padStart(2, "0")}주`;
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getDimensionLabel(dimension: AnalyticsDimension) {
  switch (dimension) {
    case "customer":
      return "거래처";
    case "site":
      return "현장";
    case "item":
      return "품목";
    case "productFamily":
      return "제품군";
    case "line":
      return "라인";
    case "process":
      return "공정";
    case "registrant":
      return "등록자";
    default:
      return "기준";
  }
}

function getMetricLabel(metric: AnalyticsMetric) {
  return metric === "area" ? "평수" : "수량";
}

function getGranularityLabel(granularity: AnalyticsGranularity) {
  return granularity === "day" ? "일별" : granularity === "week" ? "주별" : "월별";
}

function getSecondaryDimension(dimension: AnalyticsDimension): AnalyticsDimension {
  if (dimension === "customer" || dimension === "site") {
    return "productFamily";
  }
  if (dimension === "item" || dimension === "productFamily") {
    return "customer";
  }
  return "productFamily";
}

function BarList({
  rows,
  metric,
  emptyMessage
}: {
  rows: GroupedRow[];
  metric: AnalyticsMetric;
  emptyMessage: string;
}) {
  const maxValue = Math.max(...rows.map((row) => (metric === "area" ? row.area : row.quantity)), 1);

  if (!rows.length) {
    return <p className="text-sm text-[var(--muted)]">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const value = metric === "area" ? row.area : row.quantity;
        return (
          <div key={row.label} className="grid grid-cols-[11rem_minmax(0,1fr)_5rem] items-center gap-3">
            <span className="truncate text-sm text-[var(--foreground)]">{row.label}</span>
            <div className="h-3 rounded-full bg-[#edf2f6]">
              <div className="h-3 rounded-full bg-[var(--primary)]" style={{ width: `${(value / maxValue) * 100}%` }} />
            </div>
            <span className="text-right text-sm font-semibold text-[var(--foreground)]">
              {metric === "area" ? value.toFixed(1) : formatNumber(value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function ExecutiveDashboard({
  orders,
  uploadedFiles,
  onImportComplete,
  menu: controlledMenu,
  onMenuChange: controlledOnMenuChange,
  search: controlledSearch,
  onSearchChange: controlledOnSearchChange
}: {
  orders: OrderRecord[];
  uploadedFiles: UploadedAnalysisFile[];
  onImportComplete: (result: UploadImportResult) => Promise<void> | void;
  menu?: ExecutiveMenu;
  onMenuChange?: (menu: ExecutiveMenu) => void;
  search?: string;
  onSearchChange?: (value: string) => void;
}) {
  const [localMenu, setLocalMenu] = useState<ExecutiveMenu>("dashboard");
  const menu = controlledMenu ?? localMenu;
  const setMenu = controlledOnMenuChange ?? setLocalMenu;
  const [localSearch, setLocalSearch] = useState("");
  const search = controlledSearch ?? localSearch;
  const setSearch = controlledOnSearchChange ?? setLocalSearch;
  const [range, setRange] = useState<AnalyticsRangeKey>("30d");
  const [dimension, setDimension] = useState<AnalyticsDimension>("customer");
  const [metric, setMetric] = useState<AnalyticsMetric>("area");
  const [granularity, setGranularity] = useState<AnalyticsGranularity>("month");
  const [analysisTab, setAnalysisTab] = useState<AnalysisTab>("pivot");
  const [gridSearch, setGridSearch] = useState("");
  const [useCustomDateRange, setUseCustomDateRange] = useState(false);
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");

  const keywordFilteredOrders = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return orders;
    }

    return orders.filter((order) =>
      [
        order.customer,
        order.site,
        order.item_name,
        order.item_code,
        order.request_no,
        order.process,
        order.product_family,
        order.registrant
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [orders, search]);

  const rangedOrders = useMemo(() => {
    if (useCustomDateRange) {
      return filterOrdersByDateRange(keywordFilteredOrders, dateStart, dateEnd);
    }

    return filterOrdersByRange(keywordFilteredOrders, range);
  }, [dateEnd, dateStart, keywordFilteredOrders, range, useCustomDateRange]);

  const previousOrders = useMemo(() => {
    if (useCustomDateRange) {
      return getPreviousOrdersForDateRange(keywordFilteredOrders, dateStart, dateEnd);
    }

    return range === "all" ? [] : getPreviousPeriodOrders(keywordFilteredOrders, range);
  }, [dateEnd, dateStart, keywordFilteredOrders, range, useCustomDateRange]);

  const grouped = useMemo(() => groupOrdersByDimension(rangedOrders, dimension), [rangedOrders, dimension]);
  const topGroups = useMemo(
    () => [...grouped].sort((a, b) => (metric === "area" ? b.area - a.area : b.quantity - a.quantity)),
    [grouped, metric]
  );

  const trendSeries = useMemo(() => buildTrendSeries(rangedOrders, granularity), [rangedOrders, granularity]);
  const todayOrders = useMemo(() => getTodayOrders(keywordFilteredOrders), [keywordFilteredOrders]);
  const latestUpload = uploadedFiles[0] ?? null;
  const latestSnapshot = latestUpload?.analysis_snapshot ?? null;

  const totalJobs = rangedOrders.length;
  const totalQuantity = sumMetric(rangedOrders, "quantity");
  const totalArea = sumMetric(rangedOrders, "area");
  const averageArea = totalJobs ? totalArea / totalJobs : 0;
  const totalCustomers = getUniqueCount(rangedOrders.map((order) => order.customer));
  const totalSites = getUniqueCount(rangedOrders.map((order) => order.site));
  const totalItems = getUniqueCount(rangedOrders.map((order) => order.item_name));
  const totalLines = getUniqueCount(rangedOrders.map((order) => order.line));
  const todayQuantity = sumMetric(todayOrders, "quantity");

  const previousQuantity = sumMetric(previousOrders, "quantity");
  const previousArea = sumMetric(previousOrders, "area");
  const previousJobs = previousOrders.length;

  const dashboardDateLabel = useMemo(
    () => getDateRangeLabel(rangedOrders.map((order) => order.created_at)),
    [rangedOrders]
  );

  const analysisDateLabel = useMemo(
    () => getDateRangeLabel(rangedOrders.map((order) => order.created_at)),
    [rangedOrders]
  );

  const topCustomerShare = calculateTopSharePercent(rangedOrders, "customer", 5, "area");
  const topItemShare = calculateTopSharePercent(rangedOrders, "item", 5, "area");
  const siteMissingRate = calculateMissingRate(rangedOrders, "site");

  const topCustomers = useMemo(
    () => groupOrdersByDimension(rangedOrders, "customer").sort((a, b) => b.area - a.area).slice(0, 10),
    [rangedOrders]
  );
  const topItems = useMemo(
    () => groupOrdersByDimension(rangedOrders, "item").sort((a, b) => b.area - a.area).slice(0, 10),
    [rangedOrders]
  );
  const topProductFamilies = useMemo(
    () => groupOrdersByDimension(rangedOrders, "productFamily").sort((a, b) => b.area - a.area).slice(0, 10),
    [rangedOrders]
  );

  const periodCount = trendSeries.length;
  const pivotBuckets = useMemo(() => trendSeries.map((row) => row.label), [trendSeries]);
  const pivotRows = useMemo(() => {
    return topGroups.slice(0, 20).map((group) => {
      const values = new Map<string, number>();
      group.orders.forEach((order) => {
        const bucket = getGranularityBucket(order.created_at, granularity);
        if (!bucket) {
          return;
        }
        const current = values.get(bucket) ?? 0;
        values.set(bucket, current + (metric === "area" ? order.area_pyeong || 0 : order.quantity || 0));
      });

      return {
        label: group.label,
        total: metric === "area" ? group.area : group.quantity,
        values
      };
    });
  }, [granularity, metric, topGroups]);

  const crossDimension = getSecondaryDimension(dimension);
  const crossRows = useMemo(() => {
    const rows = topGroups.slice(0, 10);
    const columns = groupOrdersByDimension(rangedOrders, crossDimension)
      .sort((a, b) => (metric === "area" ? b.area - a.area : b.quantity - a.quantity))
      .slice(0, 5)
      .map((group) => group.label);

    return {
      columns,
      rows: rows.map((group) => {
        const values = new Map<string, number>();
        group.orders.forEach((order) => {
          const bucket = groupOrdersByDimension([order], crossDimension)[0]?.label;
          if (!bucket || !columns.includes(bucket)) {
            return;
          }
          const current = values.get(bucket) ?? 0;
          values.set(bucket, current + (metric === "area" ? order.area_pyeong || 0 : order.quantity || 0));
        });

        return {
          label: group.label,
          values
        };
      })
    };
  }, [crossDimension, metric, rangedOrders, topGroups]);

  const previousGroupsMap = useMemo(() => {
    const map = new Map<string, number>();
    groupOrdersByDimension(previousOrders, dimension).forEach((group) => {
      map.set(group.label, metric === "area" ? group.area : group.quantity);
    });
    return map;
  }, [dimension, metric, previousOrders]);

  const yearOverYearRows = useMemo(() => {
    return topGroups.slice(0, 10).map((group) => {
      const current = metric === "area" ? group.area : group.quantity;
      const previous = previousGroupsMap.get(group.label) ?? 0;
      return {
        label: group.label,
        current,
        previous,
        change: calculateChange(current, previous)
      };
    });
  }, [metric, previousGroupsMap, topGroups]);

  const dataGridRows = useMemo(() => {
    const keyword = gridSearch.trim().toLowerCase();
    if (!keyword) {
      return rangedOrders;
    }

    return rangedOrders.filter((order) =>
      [
        order.created_at,
        order.process,
        order.product_family,
        order.item_code,
        order.item_name,
        order.request_no,
        order.no,
        order.customer,
        order.site,
        order.line,
        order.registrant,
        order.status
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [gridSearch, rangedOrders]);

  const representativeBrief = useMemo(() => {
    const items: string[] = [];
    if (topCustomerShare >= 50) {
      items.push(`상위 5개 거래처가 전체 평수의 ${topCustomerShare.toFixed(1)}%를 차지합니다.`);
    }
    if (topItemShare >= 50) {
      items.push(`상위 5개 품목이 전체 평수의 ${topItemShare.toFixed(1)}%를 차지합니다.`);
    }
    if (siteMissingRate >= 5) {
      items.push(`현장 누락률이 ${siteMissingRate.toFixed(1)}%로 높아 현장별 해석 신뢰도에 주의가 필요합니다.`);
    }
    if (latestSnapshot?.peakMonthLabel) {
      items.push(`최근 업로드 기준 피크 월은 ${latestSnapshot.peakMonthLabel}입니다.`);
    }
    return items.length ? items : ["최근 업로드와 현재 기간 데이터 기준으로 즉시 확인할 큰 구조 리스크는 아직 두드러지지 않습니다."];
  }, [latestSnapshot, siteMissingRate, topCustomerShare, topItemShare]);

  const handlePresetRangeClick = (nextRange: AnalyticsRangeKey) => {
    setUseCustomDateRange(false);
    setDateStart("");
    setDateEnd("");
    setRange(nextRange);
  };

  const handleDateStartChange = (value: string) => {
    setUseCustomDateRange(true);
    setDateStart(value);
  };

  const handleDateEndChange = (value: string) => {
    setUseCustomDateRange(true);
    setDateEnd(value);
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-[23rem] items-center gap-3 rounded-2xl border border-black/10 bg-white px-5 py-3 shadow-sm">
          <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5 shrink-0 text-[var(--foreground)]" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3.5" y="4.5" width="13" height="12" rx="2" />
            <path d="M6.5 2.75V6.25" strokeLinecap="round" />
            <path d="M13.5 2.75V6.25" strokeLinecap="round" />
            <path d="M3.5 8.25H16.5" />
          </svg>
          <span className="text-sm font-medium text-[var(--foreground)]">{dashboardDateLabel}</span>
        </div>

        {[
          { key: "30d" as AnalyticsRangeKey, label: "최근 30일" },
          { key: "all" as AnalyticsRangeKey, label: "전체" }
        ].map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => handlePresetRangeClick(option.key)}
            className={[
              "rounded-2xl px-4 py-3 text-sm font-semibold transition",
              !useCustomDateRange && range === option.key
                ? "bg-[var(--foreground)] text-white"
                : "bg-white text-[var(--foreground)] ring-1 ring-black/5"
            ].join(" ")}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="총 포장 건수" value={formatNumber(totalJobs)} description="기간 내 처리 건수" delta={calculateChange(totalJobs, previousJobs)} />
        <KpiCard label="총 수량" value={formatNumber(totalQuantity)} description="전기 대비 수량 변화" delta={calculateChange(totalQuantity, previousQuantity)} />
        <KpiCard label="총 평수" value={totalArea.toFixed(1)} description="전기 대비 평수 변화" delta={calculateChange(totalArea, previousArea)} />
        <KpiCard label="평균 평수" value={averageArea.toFixed(2)} description="건당 평균 부담" />
        <KpiCard label="오늘 생산량" value={formatNumber(todayQuantity)} description="최근 작업일 기준" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="거래처 수" value={formatNumber(totalCustomers)} description="기간 내 활동 거래처" />
        <KpiCard label="현장 수" value={formatNumber(totalSites)} description="현장 구분 수" />
        <KpiCard label="품목 수" value={formatNumber(totalItems)} description="품명 기준" />
        <KpiCard label="라인 수" value={formatNumber(totalLines)} description="운영 라인 수" />
        <KpiCard label="현장 누락률" value={formatPercent(siteMissingRate)} description="현장 미입력 비중" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="대표 브리핑" description="대표가 가장 먼저 확인할 핵심 포인트를 짧게 정리합니다.">
          <div className="space-y-4">
            <div className="rounded-2xl border border-black/5 bg-white p-4">
              <p className="text-sm font-semibold text-[var(--foreground)]">최근 업로드 기준 요약</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {latestUpload?.summary_text ?? "아직 업로드된 파일 요약이 없습니다."}
              </p>
            </div>
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
              <p className="text-sm font-semibold text-sky-900">핵심 확인 포인트</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-sky-900">
                {representativeBrief.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="집중도와 품질" description="생산 부담이 어디에 몰리는지, 데이터 품질이 충분한지 빠르게 확인합니다.">
          <div className="space-y-3">
            {[
              { label: "상위 5개 거래처 평수 비중", value: formatPercent(topCustomerShare) },
              { label: "상위 5개 품목 평수 비중", value: formatPercent(topItemShare) },
              { label: "현장 누락률", value: formatPercent(siteMissingRate) },
              { label: "최근 업로드 주요 제품군 수", value: latestSnapshot ? formatNumber(latestSnapshot.uniqueProductFamilies) : "-" },
              { label: "최근 업로드 현장 수", value: latestSnapshot ? formatNumber(latestSnapshot.uniqueSites) : "-" },
              { label: "최근 업로드 거래처 수", value: latestSnapshot ? formatNumber(latestSnapshot.uniqueCustomers) : "-" }
            ].map((item) => (
              <div key={item.label} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border border-black/5 bg-white px-4 py-3">
                <span className="text-sm text-[var(--muted)]">{item.label}</span>
                <strong className="text-sm text-[var(--foreground)]">{item.value}</strong>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="거래처 TOP 10" description="평수 기준으로 포장 부담이 큰 거래처를 보여줍니다.">
          <BarList rows={topCustomers} metric="area" emptyMessage="거래처 데이터가 없습니다." />
        </SectionCard>
        <SectionCard title="품목 TOP 10" description="평수 기준으로 많이 처리된 품목을 보여줍니다.">
          <BarList rows={topItems} metric="area" emptyMessage="품목 데이터가 없습니다." />
        </SectionCard>
      </div>
    </div>
  );

  const renderAnalysis = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-[2rem] font-bold tracking-[-0.05em] text-[var(--foreground)]">다차원 분석</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          기간별, 거래처별, 품목별 생산 현황을 분석하고 생산 부담과 집중도를 교차 확인합니다.
        </p>
      </div>

      <SectionCard title="분석 조건" description="기간과 기준, 지표를 조합해 대표 관점의 분석 화면을 빠르게 구성합니다.">
        <div className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1.25fr)]">
            <div>
              <p className="mb-3 text-sm font-semibold text-[var(--foreground)]">기간 선택</p>
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-black/10 bg-white px-5 py-3 shadow-sm">
                <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5 shrink-0 text-[var(--foreground)]" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="3.5" y="4.5" width="13" height="12" rx="2" />
                  <path d="M6.5 2.75V6.25" strokeLinecap="round" />
                  <path d="M13.5 2.75V6.25" strokeLinecap="round" />
                  <path d="M3.5 8.25H16.5" />
                </svg>
                <input
                  type="date"
                  value={dateStart}
                  onChange={(event) => handleDateStartChange(event.target.value)}
                  className="rounded-xl border border-black/10 px-3 py-2 text-sm text-[var(--foreground)] outline-none"
                />
                <span className="text-sm text-[var(--muted)]">-</span>
                <input
                  type="date"
                  value={dateEnd}
                  onChange={(event) => handleDateEndChange(event.target.value)}
                  className="rounded-xl border border-black/10 px-3 py-2 text-sm text-[var(--foreground)] outline-none"
                />
                <span className="text-sm font-medium text-[var(--muted)]">{analysisDateLabel}</span>
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-semibold text-[var(--foreground)]">빠른 선택</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "7d" as AnalyticsRangeKey, label: "7일" },
                  { key: "30d" as AnalyticsRangeKey, label: "30일" },
                  { key: "90d" as AnalyticsRangeKey, label: "3개월" },
                  { key: "180d" as AnalyticsRangeKey, label: "6개월" },
                  { key: "365d" as AnalyticsRangeKey, label: "1년" },
                  { key: "all" as AnalyticsRangeKey, label: "전체" }
                ].map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => handlePresetRangeClick(option.key)}
                    className={[
                      "rounded-2xl px-4 py-2.5 text-sm font-semibold transition",
                      !useCustomDateRange && range === option.key
                        ? "bg-[var(--foreground)] text-white"
                        : "bg-white text-[var(--foreground)] ring-1 ring-black/5"
                    ].join(" ")}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-2 text-sm font-semibold text-[var(--foreground)]">
              <span>집계 단위</span>
              <select
                value={granularity}
                onChange={(event) => setGranularity(event.target.value as AnalyticsGranularity)}
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-medium text-[var(--foreground)] outline-none"
              >
                <option value="day">일별</option>
                <option value="week">주별</option>
                <option value="month">월별</option>
              </select>
            </label>

            <label className="space-y-2 text-sm font-semibold text-[var(--foreground)]">
              <span>분석 기준</span>
              <select
                value={dimension}
                onChange={(event) => setDimension(event.target.value as AnalyticsDimension)}
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-medium text-[var(--foreground)] outline-none"
              >
                <option value="customer">거래처</option>
                <option value="item">품목</option>
                <option value="productFamily">제품군</option>
                <option value="site">현장</option>
                <option value="line">라인</option>
                <option value="process">공정</option>
                <option value="registrant">등록자</option>
              </select>
            </label>

            <label className="space-y-2 text-sm font-semibold text-[var(--foreground)]">
              <span>측정 지표</span>
              <select
                value={metric}
                onChange={(event) => setMetric(event.target.value as AnalyticsMetric)}
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-medium text-[var(--foreground)] outline-none"
              >
                <option value="area">평수</option>
                <option value="quantity">수량</option>
              </select>
            </label>
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="총 생산 수량" value={formatNumber(totalQuantity)} description="현재 분석 기간 합계" />
        <KpiCard label="총 생산 평수" value={`${totalArea.toFixed(1)} 평`} description="현재 분석 기간 합계" />
        <KpiCard label={`${getDimensionLabel(dimension)} 수`} value={formatNumber(topGroups.length)} description="선택 기준으로 집계된 구분 수" />
        <KpiCard label="분석 기간 수" value={formatNumber(periodCount)} description={`${getGranularityLabel(granularity)} 기준 구간 수`} />
      </div>

      <div className="flex flex-wrap gap-2 rounded-3xl border border-black/5 bg-white p-2 shadow-[0_18px_60px_rgba(24,39,56,0.08)]">
        {analysisTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setAnalysisTab(tab.id)}
            className={[
              "rounded-2xl px-4 py-2.5 text-sm font-semibold transition",
              analysisTab === tab.id ? "bg-[var(--foreground)] text-white" : "text-[var(--foreground)] hover:bg-black/5"
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {analysisTab === "pivot" ? (
        <SectionCard
          title={`${getDimensionLabel(dimension)}별 ${getGranularityLabel(granularity)} ${getMetricLabel(metric)} 분석`}
          description="선택한 기준과 구간 조합을 표로 확인합니다."
        >
          <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f8fafb] text-xs uppercase tracking-[0.08em] text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3">{getDimensionLabel(dimension)}</th>
                  {pivotBuckets.map((bucket) => (
                    <th key={bucket} className="px-4 py-3">{bucket}</th>
                  ))}
                  <th className="px-4 py-3">합계</th>
                </tr>
              </thead>
              <tbody>
                {pivotRows.map((row) => (
                  <tr key={row.label} className="border-t border-black/5">
                    <td className="px-4 py-3 font-medium text-[var(--foreground)]">{row.label}</td>
                    {pivotBuckets.map((bucket) => (
                      <td key={`${row.label}-${bucket}`} className="px-4 py-3">
                        {metric === "area" ? (row.values.get(bucket) ?? 0).toFixed(1) : formatNumber(row.values.get(bucket) ?? 0)}
                      </td>
                    ))}
                    <td className="px-4 py-3 font-semibold text-[var(--foreground)]">
                      {metric === "area" ? row.total.toFixed(1) : formatNumber(row.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ) : null}

      {analysisTab === "chart" ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <SectionCard title={`${getDimensionLabel(dimension)} TOP 10`} description="선택한 기준에서 영향도가 큰 순서대로 봅니다.">
            <BarList rows={topGroups.slice(0, 10)} metric={metric} emptyMessage="차트 데이터가 없습니다." />
          </SectionCard>
          <SectionCard title="제품군 비중" description="현재 기간 제품 믹스를 빠르게 확인합니다.">
            <BarList rows={topProductFamilies.slice(0, 6)} metric="area" emptyMessage="제품군 데이터가 없습니다." />
          </SectionCard>
        </div>
      ) : null}

      {analysisTab === "cross" ? (
        <SectionCard
          title={`${getDimensionLabel(dimension)} x ${getDimensionLabel(crossDimension)} 교차 분석`}
          description="어떤 축 조합에서 생산 부담이 겹치는지 비교합니다."
        >
          <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f8fafb] text-xs uppercase tracking-[0.08em] text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3">{getDimensionLabel(dimension)}</th>
                  {crossRows.columns.map((column) => (
                    <th key={column} className="px-4 py-3">{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {crossRows.rows.map((row) => (
                  <tr key={row.label} className="border-t border-black/5">
                    <td className="px-4 py-3 font-medium text-[var(--foreground)]">{row.label}</td>
                    {crossRows.columns.map((column) => {
                      const value = row.values.get(column) ?? 0;
                      return (
                        <td key={`${row.label}-${column}`} className="px-4 py-3">
                          {metric === "area" ? value.toFixed(1) : formatNumber(value)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ) : null}

      {analysisTab === "concentration" ? (
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <SectionCard title="집중도 지표" description="생산 부담이 일부 고객이나 품목에 몰리는지 확인합니다.">
            <div className="space-y-3">
              {[
                { label: "상위 5개 거래처 평수 비중", value: formatPercent(topCustomerShare) },
                { label: "상위 5개 품목 평수 비중", value: formatPercent(topItemShare) },
                { label: "현장 누락률", value: formatPercent(siteMissingRate) }
              ].map((item) => (
                <div key={item.label} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border border-black/5 bg-white px-4 py-3">
                  <span className="text-sm text-[var(--muted)]">{item.label}</span>
                  <strong className="text-sm text-[var(--foreground)]">{item.value}</strong>
                </div>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="집중도 시각화" description="거래처와 품목의 상위 비중을 시각적으로 비교합니다.">
            <div className="space-y-6">
              <div>
                <p className="mb-3 text-sm font-semibold text-[var(--foreground)]">거래처 TOP 5</p>
                <BarList rows={topCustomers.slice(0, 5)} metric="area" emptyMessage="거래처 데이터가 없습니다." />
              </div>
              <div>
                <p className="mb-3 text-sm font-semibold text-[var(--foreground)]">품목 TOP 5</p>
                <BarList rows={topItems.slice(0, 5)} metric="area" emptyMessage="품목 데이터가 없습니다." />
              </div>
            </div>
          </SectionCard>
        </div>
      ) : null}

      {analysisTab === "trend" ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <SectionCard title={`${getGranularityLabel(granularity)}별 ${getMetricLabel(metric)} 추세`} description="현재 기간의 흐름을 순서대로 비교합니다.">
            <BarList
              rows={trendSeries.map((row) => ({
                label: row.label,
                orders: [],
                quantity: row.quantity,
                area: row.area
              }))}
              metric={metric}
              emptyMessage="추세 데이터가 없습니다."
            />
          </SectionCard>
          <SectionCard title="추세 해석 포인트" description="대표 관점에서 현재 추세를 읽을 때 바로 쓸 수 있는 요약입니다.">
            <div className="space-y-3 text-sm leading-6 text-[var(--foreground)]">
              <p>- 현재 분석 기준은 {getDimensionLabel(dimension)}, 지표는 {getMetricLabel(metric)}, 집계 단위는 {getGranularityLabel(granularity)}입니다.</p>
              <p>- 추세가 꺾이는 구간은 수주 변화, 프로젝트 종료, 특정 품목 집중 변화와 같이 해석해야 합니다.</p>
              <p>- 특정 구간 급증은 물량 집중, 마감 일정, 특정 거래처 프로젝트 몰림 가능성을 함께 확인하는 것이 좋습니다.</p>
            </div>
          </SectionCard>
        </div>
      ) : null}

      {analysisTab === "yoy" ? (
        <SectionCard title="전년/전기 대비 비교" description="현재 구간과 직전 동일 길이 구간을 비교해 변화 방향을 봅니다.">
          <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f8fafb] text-xs uppercase tracking-[0.08em] text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3">{getDimensionLabel(dimension)}</th>
                  <th className="px-4 py-3">현재</th>
                  <th className="px-4 py-3">이전</th>
                  <th className="px-4 py-3">증감률</th>
                </tr>
              </thead>
              <tbody>
                {yearOverYearRows.map((row) => (
                  <tr key={row.label} className="border-t border-black/5">
                    <td className="px-4 py-3 font-medium text-[var(--foreground)]">{row.label}</td>
                    <td className="px-4 py-3">{metric === "area" ? row.current.toFixed(1) : formatNumber(row.current)}</td>
                    <td className="px-4 py-3">{metric === "area" ? row.previous.toFixed(1) : formatNumber(row.previous)}</td>
                    <td className={`px-4 py-3 font-semibold ${row.change >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                      {row.change >= 0 ? "▲" : "▼"} {Math.abs(row.change).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ) : null}
    </div>
  );

  const renderDataGrid = () => (
    <SectionCard title="데이터 그리드" description="원본 실적에 가까운 형태로 조회하고 검색합니다.">
      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-black/5 bg-white px-4 py-3">
        <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-[var(--muted)]" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="8.5" cy="8.5" r="5.5" />
          <path d="M12.5 12.5L17 17" strokeLinecap="round" />
        </svg>
        <input
          value={gridSearch}
          onChange={(event) => setGridSearch(event.target.value)}
          placeholder="등록일시, 공정, 제품군, 품목, 거래처, 현장, 라인, 등록자를 검색하세요"
          className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--muted)]"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#f8fafb] text-xs uppercase tracking-[0.08em] text-[var(--muted)]">
            <tr>
              {[
                "등록일시",
                "PID",
                "공정",
                "제품군",
                "품목코드",
                "품명",
                "가로",
                "세로",
                "수량",
                "평수",
                "의뢰번호",
                "NO",
                "거래처",
                "현장",
                "라인",
                "등록자",
                "상태"
              ].map((label) => (
                <th key={label} className="px-4 py-3">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataGridRows.slice(0, 120).map((order) => (
              <tr key={order.id} className="border-t border-black/5">
                <td className="px-4 py-3">{order.created_at.slice(0, 16).replace("T", " ")}</td>
                <td className="px-4 py-3">{order.pid ?? "-"}</td>
                <td className="px-4 py-3">{order.process ?? "-"}</td>
                <td className="px-4 py-3">{order.product_family ?? "-"}</td>
                <td className="px-4 py-3">{order.item_code ?? "-"}</td>
                <td className="px-4 py-3">{order.item_name}</td>
                <td className="px-4 py-3">{formatNumber(order.width)}</td>
                <td className="px-4 py-3">{formatNumber(order.height)}</td>
                <td className="px-4 py-3">{formatNumber(order.quantity)}</td>
                <td className="px-4 py-3">{order.area_pyeong?.toFixed(1) ?? "-"}</td>
                <td className="px-4 py-3">{order.request_no ?? "-"}</td>
                <td className="px-4 py-3">{order.no ?? "-"}</td>
                <td className="px-4 py-3">{order.customer}</td>
                <td className="px-4 py-3">{order.site ?? "-"}</td>
                <td className="px-4 py-3">{order.line ?? "-"}</td>
                <td className="px-4 py-3">{order.registrant ?? "-"}</td>
                <td className="px-4 py-3">{order.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );

  const content =
    menu === "dashboard"
      ? renderDashboard()
      : menu === "analysis"
        ? renderAnalysis()
        : menu === "targets"
          ? <ExecutiveGoalSettings orders={orders} />
          : menu === "data-grid"
            ? renderDataGrid()
            : menu === "import"
              ? <ExistingDataUploadPanel onImportComplete={onImportComplete} />
              : menu === "ai-analysis"
                ? <RepresentativeAiWorkspace />
                : <ExecutiveSettingsPanel />;

  return (
    <ConsoleShell
      role="대표"
      title="생산실적 분석 시스템"
      description="업로드한 파일과 저장된 생산실적을 기준으로 생산 부담과 운영 리스크를 분석합니다."
      menu={executiveMenus}
      activeMenu={menu}
      onMenuChange={setMenu}
      hideNavigation
    >
      {content}
    </ConsoleShell>
  );
}
