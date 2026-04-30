"use client";

import { useEffect, useState } from "react";
import { ExecutiveDashboard } from "@/components/ExecutiveDashboard";
import { Header } from "@/components/Header";
import { TeamLeadDashboard } from "@/components/TeamLeadDashboard";
import { loadDashboardData, updateOrderStatus } from "@/lib/data-access";
import { supabaseConfig } from "@/lib/supabaseClient";
import type {
  ExecutiveMenu,
  OrderRecord,
  OrderStatus,
  Role,
  TeamLeadMenu,
  UploadedAnalysisFile,
  UploadImportResult
} from "@/lib/types";

const TEAM_LEAD_NAVIGATION: Array<{ id: TeamLeadMenu; label: string }> = [
  { id: "dashboard", label: "대시보드" },
  { id: "projects", label: "프로젝트" },
  { id: "schedule", label: "일정" },
  { id: "teams", label: "팀 관리" },
  { id: "settings", label: "설정" }
];

const EXECUTIVE_NAVIGATION: Array<{ id: ExecutiveMenu; label: string }> = [
  { id: "dashboard", label: "대시보드" },
  { id: "analysis", label: "다차원 분석" },
  { id: "targets", label: "목표 설정" },
  { id: "data-grid", label: "데이터 그리드" },
  { id: "import", label: "데이터 임포트" },
  { id: "ai-analysis", label: "AI 분석" },
  { id: "settings", label: "설정" }
];

export function StaffDashboard() {
  const [role, setRole] = useState<Role>("대표");
  const [teamLeadMenu, setTeamLeadMenu] = useState<TeamLeadMenu>("teams");
  const [executiveMenu, setExecutiveMenu] = useState<ExecutiveMenu>("dashboard");
  const [teamLeadSearch, setTeamLeadSearch] = useState("");
  const [executiveSearch, setExecutiveSearch] = useState("");
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedAnalysisFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  const reloadDashboard = async (nextNotice?: string) => {
    setLoading(true);
    try {
      const data = await loadDashboardData();
      setOrders(data.orders);
      setUploadedFiles(data.uploadedFiles);
      setNotice(nextNotice ?? null);
    } catch {
      setNotice("초기 데이터를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reloadDashboard();
  }, []);

  const handleImportComplete = async (result: UploadImportResult) => {
    await reloadDashboard(
      `${result.insertedUploadRows?.toLocaleString() ?? 0}개 분석 행을 저장했습니다. 주문 테이블 반영 ${result.insertedRows.toLocaleString()}건, 검토 필요 ${result.invalidRows.toLocaleString()}건입니다.`
    );
  };

  const handleOrderStatusChange = async (id: string, status: OrderStatus) => {
    try {
      const updated = await updateOrderStatus(id, status);
      setOrders((current) =>
        current.map((order) => (order.id === id ? { ...order, ...(updated ?? { status }) } : order))
      );
    } catch {
      setNotice("주문 상태 변경에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST"
      });
    } finally {
      window.location.reload();
    }
  };

  const navigationItems = role === "팀장" ? TEAM_LEAD_NAVIGATION : EXECUTIVE_NAVIGATION;
  const activeMenu = role === "팀장" ? teamLeadMenu : executiveMenu;
  const activeSearch = role === "팀장" ? teamLeadSearch : executiveSearch;
  const activeSearchPlaceholder =
    role === "팀장"
      ? "거래처·현장·품명 검색"
      : "거래처·현장·품명 검색";

  return (
    <div className="min-h-screen">
      <Header
        role={role}
        onRoleChange={setRole}
        navigation={
          <nav className="flex items-center gap-0.5">
            {navigationItems.map((item) => {
              const active = item.id === activeMenu;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    role === "팀장"
                      ? setTeamLeadMenu(item.id as TeamLeadMenu)
                      : setExecutiveMenu(item.id as ExecutiveMenu)
                  }
                  className={[
                    "rounded-2xl px-3 py-2 text-sm font-semibold whitespace-nowrap transition",
                    active
                      ? "bg-[var(--foreground)] text-white"
                      : "text-[var(--foreground)] hover:bg-black/5"
                  ].join(" ")}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        }
        searchSlot={
          <label className="flex items-center gap-2 rounded-2xl border border-black/10 bg-white/80 px-3 py-2 shadow-sm backdrop-blur">
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              className="h-4 w-4 shrink-0 text-[var(--muted)]"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <circle cx="8.5" cy="8.5" r="5.5" />
              <path d="M12.5 12.5L17 17" strokeLinecap="round" />
            </svg>
            <input
              value={activeSearch}
              onChange={(event) =>
                role === "팀장" ? setTeamLeadSearch(event.target.value) : setExecutiveSearch(event.target.value)
              }
              placeholder={activeSearchPlaceholder}
              className="w-44 bg-transparent text-sm outline-none placeholder:text-[var(--muted)] xl:w-48"
            />
          </label>
        }
        actionSlot={
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-2xl border border-black/10 bg-white/80 px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] shadow-sm backdrop-blur"
          >
            로그아웃
          </button>
        }
      />

      <main className="mx-auto max-w-7xl px-6 py-6">
        {!supabaseConfig.isConfigured ? (
          <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900">
            Supabase 환경변수가 설정되지 않았습니다. `.env.local`을 확인해 주세요.
          </div>
        ) : null}

        {notice ? (
          <div className="mb-6 rounded-3xl border border-sky-200 bg-sky-50 px-5 py-4 text-sm leading-6 text-sky-900">
            {notice}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-3xl border border-black/5 bg-white px-5 py-10 text-center text-sm text-[var(--muted)]">
            생산실적과 업로드 데이터를 불러오는 중입니다.
          </div>
        ) : role === "팀장" ? (
          <TeamLeadDashboard
            orders={orders}
            onImportComplete={handleImportComplete}
            onStatusChange={handleOrderStatusChange}
            menu={teamLeadMenu}
            onMenuChange={setTeamLeadMenu}
            search={teamLeadSearch}
            onSearchChange={setTeamLeadSearch}
          />
        ) : (
          <ExecutiveDashboard
            orders={orders}
            uploadedFiles={uploadedFiles}
            onImportComplete={handleImportComplete}
            menu={executiveMenu}
            onMenuChange={setExecutiveMenu}
            search={executiveSearch}
            onSearchChange={setExecutiveSearch}
          />
        )}
      </main>
    </div>
  );
}
