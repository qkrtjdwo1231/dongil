"use client";

import { useMemo, useState } from "react";
import { ConsoleShell } from "@/components/ConsoleShell";
import { EmptyState } from "@/components/EmptyState";
import { ExistingDataUploadPanel } from "@/components/ExistingDataUploadPanel";
import { SectionCard } from "@/components/SectionCard";
import { StatusBadge } from "@/components/StatusBadge";
import {
  getTodayOrders,
  getUniqueCount,
  groupOrdersByDimension,
  sumMetric
} from "@/lib/analytics";
import { formatDateTime, formatNumber, joinText } from "@/lib/utils";
import type { OrderRecord, OrderStatus, TeamLeadMenu, UploadImportResult } from "@/lib/types";

const teamLeadMenus: Array<{ id: TeamLeadMenu; label: string; description: string }> = [
  { id: "dashboard", label: "대시보드", description: "오늘 작업 현황과 우선 처리 대상을 봅니다." },
  { id: "projects", label: "프로젝트", description: "현장과 거래처별 진행 상황을 확인합니다." },
  { id: "schedule", label: "일정", description: "최근 등록 흐름과 라인별 일정을 봅니다." },
  { id: "teams", label: "팀 관리", description: "등록자와 라인 단위 작업량을 관리합니다." },
  { id: "settings", label: "설정", description: "업로드 검토, 챗봇, 운영 기준을 관리합니다." }
];

function KpiCard({ label, value, help }: { label: string; value: string; help: string }) {
  return (
    <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-[0_18px_60px_rgba(24,39,56,0.08)]">
      <p className="text-sm font-medium text-[var(--muted)]">{label}</p>
      <p className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[var(--foreground)]">{value}</p>
      <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{help}</p>
    </div>
  );
}

type TeamLeadDashboardProps = {
  orders: OrderRecord[];
  onImportComplete: (result: UploadImportResult) => Promise<void> | void;
  onStatusChange: (id: string, status: OrderStatus) => void;
};

