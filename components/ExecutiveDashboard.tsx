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
  filterOrdersByRange,
  getPreviousPeriodOrders,
  getTodayOrders,
  getUniqueCount,
  groupOrdersByDimension,
  sumMetric
} from "@/lib/analytics";
import { formatNumber } from "@/lib/utils";
import type { ExecutiveMenu, OrderRecord, UploadImportResult } from "@/lib/types";

const executiveMenus: Array<{ id: ExecutiveMenu; label: string; description: string }> = [
  { id: "dashboard", label: "대시보드", description: "대표가 바로 보는 핵심 생산실적 요약입니다." },
  { id: "analysis", label: "다차원 분석", description: "기간, 기준, 지표별로 실적을 교차 분석합니다." },
  { id: "targets", label: "목표 설정", description: "월별 생산 목표를 관리합니다." },
  { id: "data-grid", label: "데이터 그리드", description: "원본에 가까운 형태로 검색하고 조회합니다." },
  { id: "import", label: "데이터 임포트", description: "생산실적 파일을 업로드하고 저장합니다." },
  { id: "ai-analysis", label: "AI 분석", description: "업로드 파일 기반으로 대표용 인사이트를 얻습니다." },
  { id: "settings", label: "설정", description: "AI 분석 기준과 시스템 프롬프트를 관리합니다." }
];

function KpiCard({ label, value, previousLabel, delta }: { label: string; value: string; previousLabel: string; delta: number }) {
  const positive = delta >= 0;

  return (
    <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-[0_18px_60px_rgba(24,39,56,0.08)]">
      <p className="text-sm font-medium text-[var(--muted)]">{label}</p>
      <p className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[var(--foreground)]">{value}</p>
      <div className="mt-3 flex items-center justify-between gap-3 text-xs">
        <span className="text-[var(--muted)]">전기: {previousLabel}</span>
        <span className={positive ? "font-semibold text-emerald-700" : "font-semibold text-rose-700"}>
          {positive ? "↑" : "↓"} {Math.abs(delta).toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

export function ExecutiveDashboard({
  orders,
  onImportComplete
}: {
  orders: OrderRecord[];
  onImportComplete: (result: UploadImportResult) => Promise<void> | void;
}) {
  const [menu, setMenu] = useState<ExecutiveMenu>("dashboard");
  const [search, setSearch] = useState("");
  const [range, setRange] = useState<AnalyticsRangeKey>("30d");
  const [dimension, setDimension] = useState<AnalyticsDimension>("customer");
  const [metric, setMetric] = useState<AnalyticsMetric>("quantity");
  const [granularity, setGranularity] = useState<AnalyticsGranularity>("month");

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

  const rangedOrders = useMemo(() => filterOrdersByRange(keywordFilteredOrders, range), [keywordFilteredOrders, range]);
  const previousOrders = useMemo(() => (range === "all" ? [] : getPreviousPeriodOrders(keywordFilteredOrders, range)), [keywordFilteredOrders, range]);
  const grouped = useMemo(() => groupOrdersByDimension(rangedOrders, dimension), [rangedOrders, dimension]);
  const trendSeries = useMemo(() => buildTrendSeries(rangedOrders, granularity), [rangedOrders, granularity]);
  const todayOrders = useMemo(() => getTodayOrders(keywordFilteredOrders), [keywordFilteredOrders]);

  const totalQuantity = sumMetric(rangedOrders, "quantity");
  const totalArea = sumMetric(rangedOrders, "area");
  const totalCustomers = getUniqueCount(rangedOrders.map((order) => order.customer));
  const todayQuantity = sumMetric(todayOrders, "quantity");

  const previousQuantity = sumMetric(previousOrders, "quantity");
  const previousArea = sumMetric(previousOrders, "area");
  const previousCustomers = getUniqueCount(previousOrders.map((order) => order.customer));

  const topGroups = [...grouped]
    .sort((a, b) => (metric === "quantity" ? b.quantity - a.quantity : b.area - a.area))
    .slice(0, 12);

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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="총 생산 수량" value={formatNumber(totalQuantity)} previousLabel={formatNumber(previousQuantity)} delta={calculateChange(totalQuantity, previousQuantity)} />
        <KpiCard label="총 생산 평수" value={totalArea.toFixed(1)} previousLabel={previousArea.toFixed(1)} delta={calculateChange(totalArea, previousArea)} />
        <KpiCard label="거래처 수" value={formatNumber(totalCustomers)} previousLabel={formatNumber(previousCustomers)} delta={calculateChange(totalCustomers, previousCustomers)} />
        <KpiCard label="오늘 생산량" value={formatNumber(todayQuantity)} previousLabel="최근 작업일 기준" delta={todayQuantity ? 100 : 0} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard title="월별 추이" description="기간 내 실적을 집계 단위별로 살펴봅니다.">
          <div className="mb-4 flex flex-wrap gap-2">
            {(["day", "week", "month"] as AnalyticsGranularity[]).map((option) => (
              <button key={option} type="button" onClick={() => setGranularity(option)} className={["rounded-full px-3 py-1.5 text-xs font-semibold transition", granularity === option ? "bg-[var(--primary)] text-white" : "bg-[#f4f7fb] text-[var(--foreground)]"].join(" ")}>
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

        <SectionCard title="거래처 집중도" description="대표가 빠르게 볼 수 있도록 상위 그룹만 정리합니다.">
          <div className="space-y-3">
            {topGroups.length ? topGroups.slice(0, 8).map((group, index) => (
              <div key={group.label} className="rounded-2xl border border-black/5 bg-white px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">TOP {index + 1}</p>
                    <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">{group.label}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-[var(--primary)]">{metric === "quantity" ? formatNumber(group.quantity) : group.area.toFixed(1)}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">{metric === "quantity" ? "누적 수량" : "누적 평수"}</p>
                  </div>
                </div>
              </div>
            )) : <p className="text-sm text-[var(--muted)]">거래처 집중도 데이터가 없습니다.</p>}
          </div>
        </SectionCard>
      </div>
    </div>
  );

  const renderAnalysis = () => (
    <div className="space-y-6">
      <SectionCard title="다차원 분석" description="기간별, 거래처별, 품목별 생산 현황을 분석합니다.">
        <div className="flex flex-wrap gap-3">
          <select value={dimension} onChange={(event) => setDimension(event.target.value as AnalyticsDimension)} className="rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm">
            <option value="customer">거래처</option>
            <option value="site">현장</option>
            <option value="item">품명</option>
            <option value="line">라인</option>
            <option value="process">공정</option>
            <option value="registrant">등록자</option>
          </select>
          <select value={metric} onChange={(event) => setMetric(event.target.value as AnalyticsMetric)} className="rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm">
            <option value="quantity">수량</option>
            <option value="area">평수</option>
          </select>
        </div>
      </SectionCard>

      <SectionCard title="피벗 테이블" description="선택한 기준과 지표로 상위 그룹을 표 형태로 정리합니다.">
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
              {["등록일시", "PID", "공정", "품목코드", "품명", "가로", "세로", "수량", "평수", "의뢰번호", "NO", "거래처", "현장", "라인", "등록자", "상태"].map((label) => (
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
          ? <ExecutiveGoalSettings />
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
      description="업로드한 파일과 저장된 생산실적을 기준으로 경영 지표를 분석합니다."
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
