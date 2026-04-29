"use client";

import { useMemo, useState } from "react";
import { ConsoleShell } from "@/components/ConsoleShell";
import { ExecutiveGoalSettings } from "@/components/ExecutiveGoalSettings";
import { ExecutiveSettingsPanel } from "@/components/ExecutiveSettingsPanel";
import { ExistingDataUploadPanel } from "@/components/ExistingDataUploadPanel";
import { RepresentativeAiWorkspace } from "@/components/RepresentativeAiWorkspace";
import { SectionCard } from "@/components/SectionCard";
import {
  AnalyticsDimension,
  AnalyticsGranularity,
  AnalyticsMetric,
  AnalyticsRangeKey,
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
  { id: "dashboard", label: "대시보드", description: "대표가 바로 보는 핵심 생산실적 요약입니다." },
  { id: "analysis", label: "다차원 분석", description: "기간, 기준, 지표별로 실적을 교차 분석합니다." },
  { id: "targets", label: "목표 설정", description: "월별 생산 목표를 관리합니다." },
  { id: "data-grid", label: "데이터 그리드", description: "원본에 가까운 형태로 검색하고 조회합니다." },
  { id: "import", label: "데이터 임포트", description: "생산실적 파일을 업로드하고 저장합니다." },
  { id: "ai-analysis", label: "AI 분석", description: "업로드 파일 기반으로 대표용 인사이트를 얻습니다." },
  { id: "settings", label: "설정", description: "AI 분석 기준과 시스템 프롬프트를 관리합니다." }
];

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
            {positive ? "↑" : "↓"} {Math.abs(delta).toFixed(1)}%
          </span>
        ) : null}
      </div>
    </div>
  );
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export function ExecutiveDashboard({
  orders,
  uploadedFiles,
  onImportComplete
}: {
  orders: OrderRecord[];
  uploadedFiles: UploadedAnalysisFile[];
  onImportComplete: (result: UploadImportResult) => Promise<void> | void;
}) {
  const [menu, setMenu] = useState<ExecutiveMenu>("dashboard");
  const [search, setSearch] = useState("");
  const [range, setRange] = useState<AnalyticsRangeKey>("30d");
  const [dimension, setDimension] = useState<AnalyticsDimension>("customer");
  const [metric, setMetric] = useState<AnalyticsMetric>("quantity");
  const [granularity, setGranularity] = useState<AnalyticsGranularity>("month");
  const [analysisSection, setAnalysisSection] = useState<"line" | "product" | "customer" | "time" | "quality">("line");

  const keywordFilteredOrders = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return orders;
    }
    return orders.filter((order) =>
      [order.pid, order.customer, order.site, order.item_name, order.item_code, order.request_no, order.registrant]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [orders, search]);

  const rangedOrders = useMemo(
    () => filterOrdersByRange(keywordFilteredOrders, range),
    [keywordFilteredOrders, range]
  );
  const previousOrders = useMemo(
    () => (range === "all" ? [] : getPreviousPeriodOrders(keywordFilteredOrders, range)),
    [keywordFilteredOrders, range]
  );
  const grouped = useMemo(() => groupOrdersByDimension(rangedOrders, dimension), [rangedOrders, dimension]);
  const productFamilyGroups = useMemo(
    () => groupOrdersByDimension(rangedOrders, "productFamily"),
    [rangedOrders]
  );
  const lineGroups = useMemo(() => groupOrdersByDimension(rangedOrders, "line"), [rangedOrders]);
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

  const topCustomerShare = calculateTopSharePercent(rangedOrders, "customer", 5, "area");
  const topItemShare = calculateTopSharePercent(rangedOrders, "item", 5, "area");
  const topLineShare = calculateTopSharePercent(rangedOrders, "line", 1, "area");
  const topFamilyShare = calculateTopSharePercent(rangedOrders, "productFamily", 1, "area");
  const siteMissingRate = calculateMissingRate(rangedOrders, "site");

  const topGroups = [...grouped]
    .sort((a, b) => (metric === "quantity" ? b.quantity - a.quantity : b.area - a.area))
    .slice(0, 12);
  const topCustomers = useMemo(
    () => groupOrdersByDimension(rangedOrders, "customer").sort((a, b) => b.area - a.area).slice(0, 10),
    [rangedOrders]
  );
  const topItems = useMemo(
    () => groupOrdersByDimension(rangedOrders, "item").sort((a, b) => b.area - a.area).slice(0, 10),
    [rangedOrders]
  );
  const topProductFamilies = [...productFamilyGroups]
    .sort((a, b) => b.area - a.area)
    .slice(0, 6);
  const topLines = [...lineGroups].sort((a, b) => b.area - a.area).slice(0, 6);
  const topItemsByCount = useMemo(
    () => groupOrdersByDimension(rangedOrders, "item").sort((a, b) => b.orders.length - a.orders.length).slice(0, 20),
    [rangedOrders]
  );
  const topSites = useMemo(
    () => groupOrdersByDimension(rangedOrders, "site").sort((a, b) => b.area - a.area).slice(0, 20),
    [rangedOrders]
  );
  const hourlyLoad = useMemo(() => {
    const base = Array.from({ length: 24 }, (_, hour) => ({
      label: `${String(hour).padStart(2, "0")}시`,
      count: 0,
      area: 0
    }));
    const indexMap = new Map(base.map((item, index) => [item.label, index]));
    rangedOrders.forEach((order) => {
      const date = new Date(order.created_at);
      if (Number.isNaN(date.getTime())) {
        return;
      }
      const label = `${String(date.getHours()).padStart(2, "0")}시`;
      const index = indexMap.get(label);
      if (index === undefined) {
        return;
      }
      base[index].count += 1;
      base[index].area += order.area_pyeong || 0;
    });
    return base;
  }, [rangedOrders]);
  const peakHour = useMemo(
    () => [...hourlyLoad].sort((a, b) => b.count - a.count)[0] ?? null,
    [hourlyLoad]
  );
  const peakWorkday = useMemo(() => {
    const map = new Map<string, { count: number; area: number }>();
    rangedOrders.forEach((order) => {
      const label = order.created_at.slice(0, 10);
      const existing = map.get(label) ?? { count: 0, area: 0 };
      existing.count += 1;
      existing.area += order.area_pyeong || 0;
      map.set(label, existing);
    });
    return [...map.entries()]
      .map(([label, value]) => ({ label, ...value }))
      .sort((a, b) => b.count - a.count)[0] ?? null;
  }, [rangedOrders]);
  const afterHoursRate = useMemo(() => {
    if (!rangedOrders.length) {
      return 0;
    }
    const count = rangedOrders.filter((order) => {
      const date = new Date(order.created_at);
      return !Number.isNaN(date.getTime()) && date.getHours() >= 18;
    }).length;
    return (count / rangedOrders.length) * 100;
  }, [rangedOrders]);
  const lineInsights = useMemo(() => {
    return topLines.map((lineGroup) => {
      const lineOrders = rangedOrders.filter((order) => (order.line || "미지정 라인") === lineGroup.label);
      const lineArea = sumMetric(lineOrders, "area");
      const lineQuantity = sumMetric(lineOrders, "quantity");
      const avgAreaValue = lineOrders.length ? lineArea / lineOrders.length : 0;
      const familyGroup = groupOrdersByDimension(lineOrders, "productFamily").sort((a, b) => b.area - a.area)[0];
      const customerGroup = groupOrdersByDimension(lineOrders, "customer").sort((a, b) => b.area - a.area)[0];
      return {
        label: lineGroup.label,
        area: lineArea,
        quantity: lineQuantity,
        count: lineOrders.length,
        averageArea: avgAreaValue,
        topFamily: familyGroup?.label ?? "-",
        topFamilyShare: familyGroup && lineArea ? (familyGroup.area / lineArea) * 100 : 0,
        topCustomer: customerGroup?.label ?? "-",
        topCustomerShare: customerGroup && lineArea ? (customerGroup.area / lineArea) * 100 : 0,
        monthlyTrend: buildTrendSeries(lineOrders, "month").slice(-6)
      };
    });
  }, [rangedOrders, topLines]);

  const riskSignals = useMemo(() => {
    const signals: string[] = [];

    if (topCustomerShare >= 50) {
      signals.push(`상위 5개 거래처가 전체 평수의 ${topCustomerShare.toFixed(1)}%를 차지합니다.`);
    }

    if (topItemShare >= 50) {
      signals.push(`상위 5개 품목이 전체 평수의 ${topItemShare.toFixed(1)}%를 차지합니다.`);
    }

    if (topLineShare >= 60) {
      signals.push(`특정 라인이 전체 평수의 ${topLineShare.toFixed(1)}%를 처리해 라인 편중이 큽니다.`);
    }

    if (siteMissingRate >= 5) {
      signals.push(`현장 누락률이 ${siteMissingRate.toFixed(1)}%라 현장별 분석 신뢰도가 떨어질 수 있습니다.`);
    }

    if (latestSnapshot?.rowsDuplicatePid) {
      signals.push(`최근 업로드에서 PID 중복 ${latestSnapshot.rowsDuplicatePid.toLocaleString()}건이 확인됐습니다.`);
    }

    if (latestSnapshot?.rowsAfterHours) {
      signals.push(`최근 업로드 기준 18시 이후 등록 ${latestSnapshot.rowsAfterHours.toLocaleString()}건이 있습니다.`);
    }

    return signals.slice(0, 4);
  }, [latestSnapshot, siteMissingRate, topCustomerShare, topItemShare, topLineShare]);

  const actionItems = useMemo(() => {
    const actions: string[] = [];

    if (topCustomerShare >= 50) {
      actions.push("상위 거래처 의존도가 높아 고객 포트폴리오 분산 여부를 검토하세요.");
    }

    if (topLineShare >= 60) {
      actions.push("라인별 물량 배분과 작업 난이도 분산 가능성을 확인하세요.");
    }

    if (siteMissingRate >= 5 || (latestSnapshot?.rowsMissingSite ?? 0) > 0) {
      actions.push("현장 미입력 행을 줄여 현장별 실적 추적 정확도를 높이세요.");
    }

    if ((latestSnapshot?.rowsDuplicatePid ?? 0) > 0) {
      actions.push("PID 중복의 원인이 스캔 중복인지 데이터 병합 이슈인지 먼저 확인하세요.");
    }

    if (!actions.length) {
      actions.push("현재 기간에서는 큰 구조 리스크가 두드러지지 않습니다. 상위 제품군과 거래처 추이를 계속 확인하세요.");
    }

    return actions.slice(0, 4);
  }, [latestSnapshot, siteMissingRate, topCustomerShare, topLineShare]);
  const anomalySignals = useMemo(() => {
    const signals: Array<{ title: string; detail: string; tone: "rose" | "amber" | "sky" }> = [];
    const areaChange = calculateChange(totalArea, previousArea);
    const peakHourShare = totalJobs ? ((peakHour?.count ?? 0) / totalJobs) * 100 : 0;

    if (areaChange >= 30) {
      signals.push({
        title: "물량 급증",
        detail: `전기 대비 총 평수가 ${areaChange.toFixed(1)}% 증가했습니다.`,
        tone: "rose"
      });
    }

    if (topLineShare >= 60) {
      signals.push({
        title: "라인 편중",
        detail: `상위 라인이 전체 평수의 ${topLineShare.toFixed(1)}%를 처리하고 있습니다.`,
        tone: "amber"
      });
    }

    if (topCustomerShare >= 50) {
      signals.push({
        title: "거래처 집중",
        detail: `상위 5개 거래처가 전체 평수의 ${topCustomerShare.toFixed(1)}%를 차지합니다.`,
        tone: "amber"
      });
    }

    if (topItemShare >= 50) {
      signals.push({
        title: "품목 집중",
        detail: `상위 5개 품목이 전체 평수의 ${topItemShare.toFixed(1)}%를 차지합니다.`,
        tone: "amber"
      });
    }

    if (siteMissingRate >= 5) {
      signals.push({
        title: "현장 누락 주의",
        detail: `현장 누락률이 ${siteMissingRate.toFixed(1)}%입니다.`,
        tone: "sky"
      });
    }

    if (peakHourShare >= 20 && peakHour) {
      signals.push({
        title: "시간대 병목 가능성",
        detail: `${peakHour.label}에 전체 작업의 ${peakHourShare.toFixed(1)}%가 집중됩니다.`,
        tone: "sky"
      });
    }

    if (topFamilyShare >= 60 && topProductFamilies[0]) {
      signals.push({
        title: "제품군 집중",
        detail: `${topProductFamilies[0].label} 비중이 ${topFamilyShare.toFixed(1)}%입니다.`,
        tone: "amber"
      });
    }

    return signals;
  }, [
    peakHour,
    previousArea,
    siteMissingRate,
    topCustomerShare,
    topFamilyShare,
    topItemShare,
    topLineShare,
    topProductFamilies,
    totalArea,
    totalJobs
  ]);

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {(["7d", "30d", "90d", "180d", "365d", "all"] as AnalyticsRangeKey[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setRange(option)}
            className={[
              "rounded-full px-3 py-1.5 text-xs font-semibold transition",
              range === option ? "bg-[var(--foreground)] text-white" : "bg-white text-[var(--foreground)] ring-1 ring-black/5"
            ].join(" ")}
          >
            {option === "all" ? "전체" : option}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="총 포장 건수" value={formatNumber(totalJobs)} description="기간 내 처리 행 수" delta={calculateChange(totalJobs, previousJobs)} />
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
        <SectionCard title="대표 브리핑" description="업로드 데이터와 최근 실적을 기준으로 가장 먼저 확인할 내용을 정리합니다.">
          <div className="space-y-4">
            <div className="rounded-2xl border border-black/5 bg-white p-4">
              <p className="text-sm font-semibold text-[var(--foreground)]">최근 업로드 기준 요약</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {latestUpload?.summary_text ?? "아직 업로드된 파일 요약이 없습니다."}
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-900">우선 확인 리스크</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-amber-900">
                  {riskSignals.length ? riskSignals.map((signal) => <li key={signal}>- {signal}</li>) : <li>- 현재 기간에서는 즉시 경고할 구조 리스크가 크지 않습니다.</li>}
                </ul>
              </div>
              <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
                <p className="text-sm font-semibold text-sky-900">권장 액션</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-sky-900">
                  {actionItems.map((action) => (
                    <li key={action}>- {action}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="집중도와 품질" description="생산 부담이 어디에 몰리는지, 데이터가 얼마나 신뢰 가능한지 빠르게 확인합니다.">
          <div className="space-y-3">
            {[
              { label: "상위 5개 거래처 평수 비중", value: formatPercent(topCustomerShare) },
              { label: "상위 5개 품목 평수 비중", value: formatPercent(topItemShare) },
              { label: "최상위 라인 평수 비중", value: formatPercent(topLineShare) },
              { label: "최상위 제품군 평수 비중", value: formatPercent(topFamilyShare) },
              { label: "현장 누락률", value: formatPercent(siteMissingRate) },
              {
                label: "최근 업로드 PID 중복",
                value: latestSnapshot ? formatNumber(latestSnapshot.rowsDuplicatePid) : "-"
              }
            ].map((item) => (
              <div key={item.label} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border border-black/5 bg-white px-4 py-3">
                <span className="text-sm text-[var(--muted)]">{item.label}</span>
                <strong className="text-sm text-[var(--foreground)]">{item.value}</strong>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="규칙 기반 이상징후" description="대표가 먼저 확인해야 할 구조적 경고를 자동 감지합니다.">
        <div className="grid gap-4 xl:grid-cols-3">
          {anomalySignals.length ? anomalySignals.map((signal) => (
            <div
              key={signal.title}
              className={`rounded-2xl border px-4 py-4 text-sm leading-6 ${
                signal.tone === "rose"
                  ? "border-rose-200 bg-rose-50 text-rose-900"
                  : signal.tone === "amber"
                    ? "border-amber-200 bg-amber-50 text-amber-900"
                    : "border-sky-200 bg-sky-50 text-sky-900"
              }`}
            >
              <p className="font-semibold">{signal.title}</p>
              <p className="mt-2">{signal.detail}</p>
            </div>
          )) : (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900 xl:col-span-3">
              현재 기간 기준으로 규칙에 걸리는 주요 이상징후는 크지 않습니다.
            </div>
          )}
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard title="월별 추이" description="기간 내 실적을 집계 단위별로 살펴봅니다.">
          <div className="mb-4 flex flex-wrap gap-2">
            {(["day", "week", "month"] as AnalyticsGranularity[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setGranularity(option)}
                className={[
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                  granularity === option ? "bg-[var(--primary)] text-white" : "bg-[#f4f7fb] text-[var(--foreground)]"
                ].join(" ")}
              >
                {option === "day" ? "일별" : option === "week" ? "주별" : "월별"}
              </button>
            ))}
          </div>
          <div className="space-y-3">
            {trendSeries.length ? trendSeries.map((row) => {
              const base = metric === "quantity" ? row.quantity : row.area;
              const max = Math.max(...trendSeries.map((item) => (metric === "quantity" ? item.quantity : item.area)), 1);
              return (
                <div key={row.label} className="grid grid-cols-[7rem_minmax(0,1fr)_5rem] items-center gap-3">
                  <span className="text-sm text-[var(--muted)]">{row.label}</span>
                  <div className="h-3 rounded-full bg-[#edf2f6]">
                    <div className="h-3 rounded-full bg-[var(--primary)]" style={{ width: `${(base / max) * 100}%` }} />
                  </div>
                  <span className="text-right text-sm font-semibold text-[var(--foreground)]">{metric === "quantity" ? formatNumber(row.quantity) : row.area.toFixed(1)}</span>
                </div>
              );
            }) : <p className="text-sm text-[var(--muted)]">표시할 데이터가 없습니다.</p>}
          </div>
        </SectionCard>

        <SectionCard title="제품군 / 라인 부담" description="현재 기간의 주력 제품군과 라인 집중도를 한눈에 비교합니다.">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">제품군 비중</p>
              <div className="mt-3 space-y-3">
                {topProductFamilies.length ? topProductFamilies.map((group) => {
                  const share = totalArea ? (group.area / totalArea) * 100 : 0;
                  return (
                    <div key={group.label} className="grid grid-cols-[8rem_minmax(0,1fr)_4rem] items-center gap-3">
                      <span className="text-sm text-[var(--foreground)]">{group.label}</span>
                      <div className="h-3 rounded-full bg-[#edf2f6]">
                        <div className="h-3 rounded-full bg-[var(--primary)]" style={{ width: `${share}%` }} />
                      </div>
                      <span className="text-right text-sm font-semibold text-[var(--foreground)]">{share.toFixed(1)}%</span>
                    </div>
                  );
                }) : <p className="text-sm text-[var(--muted)]">제품군 데이터가 없습니다.</p>}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">라인 부담</p>
              <div className="mt-3 space-y-3">
                {topLines.length ? topLines.map((group) => {
                  const share = totalArea ? (group.area / totalArea) * 100 : 0;
                  return (
                    <div key={group.label} className="grid grid-cols-[8rem_minmax(0,1fr)_4rem] items-center gap-3">
                      <span className="text-sm text-[var(--foreground)]">{group.label}</span>
                      <div className="h-3 rounded-full bg-[#edf2f6]">
                        <div className="h-3 rounded-full bg-emerald-500" style={{ width: `${share}%` }} />
                      </div>
                      <span className="text-right text-sm font-semibold text-[var(--foreground)]">{share.toFixed(1)}%</span>
                    </div>
                  );
                }) : <p className="text-sm text-[var(--muted)]">라인 데이터가 없습니다.</p>}
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="거래처 TOP 10" description="평수 기준으로 공정 부담이 큰 거래처를 확인합니다.">
          <div className="space-y-3">
            {topCustomers.length ? topCustomers.map((group, index) => {
              const share = totalArea ? (group.area / totalArea) * 100 : 0;
              return (
                <div key={group.label} className="grid grid-cols-[2rem_1fr_5rem] items-center gap-3">
                  <span className="text-xs font-semibold text-[var(--muted)]">{index + 1}</span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">{group.label}</p>
                    <p className="text-xs text-[var(--muted)]">수량 {formatNumber(group.quantity)} / 평수 {group.area.toFixed(1)}</p>
                  </div>
                  <span className="text-right text-sm font-semibold text-[var(--primary)]">{share.toFixed(1)}%</span>
                </div>
              );
            }) : <p className="text-sm text-[var(--muted)]">거래처 데이터가 없습니다.</p>}
          </div>
        </SectionCard>

        <SectionCard title="품목 TOP 10" description="평수 기준으로 가장 많이 처리된 품목을 확인합니다.">
          <div className="space-y-3">
            {topItems.length ? topItems.map((group, index) => {
              const share = totalArea ? (group.area / totalArea) * 100 : 0;
              return (
                <div key={group.label} className="grid grid-cols-[2rem_1fr_5rem] items-center gap-3">
                  <span className="text-xs font-semibold text-[var(--muted)]">{index + 1}</span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">{group.label}</p>
                    <p className="text-xs text-[var(--muted)]">수량 {formatNumber(group.quantity)} / 평수 {group.area.toFixed(1)}</p>
                  </div>
                  <span className="text-right text-sm font-semibold text-[var(--primary)]">{share.toFixed(1)}%</span>
                </div>
              );
            }) : <p className="text-sm text-[var(--muted)]">품목 데이터가 없습니다.</p>}
          </div>
        </SectionCard>
      </div>
    </div>
  );

  const renderLineAnalysis = () => (
    <div className="space-y-6">
      <SectionCard title="라인 분석" description="1-LINE과 2-LINE이 어떤 성격의 물량을 얼마나 처리하는지 비교합니다.">
        <div className="grid gap-4 xl:grid-cols-2">
          {lineInsights.length ? lineInsights.map((line) => (
            <div key={line.label} className="rounded-3xl border border-black/5 bg-white p-5 shadow-[0_18px_60px_rgba(24,39,56,0.08)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">{line.label}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">총 {line.count.toLocaleString()}건 처리</p>
                </div>
                <span className="rounded-full bg-[var(--secondary)] px-3 py-1 text-xs font-semibold text-[var(--foreground)]">
                  평수 {line.area.toFixed(1)}
                </span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-[var(--secondary)] px-4 py-3">
                  <p className="text-xs text-[var(--muted)]">총 수량</p>
                  <p className="mt-1 text-lg font-bold text-[var(--foreground)]">{formatNumber(line.quantity)}</p>
                </div>
                <div className="rounded-2xl bg-[var(--secondary)] px-4 py-3">
                  <p className="text-xs text-[var(--muted)]">평균 평수</p>
                  <p className="mt-1 text-lg font-bold text-[var(--foreground)]">{line.averageArea.toFixed(2)}</p>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm text-[var(--muted)]">
                <p>주요 제품군: <strong className="text-[var(--foreground)]">{line.topFamily}</strong> ({line.topFamilyShare.toFixed(1)}%)</p>
                <p>주요 거래처: <strong className="text-[var(--foreground)]">{line.topCustomer}</strong> ({line.topCustomerShare.toFixed(1)}%)</p>
              </div>
              <div className="mt-4 rounded-2xl border border-black/5 bg-[#fbfcfd] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">최근 6개월 추이</p>
                <div className="mt-3 space-y-2">
                  {line.monthlyTrend.length ? line.monthlyTrend.map((row) => (
                    <div key={`${line.label}-${row.label}`} className="grid grid-cols-[5rem_minmax(0,1fr)_4rem] items-center gap-3">
                      <span className="text-xs text-[var(--muted)]">{row.label}</span>
                      <div className="h-2 rounded-full bg-[#e9eef3]">
                        <div
                          className="h-2 rounded-full bg-[var(--primary)]"
                          style={{ width: `${line.area ? (row.area / line.area) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-right text-xs font-semibold text-[var(--foreground)]">{row.area.toFixed(1)}</span>
                    </div>
                  )) : <p className="text-xs text-[var(--muted)]">추이 데이터가 없습니다.</p>}
                </div>
              </div>
            </div>
          )) : <p className="text-sm text-[var(--muted)]">라인 분석 데이터가 없습니다.</p>}
        </div>
      </SectionCard>

      <SectionCard title="라인별 제품군 / 거래처 비교" description="라인별로 어떤 제품군과 거래처가 부담을 만드는지 비교합니다.">
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-black/5 bg-white p-5">
            <p className="text-sm font-semibold text-[var(--foreground)]">라인별 제품군 구성</p>
            <div className="mt-4 space-y-4">
              {lineInsights.map((line) => (
                <div key={`${line.label}-family`}>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">{line.label}</p>
                  <p className="mt-1 text-sm text-[var(--foreground)]">{line.topFamily}</p>
                  <p className="text-xs text-[var(--muted)]">상위 제품군 비중 {line.topFamilyShare.toFixed(1)}%</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-black/5 bg-white p-5">
            <p className="text-sm font-semibold text-[var(--foreground)]">라인별 거래처 TOP</p>
            <div className="mt-4 space-y-4">
              {lineInsights.map((line) => (
                <div key={`${line.label}-customer`}>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">{line.label}</p>
                  <p className="mt-1 text-sm text-[var(--foreground)]">{line.topCustomer}</p>
                  <p className="text-xs text-[var(--muted)]">상위 거래처 비중 {line.topCustomerShare.toFixed(1)}%</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="라인 해석" description="총 평수뿐 아니라 제품군 구성과 거래처 편중까지 고려해 라인 부담을 해석합니다.">
        <div className="grid gap-4 xl:grid-cols-2">
          {lineInsights.map((line) => (
            <div key={`${line.label}-insight`} className="rounded-2xl border border-black/5 bg-[#fbfcfd] p-5 text-sm leading-6 text-[var(--foreground)]">
              <strong>{line.label}</strong>은 총 평수 {line.area.toFixed(1)}, 총 {line.count.toLocaleString()}건을 처리했습니다.
              {" "}주요 제품군은 <strong>{line.topFamily}</strong>이고, 상위 제품군 비중은 {line.topFamilyShare.toFixed(1)}%입니다.
              {" "}주요 거래처는 <strong>{line.topCustomer}</strong>이며, 이 거래처 비중은 {line.topCustomerShare.toFixed(1)}%입니다.
              {" "}평균 평수는 {line.averageArea.toFixed(2)}로, 동일한 총량이라도 제품군/거래처 구성에 따라 실제 품질관리 부담은 달라질 수 있습니다.
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );

  const renderProductAnalysis = () => (
    <div className="space-y-6">
      <SectionCard title="품목 / 제품군 분석" description="주력 품목과 제품 믹스가 어떤 구조인지 파악합니다.">
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-black/5 bg-white p-5">
            <p className="text-sm font-semibold text-[var(--foreground)]">품목별 총 평수 TOP 20</p>
            <div className="mt-4 space-y-3">
              {topItems.slice(0, 20).map((group, index) => (
                <div key={`${group.label}-area`} className="grid grid-cols-[2rem_1fr_5rem] items-center gap-3">
                  <span className="text-xs font-semibold text-[var(--muted)]">{index + 1}</span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">{group.label}</p>
                    <p className="text-xs text-[var(--muted)]">건수 {formatNumber(group.orders.length)}</p>
                  </div>
                  <span className="text-right text-sm font-semibold text-[var(--primary)]">{group.area.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-black/5 bg-white p-5">
            <p className="text-sm font-semibold text-[var(--foreground)]">품목별 건수 TOP 20</p>
            <div className="mt-4 space-y-3">
              {topItemsByCount.map((group, index) => (
                <div key={`${group.label}-count`} className="grid grid-cols-[2rem_1fr_5rem] items-center gap-3">
                  <span className="text-xs font-semibold text-[var(--muted)]">{index + 1}</span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">{group.label}</p>
                    <p className="text-xs text-[var(--muted)]">평수 {group.area.toFixed(1)}</p>
                  </div>
                  <span className="text-right text-sm font-semibold text-[var(--primary)]">{formatNumber(group.orders.length)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="제품군 구성과 품목 편중" description="제품군 비중과 상위 품목 중심 구조를 함께 봅니다.">
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-black/5 bg-white p-5">
            <p className="text-sm font-semibold text-[var(--foreground)]">제품군별 평수 비중</p>
            <div className="mt-4 space-y-3">
              {topProductFamilies.map((group) => {
                const share = totalArea ? (group.area / totalArea) * 100 : 0;
                return (
                  <div key={`${group.label}-family-share`} className="grid grid-cols-[8rem_minmax(0,1fr)_4rem] items-center gap-3">
                    <span className="text-sm text-[var(--foreground)]">{group.label}</span>
                    <div className="h-3 rounded-full bg-[#edf2f6]">
                      <div className="h-3 rounded-full bg-[var(--primary)]" style={{ width: `${share}%` }} />
                    </div>
                    <span className="text-right text-sm font-semibold text-[var(--foreground)]">{share.toFixed(1)}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-black/5 bg-white p-5">
            <p className="text-sm font-semibold text-[var(--foreground)]">품목별 평균 평수 / 라인 편중도</p>
            <div className="mt-4 space-y-3">
              {topItems.slice(0, 10).map((group) => {
                const average = group.orders.length ? group.area / group.orders.length : 0;
                const topLine = groupOrdersByDimension(group.orders, "line").sort((a, b) => b.area - a.area)[0];
                const concentration = topLine && group.area ? (topLine.area / group.area) * 100 : 0;
                return (
                  <div key={`${group.label}-average`} className="rounded-2xl bg-[var(--secondary)] px-4 py-3">
                    <p className="text-sm font-semibold text-[var(--foreground)]">{group.label}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      평균 평수 {average.toFixed(2)} / 상위 라인 {topLine?.label ?? "-"} {concentration.toFixed(1)}%
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );

  const renderCustomerAnalysis = () => (
    <div className="space-y-6">
      <SectionCard title="거래처 / 현장 분석" description="어떤 거래처와 현장이 포장공정 부담을 크게 만드는지 파악합니다.">
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-black/5 bg-white p-5">
            <p className="text-sm font-semibold text-[var(--foreground)]">거래처별 총 평수 TOP 20</p>
            <div className="mt-4 space-y-3">
              {topCustomers.slice(0, 20).map((group, index) => (
                <div key={`${group.label}-customer-area`} className="grid grid-cols-[2rem_1fr_5rem] items-center gap-3">
                  <span className="text-xs font-semibold text-[var(--muted)]">{index + 1}</span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">{group.label}</p>
                    <p className="text-xs text-[var(--muted)]">건수 {formatNumber(group.orders.length)}</p>
                  </div>
                  <span className="text-right text-sm font-semibold text-[var(--primary)]">{group.area.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-black/5 bg-white p-5">
            <p className="text-sm font-semibold text-[var(--foreground)]">현장별 총 평수 TOP 20</p>
            <div className="mt-4 space-y-3">
              {topSites.map((group, index) => (
                <div key={`${group.label}-site-area`} className="grid grid-cols-[2rem_1fr_5rem] items-center gap-3">
                  <span className="text-xs font-semibold text-[var(--muted)]">{index + 1}</span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">{group.label}</p>
                    <p className="text-xs text-[var(--muted)]">건수 {formatNumber(group.orders.length)}</p>
                  </div>
                  <span className="text-right text-sm font-semibold text-[var(--primary)]">{group.area.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="거래처 의존도와 고객 성격" description="대표 관점에서 고객 집중도와 고객 유형을 빠르게 해석합니다.">
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-black/5 bg-white p-5">
            <p className="text-sm font-semibold text-[var(--foreground)]">거래처별 제품군 구성</p>
            <div className="mt-4 space-y-3">
              {topCustomers.slice(0, 8).map((group) => {
                const family = groupOrdersByDimension(group.orders, "productFamily").sort((a, b) => b.area - a.area)[0];
                const average = group.orders.length ? group.area / group.orders.length : 0;
                return (
                  <div key={`${group.label}-customer-family`} className="rounded-2xl bg-[var(--secondary)] px-4 py-3">
                    <p className="text-sm font-semibold text-[var(--foreground)]">{group.label}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      주력 제품군 {family?.label ?? "-"} / 평균 평수 {average.toFixed(2)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-black/5 bg-white p-5">
            <p className="text-sm font-semibold text-[var(--foreground)]">거래처 해석</p>
            <div className="mt-4 space-y-3">
              {topCustomers.slice(0, 5).map((group) => {
                const share = totalArea ? (group.area / totalArea) * 100 : 0;
                const average = group.orders.length ? group.area / group.orders.length : 0;
                const family = groupOrdersByDimension(group.orders, "productFamily").sort((a, b) => b.area - a.area)[0];
                return (
                  <div key={`${group.label}-customer-insight`} className="rounded-2xl border border-black/5 bg-[#fbfcfd] p-4 text-sm leading-6 text-[var(--foreground)]">
                    <strong>{group.label}</strong>은 전체 평수의 {share.toFixed(1)}%를 차지합니다.
                    {" "}평균 평수는 {average.toFixed(2)}이고, 주력 제품군은 <strong>{family?.label ?? "-"}</strong>입니다.
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );

  const renderTimeAnalysis = () => (
    <div className="space-y-6">
      <SectionCard title="시간대 / 작업 부하 분석" description="등록일시 기준으로 작업이 어느 시간대에 몰리는지 확인합니다.">
        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-2xl border border-black/5 bg-white p-5">
            <p className="text-sm font-semibold text-[var(--foreground)]">시간대별 등록 건수 / 총 평수</p>
            <div className="mt-4 space-y-2">
              {hourlyLoad.map((row) => (
                <div key={row.label} className="grid grid-cols-[4rem_4rem_minmax(0,1fr)_4rem] items-center gap-3">
                  <span className="text-xs text-[var(--muted)]">{row.label}</span>
                  <span className="text-xs text-[var(--foreground)]">{row.count}건</span>
                  <div className="h-2 rounded-full bg-[#edf2f6]">
                    <div
                      className="h-2 rounded-full bg-[var(--primary)]"
                      style={{ width: `${peakHour?.count ? (row.count / peakHour.count) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-right text-xs font-semibold text-[var(--foreground)]">{row.area.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-black/5 bg-white p-5">
            <p className="text-sm font-semibold text-[var(--foreground)]">시간대 핵심 해석</p>
            <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--foreground)]">
              <p>피크 시간대: <strong>{peakHour?.label ?? "-"}</strong></p>
              <p>18시 이후 작업 비중: <strong>{afterHoursRate.toFixed(1)}%</strong></p>
              <p>피크 작업일: <strong>{peakWorkday?.label ?? "-"}</strong> ({peakWorkday?.count ?? 0}건)</p>
              <div className="rounded-2xl bg-[var(--secondary)] p-4 text-[var(--muted)]">
                특정 시간대에 등록이 집중되면 포장, 검수, 출하 마감 단계에서 병목이 발생할 가능성이 있습니다.
              </div>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );

  const renderQualityAnalysis = () => (
    <div className="space-y-6">
      <SectionCard title="데이터 품질 분석" description="누락, 중복, 이상값이 분석 신뢰도에 어떤 영향을 주는지 확인합니다.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="전체 행 수" value={formatNumber(totalJobs)} description="현재 기간 기준" />
          <KpiCard label="현장 누락률" value={formatPercent(siteMissingRate)} description="현장 미입력 비중" />
          <KpiCard label="PID 중복" value={latestSnapshot ? formatNumber(latestSnapshot.rowsDuplicatePid) : "-"} description="최근 업로드 기준" />
          <KpiCard label="이상값 경고" value={latestSnapshot ? formatNumber((latestSnapshot.rowsInvalidWidth ?? 0) + (latestSnapshot.rowsInvalidHeight ?? 0) + (latestSnapshot.rowsInvalidArea ?? 0)) : "-"} description="가로/세로/평수 기준" />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-black/5 bg-white p-5">
            <p className="text-sm font-semibold text-[var(--foreground)]">최근 업로드 품질 스냅샷</p>
            <div className="mt-4 space-y-3 text-sm text-[var(--muted)]">
              {latestSnapshot ? (
                <>
                  <div className="flex items-center justify-between"><span>PID 누락</span><strong className="text-[var(--foreground)]">{latestSnapshot.rowsMissingPid.toLocaleString()}</strong></div>
                  <div className="flex items-center justify-between"><span>현장 미입력</span><strong className="text-[var(--foreground)]">{latestSnapshot.rowsMissingSite.toLocaleString()}</strong></div>
                  <div className="flex items-center justify-between"><span>품명 누락</span><strong className="text-[var(--foreground)]">{latestSnapshot.rowsMissingItemName.toLocaleString()}</strong></div>
                  <div className="flex items-center justify-between"><span>라인 미입력</span><strong className="text-[var(--foreground)]">{latestSnapshot.rowsMissingLine.toLocaleString()}</strong></div>
                  <div className="flex items-center justify-between"><span>가로 이상값</span><strong className="text-[var(--foreground)]">{latestSnapshot.rowsInvalidWidth.toLocaleString()}</strong></div>
                  <div className="flex items-center justify-between"><span>세로 이상값</span><strong className="text-[var(--foreground)]">{latestSnapshot.rowsInvalidHeight.toLocaleString()}</strong></div>
                  <div className="flex items-center justify-between"><span>평수 이상값</span><strong className="text-[var(--foreground)]">{latestSnapshot.rowsInvalidArea.toLocaleString()}</strong></div>
                </>
              ) : (
                <p>최근 업로드 품질 스냅샷이 없습니다.</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-black/5 bg-white p-5">
            <p className="text-sm font-semibold text-[var(--foreground)]">데이터 품질 해석</p>
            <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--foreground)]">
              <p>현장 누락률이 높으면 현장별 실적, 프로젝트별 분석, 향후 클레임 추적 정확도가 떨어질 수 있습니다.</p>
              <p>PID 중복은 스캔 중복, 병합 중복, 재업로드 이슈를 의심할 수 있으므로 업로드 이력과 함께 검토해야 합니다.</p>
              <p>가로/세로/평수 이상값은 품목별 평균 평수와 라인 부담 해석을 왜곡할 수 있으므로 우선 정비 대상입니다.</p>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );

  const renderAnalysis = () => (
    <div className="space-y-6">
      <SectionCard title="분석 영역" description="대표가 확인하려는 축에 맞춰 분석 화면을 전환합니다.">
        <div className="flex flex-wrap gap-2">
          {[
            { id: "line", label: "라인 분석" },
            { id: "product", label: "품목/제품군" },
            { id: "customer", label: "거래처/현장" },
            { id: "time", label: "시간대/부하" },
            { id: "quality", label: "데이터 품질" }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setAnalysisSection(tab.id as typeof analysisSection)}
              className={[
                "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                analysisSection === tab.id ? "bg-[var(--foreground)] text-white" : "bg-white text-[var(--foreground)] ring-1 ring-black/5"
              ].join(" ")}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </SectionCard>

      {analysisSection === "line"
        ? renderLineAnalysis()
        : analysisSection === "product"
          ? renderProductAnalysis()
          : analysisSection === "customer"
            ? renderCustomerAnalysis()
            : analysisSection === "time"
              ? renderTimeAnalysis()
              : renderQualityAnalysis()}

      <SectionCard title="공통 피벗 테이블" description="선택한 기준과 지표로 상위 그룹을 표 형태로 정리합니다.">
        <div className="mb-4 flex flex-wrap gap-3">
          <select value={dimension} onChange={(event) => setDimension(event.target.value as AnalyticsDimension)} className="rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm">
            <option value="customer">거래처</option>
            <option value="site">현장</option>
            <option value="item">품명</option>
            <option value="productFamily">제품군</option>
            <option value="line">라인</option>
            <option value="process">공정</option>
            <option value="registrant">등록자</option>
          </select>
          <select value={metric} onChange={(event) => setMetric(event.target.value as AnalyticsMetric)} className="rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm">
            <option value="quantity">수량</option>
            <option value="area">평수</option>
          </select>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#f8fafb] text-xs uppercase tracking-[0.08em] text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3">기준</th>
                <th className="px-4 py-3">등록 건수</th>
                <th className="px-4 py-3">수량</th>
                <th className="px-4 py-3">평수</th>
              </tr>
            </thead>
            <tbody>
              {topGroups.map((group) => (
                <tr key={group.label} className="border-t border-black/5">
                  <td className="px-4 py-3 font-medium text-[var(--foreground)]">{group.label}</td>
                  <td className="px-4 py-3">{formatNumber(group.orders.length)}</td>
                  <td className="px-4 py-3">{formatNumber(group.quantity)}</td>
                  <td className="px-4 py-3">{group.area.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );

  const renderDataGrid = () => (
    <SectionCard title="데이터 그리드" description="원본 실적에 가까운 형태로 조회하고 검색합니다.">
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
            {rangedOrders.slice(0, 120).map((order) => (
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
      searchPlaceholder="PID, 거래처, 현장, 의뢰번호, 품명을 검색하세요"
      menu={executiveMenus}
      activeMenu={menu}
      onMenuChange={setMenu}
      search={search}
      onSearchChange={setSearch}
    >
      {content}
    </ConsoleShell>
  );
}
