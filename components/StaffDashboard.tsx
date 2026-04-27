"use client";

import { useState } from "react";
import { BasicOrderForm } from "@/components/BasicOrderForm";
import { FavoritesPanel } from "@/components/FavoritesPanel";
import { Header } from "@/components/Header";
import { NeedsCheckList } from "@/components/NeedsCheckList";
import { OrderList } from "@/components/OrderList";
import { PlaceholderPanel } from "@/components/PlaceholderPanel";
import { QuickRegister } from "@/components/QuickRegister";
import { supabaseConfig } from "@/lib/supabaseClient";
import type { Role, StaffMenu } from "@/lib/types";

const staffMenus: Array<{ id: StaffMenu; label: string; summary: string }> = [
  { id: "basic", label: "기본 등록", summary: "빠른 문장 입력과 3단계 폼으로 새 주문 등록" },
  { id: "quick", label: "빠른 등록", summary: "기존 거래처와 품목 조합을 불러와 수량만 조정" },
  { id: "orders", label: "주문 목록", summary: "전체 주문 검색, 상태 확인, 수정" },
  { id: "favorites", label: "즐겨찾기", summary: "자주 쓰는 등록 조합 저장 및 재사용" },
  { id: "needs-check", label: "확인필요", summary: "규격 누락 또는 확인 상태 주문 확인" }
];

export function StaffDashboard() {
  const [role, setRole] = useState<Role>("직원");
  const [menu, setMenu] = useState<StaffMenu>("basic");

  const renderContent = () => {
    if (role === "팀장") {
      return (
        <PlaceholderPanel
          title="팀장 화면"
          message="팀장 화면은 추후 오늘 할 일, 납기 임박, 진행 현황을 표시할 예정입니다."
        />
      );
    }

    if (role === "대표") {
      return (
        <PlaceholderPanel
          title="대표 화면"
          message="대표 화면은 추후 전체 주문 현황, 거래처별 주문량, 납기 지연 현황을 표시할 예정입니다."
        />
      );
    }

    switch (menu) {
      case "basic":
        return <BasicOrderForm />;
      case "quick":
        return <QuickRegister />;
      case "orders":
        return <OrderList />;
      case "favorites":
        return <FavoritesPanel />;
      case "needs-check":
        return <NeedsCheckList />;
      default:
        return <BasicOrderForm />;
    }
  };

  return (
    <div className="min-h-screen">
      <Header role={role} onRoleChange={setRole} />
      <main className="mx-auto max-w-7xl px-6 py-8">
        {!supabaseConfig.isConfigured ? (
          <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900">
            Supabase 환경변수가 설정되지 않았습니다. .env.local을 확인하세요.
          </div>
        ) : null}

        {role === "직원" ? (
          <nav className="mb-6 overflow-x-auto rounded-[1.75rem] border border-black/5 bg-white/85 p-2 shadow-[0_12px_30px_rgba(24,39,56,0.06)]">
            <div className="flex min-w-max gap-2">
            {staffMenus.map((item) => {
              const active = item.id === menu;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMenu(item.id)}
                  className={[
                    "rounded-2xl px-5 py-3 text-left transition",
                    active
                      ? "bg-[var(--primary)] text-white shadow-[0_10px_24px_rgba(15,107,97,0.18)]"
                      : "text-[var(--muted)] hover:bg-black/5 hover:text-[var(--foreground)]"
                  ].join(" ")}
                >
                  <p className="text-sm font-semibold">{item.label}</p>
                </button>
              );
            })}
            </div>
          </nav>
        ) : null}

        {renderContent()}

        <section className="mt-6">
          <div className="rounded-[2rem] border border-black/5 bg-[var(--card-strong)] p-6 shadow-[0_18px_60px_rgba(24,39,56,0.08)]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">
              직원용 업무 대시보드
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-[var(--foreground)]">
              엑셀 대신 흐름대로 등록하는 작업관리 화면
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
              반복 입력을 줄이고 직전 주문, 거래처별 최근값, 즐겨찾기 기반 재등록이 쉬운 구조로
              진행합니다.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
