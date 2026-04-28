"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { QuantityInput } from "@/components/QuantityInput";
import { RecentOrderButton } from "@/components/RecentOrderButton";
import { SectionCard } from "@/components/SectionCard";
import { createOrder } from "@/lib/data-access";
import type { BasicOrderDraft, CustomerRecord, ItemRecord, OrderRecord } from "@/lib/types";

type QuickRegisterProps = {
  customers: CustomerRecord[];
  items: ItemRecord[];
  orders: OrderRecord[];
  onOrderCreated: (order: OrderRecord) => void;
};

type CombinationCard = {
  process: string;
  item_name: string;
  width: number | null;
  height: number | null;
  line: string | null;
  count: number;
};

export function QuickRegister({ customers, items, orders, onOrderCreated }: QuickRegisterProps) {
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [selectedSite, setSelectedSite] = useState<string>("");
  const [selectedCard, setSelectedCard] = useState<CombinationCard | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredCustomers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return customers;
    }

    return customers.filter((customer) => customer.name.toLowerCase().includes(keyword));
  }, [customers, search]);

  const customerSites = useMemo(() => {
    if (!selectedCustomer) {
      return [];
    }

    return Array.from(
      new Set(
        orders
          .filter((order) => order.customer === selectedCustomer && order.site)
          .map((order) => order.site as string)
      )
    );
  }, [orders, selectedCustomer]);

  const frequentCards = useMemo(() => {
    if (!selectedCustomer || !selectedSite) {
      return [];
    }

    const relatedOrders = orders.filter(
      (order) => order.customer === selectedCustomer && order.site === selectedSite
    );

    const counts = new Map<string, CombinationCard>();
    relatedOrders.forEach((order) => {
      const key = [
        order.process ?? "",
        order.item_name,
        order.width ?? "",
        order.height ?? "",
        order.line ?? ""
      ].join("|");

      const current = counts.get(key);
      if (current) {
        current.count += 1;
        return;
      }

      counts.set(key, {
        process: order.process ?? "기타",
        item_name: order.item_name,
        width: order.width,
        height: order.height,
        line: order.line,
        count: 1
      });
    });

    return Array.from(counts.values()).sort((a, b) => b.count - a.count);
  }, [orders, selectedCustomer, selectedSite]);

  const latestOrder = orders[0];

  const handleLatestOrder = () => {
    if (!latestOrder) {
      return;
    }

    setSelectedCustomer(latestOrder.customer);
    setSelectedSite(latestOrder.site ?? "");
    setSelectedCard({
      process: latestOrder.process ?? "기타",
      item_name: latestOrder.item_name,
      width: latestOrder.width,
      height: latestOrder.height,
      line: latestOrder.line,
      count: 1
    });
    setQuantity(latestOrder.quantity);
    setMessage("직전 주문을 빠른 등록 기본값으로 불러왔습니다.");
    setError(null);
  };

  const saveQuickOrder = async () => {
    if (!selectedCustomer || !selectedCard) {
      setError("거래처와 등록할 품목 조합을 먼저 선택해 주세요.");
      return;
    }

    const draft: BasicOrderDraft = {
      customer: selectedCustomer,
      site: selectedSite,
      process: selectedCard.process as BasicOrderDraft["process"],
      item_code: "",
      item_name: selectedCard.item_name,
      width: selectedCard.width,
      height: selectedCard.height,
      quantity,
      line: selectedCard.line ?? "",
      request_no: "",
      registrant: "",
      memo: "빠른 등록",
      status: "등록"
    };

    setSaving(true);
    setError(null);

    try {
      const order = await createOrder(draft);
      onOrderCreated(order);
      setMessage("빠른 등록으로 주문을 저장했습니다.");
      setQuantity(1);
    } catch {
      setError("빠른 등록 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard
      title="빠른 등록"
      description="기존 거래처와 현장, 자주 쓰는 품목 조합을 선택하고 수량만 바꿔 빠르게 등록합니다."
      action={<RecentOrderButton onClick={handleLatestOrder} disabled={!latestOrder} />}
    >
      <div className="space-y-5">
        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {message}
          </div>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[0.86fr_1.14fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-black/5 bg-white p-5">
              <label className="space-y-2 text-sm text-[var(--muted)]">
                <span>거래처 검색</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="거래처명을 입력해 주세요"
                  className="w-full rounded-2xl border border-black/10 bg-[#f8fafb] px-4 py-3 text-sm outline-none focus:border-[var(--primary)]"
                />
              </label>
              <div className="mt-4 flex flex-wrap gap-2">
                {filteredCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => {
                      setSelectedCustomer(customer.name);
                      setSelectedSite("");
                      setSelectedCard(null);
                    }}
                    className={[
                      "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                      selectedCustomer === customer.name
                        ? "bg-[var(--primary)] text-white"
                        : "bg-[#f4f7fb] text-[var(--foreground)]"
                    ].join(" ")}
                  >
                    {customer.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-black/5 bg-white p-5">
              <p className="text-sm font-semibold text-[var(--foreground)]">최근 현장 추천</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {customerSites.length ? (
                  customerSites.map((site) => (
                    <button
                      key={site}
                      type="button"
                      onClick={() => {
                        setSelectedSite(site);
                        setSelectedCard(null);
                      }}
                      className={[
                        "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                        selectedSite === site
                          ? "bg-[var(--secondary)] text-[var(--primary)]"
                          : "bg-[#f4f7fb] text-[var(--foreground)]"
                      ].join(" ")}
                    >
                      {site}
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-[var(--muted)]">거래처를 선택하면 최근 현장을 보여줍니다.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-black/5 bg-white p-5">
              <p className="text-sm font-semibold text-[var(--foreground)]">빠른 수량 입력</p>
              <div className="mt-4">
                <QuantityInput value={quantity} onChange={setQuantity} min={1} />
              </div>
              <button
                type="button"
                onClick={saveQuickOrder}
                disabled={saving || !selectedCard}
                className="mt-5 w-full rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "빠른 등록 저장 중..." : "빠른 등록"}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-black/5 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-[var(--foreground)]">자주 쓰는 품목 조합</p>
              <span className="text-xs text-[var(--muted)]">최근 사용 횟수 기준</span>
            </div>

            {selectedCustomer && selectedSite ? (
              <div className="grid gap-3 md:grid-cols-2">
                {frequentCards.map((card) => (
                  <button
                    key={`${card.process}-${card.item_name}-${card.width}-${card.height}-${card.line}`}
                    type="button"
                    onClick={() => setSelectedCard(card)}
                    className={[
                      "rounded-2xl border p-4 text-left transition",
                      selectedCard?.item_name === card.item_name &&
                      selectedCard?.width === card.width &&
                      selectedCard?.height === card.height &&
                      selectedCard?.line === card.line
                        ? "border-[var(--primary)]/30 bg-[var(--secondary)]"
                        : "border-black/10 bg-[#fbfcfd] hover:border-black/20"
                    ].join(" ")}
                  >
                    <p className="text-sm font-semibold text-[var(--foreground)]">{card.process}</p>
                    <p className="mt-2 text-base font-bold text-[var(--foreground)]">{card.item_name}</p>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      {card.width && card.height ? `${card.width} x ${card.height}` : "규격 미입력"}
                    </p>
                    <p className="mt-1 text-sm text-[var(--muted)]">{card.line ?? "라인 미입력"}</p>
                    <p className="mt-3 text-xs font-semibold text-[var(--primary)]">최근 {card.count}회 사용</p>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState
                title="거래처와 현장을 먼저 선택해 주세요"
                description="선택한 거래처와 현장에서 자주 쓰인 품목 조합 카드를 여기에 보여줍니다."
              />
            )}

            {!frequentCards.length && selectedCustomer && selectedSite ? (
              <div className="mt-4">
                <EmptyState
                  title="추천 가능한 조합이 없습니다"
                  description={
                    items.length
                      ? "해당 현장의 주문 이력이 아직 적습니다. 다른 현장을 선택하거나 기본 등록 화면을 이용해 주세요."
                      : "아직 품목 또는 주문 데이터가 충분하지 않습니다."
                  }
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