export function TeamLeadDashboard({ orders, onImportComplete, onStatusChange }: TeamLeadDashboardProps) {
  const [menu, setMenu] = useState<TeamLeadMenu>("teams");
  const [search, setSearch] = useState("");

  const filteredOrders = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return orders;
    }

    return orders.filter((order) =>
      [order.pid, order.customer, order.site, order.item_name, order.request_no, order.registrant]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [orders, search]);

  const todayOrders = useMemo(() => getTodayOrders(filteredOrders), [filteredOrders]);
  const lineGroups = useMemo(() => groupOrdersByDimension(filteredOrders, "line"), [filteredOrders]);
  const teamGroups = useMemo(() => groupOrdersByDimension(filteredOrders, "registrant"), [filteredOrders]);
  const projectGroups = useMemo(() => {
    const map = new Map<string, OrderRecord[]>();
    filteredOrders.forEach((order) => {
      const key = joinText([order.customer, order.site]) || "미지정 프로젝트";
      const items = map.get(key) ?? [];
      items.push(order);
      map.set(key, items);
    });
    return [...map.entries()]
      .map(([name, items]) => ({
        name,
        latest: items[0]?.created_at ?? null,
        quantity: sumMetric(items, "quantity"),
        count: items.length,
        status: items.some((item) => item.status === "확인필요")
          ? "확인필요"
          : items.some((item) => item.status === "진행")
            ? "진행"
            : items[0]?.status ?? "등록"
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredOrders]);

  const urgentOrders = useMemo(
    () => filteredOrders.filter((order) => order.status === "확인필요" || !order.width || !order.height).slice(0, 8),
    [filteredOrders]
  );

  const scheduleRows = useMemo(
    () => [...filteredOrders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 12),
    [filteredOrders]
  );

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="오늘 등록 건수" value={formatNumber(todayOrders.length)} help="가장 최근 작업일 기준 등록 건수" />
        <KpiCard label="오늘 생산 수량" value={formatNumber(sumMetric(todayOrders, "quantity"))} help="오늘 누적 생산 수량" />
        <KpiCard label="확인 필요 건수" value={formatNumber(urgentOrders.length)} help="규격 누락 또는 확인 필요 상태" />
        <KpiCard label="진행 프로젝트" value={formatNumber(projectGroups.length)} help="현재 검색 조건 기준 프로젝트 수" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="우선 확인 목록" description="라인 누락, 규격 누락, 확인필요 상태를 먼저 점검합니다.">
          <div className="space-y-3">
            {urgentOrders.length ? urgentOrders.map((order) => (
              <div key={order.id} className="rounded-2xl border border-black/5 bg-white px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--primary)]">{order.customer}</p>
                    <p className="mt-1 text-base font-semibold text-[var(--foreground)]">{order.item_name}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">{joinText([order.site, order.line, order.pid]) || "세부 정보 없음"}</p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
              </div>
            )) : <EmptyState title="확인할 주문이 없습니다" description="현재 검색 조건에서는 긴급 점검 항목이 보이지 않습니다." />}
          </div>
        </SectionCard>

        <SectionCard title="라인별 작업량" description="라인 단위로 누적 수량과 건수를 파악합니다.">
          <div className="space-y-3">
            {lineGroups.map((line) => (
              <div key={line.label} className="rounded-2xl border border-black/5 bg-white px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">{line.label}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">등록 {formatNumber(line.orders.length)}건</p>
                  </div>
                  <p className="text-lg font-bold text-[var(--primary)]">{formatNumber(line.quantity)}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );

  const renderProjects = () => (
    <SectionCard title="프로젝트" description="거래처와 현장 조합 기준으로 실적을 묶어 관리합니다.">
      <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#f8fafb] text-xs uppercase tracking-[0.08em] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">프로젝트</th>
              <th className="px-4 py-3">등록 건수</th>
              <th className="px-4 py-3">수량</th>
              <th className="px-4 py-3">최근 등록</th>
              <th className="px-4 py-3">상태</th>
            </tr>
          </thead>
          <tbody>
            {projectGroups.map((project) => (
              <tr key={project.name} className="border-t border-black/5">
                <td className="px-4 py-3 font-medium text-[var(--foreground)]">{project.name}</td>
                <td className="px-4 py-3">{formatNumber(project.count)}</td>
                <td className="px-4 py-3">{formatNumber(project.quantity)}</td>
                <td className="px-4 py-3">{formatDateTime(project.latest)}</td>
                <td className="px-4 py-3"><StatusBadge status={project.status as OrderStatus} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );

  const renderSchedule = () => (
    <SectionCard title="일정" description="최근 등록 흐름을 기준으로 작업 순서를 빠르게 훑어봅니다.">
      <div className="space-y-3">
        {scheduleRows.map((order) => (
          <div key={order.id} className="rounded-2xl border border-black/5 bg-white px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">{order.item_name}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{joinText([order.customer, order.site, order.line])}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-[var(--primary)]">{formatDateTime(order.created_at)}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">PID {order.pid ?? "-"}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );

  const renderTeams = () => (
    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <SectionCard title="팀 관리" description="등록자별 처리 건수와 누적 수량을 확인합니다.">
        <div className="space-y-3">
          {teamGroups.map((team) => (
            <div key={team.label} className="rounded-2xl border border-black/5 bg-white px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">{team.label}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">등록 {formatNumber(team.orders.length)}건</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-[var(--primary)]">{formatNumber(team.quantity)}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">누적 수량</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="조직 개요" description="팀장 화면에서 바로 볼 만한 운영 지표를 요약합니다.">
        <div className="grid gap-4 sm:grid-cols-2">
          <KpiCard label="등록자 수" value={formatNumber(getUniqueCount(filteredOrders.map((order) => order.registrant)))} help="검색 조건 기준 작업자 수" />
          <KpiCard label="활성 라인 수" value={formatNumber(getUniqueCount(filteredOrders.map((order) => order.line)))} help="최근 등록된 라인 수" />
        </div>
      </SectionCard>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <SectionCard title="설정" description="팀장 운영 화면에서 확인할 기준을 정리합니다.">
        <div className="space-y-4 rounded-2xl border border-black/5 bg-white p-5">
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">현재 검색 기반 운영</p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              팀장 화면은 PID, 거래처, 현장, 의뢰번호, 등록자를 기준으로 바로 검색할 수 있게 구성했습니다. 추후 알림 기준과 라인 SLA를 추가할 수 있습니다.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-[var(--secondary)] px-4 py-4 text-sm text-[var(--muted)]">확인 필요 상태를 최우선 카드로 노출</div>
            <div className="rounded-2xl bg-[var(--secondary)] px-4 py-4 text-sm text-[var(--muted)]">프로젝트와 팀 관리를 별도 페이지로 분리</div>
          </div>
        </div>
      </SectionCard>

      <ExistingDataUploadPanel onImportComplete={onImportComplete} />

      <SectionCard title="상태 변경 바로가기" description="팀장 화면에서도 업로드 후 필요한 주문 상태를 바로 정리할 수 있습니다.">
        <div className="space-y-3">
          {filteredOrders.filter((order) => order.status === "확인필요").slice(0, 6).map((order) => (
            <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/5 bg-white px-4 py-4">
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">{order.item_name}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">{joinText([order.customer, order.site, order.pid])}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => onStatusChange(order.id, "진행")} className="rounded-xl bg-sky-100 px-3 py-1.5 text-xs font-semibold text-sky-800">진행 전환</button>
                <button type="button" onClick={() => onStatusChange(order.id, "완료")} className="rounded-xl bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800">완료 전환</button>
              </div>
            </div>
          ))}
          {!filteredOrders.some((order) => order.status === "확인필요") ? (
            <EmptyState title="정리할 확인필요 주문이 없습니다" description="현재 검색 조건에서는 상태 변경이 필요한 주문이 보이지 않습니다." />
          ) : null}
        </div>
      </SectionCard>
    </div>
  );

  const content =
    menu === "dashboard"
      ? renderDashboard()
      : menu === "projects"
        ? renderProjects()
        : menu === "schedule"
          ? renderSchedule()
          : menu === "teams"
            ? renderTeams()
            : renderSettings();

  return (
    <ConsoleShell
      role="팀장"
      title="팀 관리"
      description="시공팀, 라인, 프로젝트 흐름을 한 화면 구조 안에서 관리합니다."
      searchPlaceholder="PID, 거래처, 현장, 품명, 등록자를 검색하세요"
      menu={teamLeadMenus}
      activeMenu={menu}
      onMenuChange={setMenu}
      search={search}
      onSearchChange={setSearch}
    >
      {content}
    </ConsoleShell>
  );
}
