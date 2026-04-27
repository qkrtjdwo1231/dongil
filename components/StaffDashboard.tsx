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

        <section className="mb-6 grid gap-4 xl:grid-cols-[1.25fr_1fr]">
          <div className="rounded-[2rem] border border-black/5 bg-[var(--card-strong)] p-6 shadow-[0_18px_60px_rgba(24,39,56,0.08)]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">
              직원용 업무 대시보드
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-[var(--foreground)]">
              엑셀 대신 흐름대로 등록하는 작업관리 화면
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
              반복 입력을 줄이고 직전 주문, 거래처별 최근값, 즐겨찾기 기반 재등록이 쉬운 구조로
              진행합니다.
            </p>
          </div>
          <div className="rounded-[2rem] border border-black/5 bg-[linear-gradient(135deg,#0f6b61,#153a47)] p-6 text-white shadow-[0_18px_60px_rgba(24,39,56,0.14)]">
            <p className="text-sm font-semibold tracking-[0.08em] text-white/70">현재 역할</p>
            <p className="mt-2 text-3xl font-bold tracking-[-0.04em]">{role}</p>
            <p className="mt-3 text-sm leading-7 text-white/80">
              Auth는 아직 연결하지 않고, 우측 상단 역할 버튼으로 화면 구성을 먼저 검증합니다.
            </p>
          </div>
        </section>

        {role === "직원" ? (
          <nav className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {staffMenus.map((item) => {
              const active = item.id === menu;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMenu(item.id)}
                  className={[
                    "rounded-3xl border p-5 text-left transition",
                    active
                      ? "border-[var(--primary)]/20 bg-[var(--secondary)] shadow-[0_12px_30px_rgba(15,107,97,0.08)]"
                      : "border-black/5 bg-white/80 hover:bg-white"
                  ].join(" ")}
                >
                  <p className="text-base font-semibold text-[var(--foreground)]">{item.label}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.summary}</p>
                </button>
              );
            })}
          </nav>
        ) : null}

        {renderContent()}
      </main>
    </div>
  );
}
