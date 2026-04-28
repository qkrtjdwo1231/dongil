"use client";

import { useEffect, useState } from "react";
import { ExecutiveDashboard } from "@/components/ExecutiveDashboard";
import { Header } from "@/components/Header";
import { TeamLeadDashboard } from "@/components/TeamLeadDashboard";
import { loadDashboardData, updateOrderStatus } from "@/lib/data-access";
import { supabaseConfig } from "@/lib/supabaseClient";
import type { OrderRecord, OrderStatus, Role, UploadImportResult } from "@/lib/types";

export function StaffDashboard() {
  const [role, setRole] = useState<Role>("팀장");
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  const reloadDashboard = async (nextNotice?: string) => {
    setLoading(true);
    try {
      const data = await loadDashboardData();
      setOrders(data.orders);
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
      `${result.insertedRows.toLocaleString()}건 업로드를 완료했습니다. 유효 ${result.validRows.toLocaleString()}건, 검토 필요 ${result.invalidRows.toLocaleString()}건입니다.`
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

  return (
    <div className="min-h-screen">
      <Header role={role} onRoleChange={setRole} />

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
          <TeamLeadDashboard orders={orders} onImportComplete={handleImportComplete} onStatusChange={handleOrderStatusChange} />
        ) : (
          <ExecutiveDashboard orders={orders} onImportComplete={handleImportComplete} />
        )}
      </main>
    </div>
  );
}
