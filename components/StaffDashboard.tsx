"use client";

import { useEffect, useState } from "react";
import { BasicOrderForm } from "@/components/BasicOrderForm";
import { ExistingDataUploadPanel } from "@/components/ExistingDataUploadPanel";
import { FavoritesPanel } from "@/components/FavoritesPanel";
import { Header } from "@/components/Header";
import { NeedsCheckList } from "@/components/NeedsCheckList";
import { OrderList } from "@/components/OrderList";
import { PlaceholderPanel } from "@/components/PlaceholderPanel";
import { QuickRegister } from "@/components/QuickRegister";
import { loadDashboardData, updateOrderStatus } from "@/lib/data-access";
import { favoriteToDraft } from "@/lib/order-helpers";
import { supabaseConfig } from "@/lib/supabaseClient";
import type {
  BasicOrderDraft,
  CustomerRecord,
  FavoriteRecord,
  ItemRecord,
  OrderRecord,
  OrderStatus,
  Role,
  StaffMenu,
  UploadImportResult
} from "@/lib/types";

const staffMenus: Array<{ id: StaffMenu; label: string }> = [
  { id: "basic", label: "기본 등록" },
  { id: "quick", label: "빠른 등록" },
  { id: "orders", label: "주문 목록" },
  { id: "needs-check", label: "체크리스트" },
  { id: "favorites", label: "즐겨찾기" },
  { id: "import", label: "파일 업로드" }
];

function synthesizeCustomers(existing: CustomerRecord[], orders: OrderRecord[]) {
  const known = new Map(existing.map((customer) => [customer.name, customer]));
  const created: CustomerRecord[] = [...existing];

  orders.forEach((order) => {
    if (!known.has(order.customer)) {
      const customer: CustomerRecord = {
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        name: order.customer,
        default_site: order.site,
        default_line: order.line,
        memo: "주문 데이터에서 자동 생성"
      };
      known.set(customer.name, customer);
      created.push(customer);
    }
  });

  return created.sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

export function StaffDashboard() {
  const [role, setRole] = useState<Role>("직원");
  const [menu, setMenu] = useState<StaffMenu>("basic");
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [items, setItems] = useState<ItemRecord[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [favorites, setFavorites] = useState<FavoriteRecord[]>([]);
  const [presetDraft, setPresetDraft] = useState<BasicOrderDraft | null>(null);
  const [presetVersion, setPresetVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  const reloadDashboard = async (nextNotice?: string) => {
    setLoading(true);

    try {
      const data = await loadDashboardData();
      setOrders(data.orders);
      setItems(data.items);
      setFavorites(data.favorites);
      setCustomers(synthesizeCustomers(data.customers, data.orders));
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

  const handleOrderCreated = (order: OrderRecord) => {
    setOrders((current) => [order, ...current]);
    setCustomers((current) => synthesizeCustomers(current, [order]));
  };

  const handleFavoriteCreated = (favorite: FavoriteRecord) => {
    setFavorites((current) => [favorite, ...current]);
  };

  const handleFavoriteLoad = (favorite: FavoriteRecord) => {
    setPresetDraft(favoriteToDraft(favorite));
    setPresetVersion((current) => current + 1);
    setMenu("basic");
  };

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
      case "import":
        return <ExistingDataUploadPanel onImportComplete={handleImportComplete} />;
      case "basic":
        return (
          <BasicOrderForm
            customers={customers}
            orders={orders}
            presetDraft={presetDraft}
            presetVersion={presetVersion}
            onOrderCreated={handleOrderCreated}
            onFavoriteCreated={handleFavoriteCreated}
          />
        );
      case "quick":
        return (
          <QuickRegister
            customers={customers}
            items={items}
            orders={orders}
            onOrderCreated={handleOrderCreated}
          />
        );
      case "orders":
        return <OrderList orders={orders} onStatusChange={handleOrderStatusChange} />;
      case "favorites":
        return (
          <FavoritesPanel
            favorites={favorites}
            onLoadFavorite={handleFavoriteLoad}
            onOrderCreated={handleOrderCreated}
          />
        );
      case "needs-check":
        return <NeedsCheckList orders={orders} onStatusChange={handleOrderStatusChange} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen">
      <Header
        role={role}
        onRoleChange={setRole}
        navigation={
          role === "직원" ? (
            <nav className="overflow-x-auto">
              <div className="flex min-w-max items-center gap-1 pl-6">
                {staffMenus.map((item) => {
                  const active = item.id === menu;
                  const isUpload = item.id === "import";

                  return (
                    <div key={item.id} className={`flex items-center ${isUpload ? "ml-auto pl-6" : ""}`}>
                      <button
                        type="button"
                        onClick={() => setMenu(item.id)}
                        className={[
                          "rounded-full px-4 py-2 text-sm font-medium tracking-[-0.01em] transition-all",
                          active
                            ? "bg-[var(--secondary)] text-[var(--primary)] shadow-sm"
                            : "text-[#51606f] hover:bg-black/5 hover:text-[var(--foreground)]"
                        ].join(" ")}
                      >
                        {item.label}
                      </button>
                    </div>
                  );
                })}
              </div>
            </nav>
          ) : undefined
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
            주문 데이터와 거래처 정보를 불러오는 중입니다.
          </div>
        ) : (
          renderContent()
        )}

        <section className="mt-6">
          <div className="rounded-[2rem] border border-black/5 bg-[var(--card-strong)] p-6 shadow-[0_18px_60px_rgba(24,39,56,0.08)]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">
              직원용 업무 대시보드
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-[var(--foreground)]">
              작업 흐름 중심으로 등록하는 작업관리 화면
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
              반복 입력을 줄이고 직전 주문, 거래처별 최근값, 즐겨찾기, 파일 업로드 기반 조회를 한 흐름 안에서 빠르게 처리할 수 있도록 구성했습니다.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
