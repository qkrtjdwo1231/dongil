"use client";

import { useEffect, useMemo, useState } from "react";
import { QuantityInput } from "@/components/QuantityInput";
import { RecentOrderButton } from "@/components/RecentOrderButton";
import { SectionCard } from "@/components/SectionCard";
import { calculateAreaPyeong } from "@/lib/calculations";
import { PROCESS_OPTIONS, STATUS_OPTIONS } from "@/lib/constants";
import { createFavorite, createOrder } from "@/lib/data-access";
import { createEmptyOrderDraft, cloneLatestOrderToDraft } from "@/lib/order-helpers";
import { parseQuickOrderText } from "@/lib/parsers";
import { buildCustomerRecommendations } from "@/lib/recommendation";
import type {
  BasicOrderDraft,
  CustomerRecord,
  FavoriteRecord,
  OrderRecord
} from "@/lib/types";

type BasicOrderFormProps = {
  customers: CustomerRecord[];
  orders: OrderRecord[];
  presetDraft?: BasicOrderDraft | null;
  presetVersion?: number;
  onOrderCreated: (order: OrderRecord) => void;
  onFavoriteCreated: (favorite: FavoriteRecord) => void;
};

function toNumberOrNull(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function BasicOrderForm({
  customers,
  orders,
  presetDraft,
  presetVersion = 0,
  onOrderCreated,
  onFavoriteCreated
}: BasicOrderFormProps) {
  const [draft, setDraft] = useState<BasicOrderDraft>(createEmptyOrderDraft());
  const [quickText, setQuickText] = useState("");
  const [saving, setSaving] = useState(false);
  const [favoriteSaving, setFavoriteSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (presetDraft) {
      setDraft(presetDraft);
      setMessage("다른 화면에서 선택한 데이터를 기본 등록 폼에 불러왔습니다.");
      setError(null);
    }
  }, [presetDraft, presetVersion]);

  const areaPyeong = useMemo(
    () => calculateAreaPyeong(draft.width, draft.height, draft.quantity),
    [draft.height, draft.quantity, draft.width]
  );

  const latestOrder = orders[0];

  const recommendations = useMemo(() => {
    if (!draft.customer.trim()) {
      return null;
    }

    return buildCustomerRecommendations(draft.customer.trim(), orders);
  }, [draft.customer, orders]);

  const recentOrders = useMemo(() => {
    if (!draft.customer.trim()) {
      return [];
    }

    return orders.filter((order) => order.customer === draft.customer.trim()).slice(0, 5);
  }, [draft.customer, orders]);

  const updateDraft = <K extends keyof BasicOrderDraft>(key: K, value: BasicOrderDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const applyQuickParse = () => {
    const result = parseQuickOrderText(quickText);
    const matchedCustomer = customers.find((customer) => result.originalText.includes(customer.name));

    setDraft((current) => ({
      ...current,
      customer: matchedCustomer?.name ?? current.customer,
      item_name: result.itemNameCandidate || current.item_name,
      memo: result.memoCandidate || current.memo,
      width: result.width ?? current.width,
      height: result.height ?? current.height,
      quantity: result.quantity ?? current.quantity,
      line: result.line ?? current.line
    }));
    setMessage("빠른 문장 입력 내용을 폼에 반영했습니다.");
    setError(null);
  };

  const applyLatestOrder = () => {
    if (!latestOrder) {
      setError("불러올 직전 주문이 없습니다.");
      return;
    }

    setDraft(cloneLatestOrderToDraft(latestOrder));
    setMessage("직전 주문을 불러왔습니다. 필요한 항목만 수정 후 다시 등록할 수 있습니다.");
    setError(null);
  };

  const saveFavorite = async () => {
    if (!draft.customer.trim() || !draft.item_name.trim()) {
      setError("즐겨찾기 저장 전에는 최소 거래처와 품명을 입력해 주세요.");
      return;
    }

    setFavoriteSaving(true);
    setError(null);

    try {
      const createdFavorite = await createFavorite(draft);
      onFavoriteCreated(createdFavorite);
      setMessage("현재 입력값을 즐겨찾기로 저장했습니다.");
    } catch {
      setError("즐겨찾기 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setFavoriteSaving(false);
    }
  };

  const saveOrder = async () => {
    setMessage(null);

    if (!draft.customer.trim() || !draft.item_name.trim() || !draft.quantity) {
      setError("거래처, 품명, 수량은 필수 입력입니다.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const createdOrder = await createOrder(draft);
      onOrderCreated(createdOrder);
      setDraft(createEmptyOrderDraft());
      setQuickText("");
      setMessage("주문이 등록되었습니다.");
    } catch {
      setError("주문 저장에 실패했습니다. Supabase 연결 상태를 확인해 주세요.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard
      title="기본 등록"
      description="빠른 문장 입력과 3단계 등록 폼을 결합한 직원용 주문 등록 화면입니다."
      action={<RecentOrderButton onClick={applyLatestOrder} disabled={!latestOrder} />}
    >
      <div className="space-y-6">
        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-900">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900">
            {message}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.05fr_1.2fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-black/5 bg-white p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">빠른 문장 입력</h3>
                <button
                  type="button"
                  onClick={applyQuickParse}
                  className="rounded-xl bg-[var(--foreground)] px-3 py-2 text-xs font-semibold text-white"
                >
                  자동 분리
                </button>
              </div>
              <textarea
                rows={6}
                value={quickText}
                onChange={(event) => setQuickText(event.target.value)}
                placeholder="예: OO건설 청주A현장 복층유리 1200x1800 30장 2라인"
                className="w-full resize-none rounded-2xl border border-black/10 bg-[#f8fafb] px-4 py-3 text-sm outline-none focus:border-[var(--primary)]"
              />
              <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
                추후 AI API 연결을 고려해 로컬 파서 모듈로 분리해 두었습니다.
              </p>
            </div>

            <div className="rounded-2xl border border-black/5 bg-white p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">거래처별 기본값 추천</h3>
                <span className="text-xs text-[var(--muted)]">최근 주문 5건 기준</span>
              </div>
              {!draft.customer.trim() ? (
                <p className="text-sm leading-6 text-[var(--muted)]">
                  거래처를 먼저 입력하면 최근 현장, 자주 쓰는 품목, 라인 추천을 보여드립니다.
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[var(--muted)]">최근 현장</p>
                    <div className="flex flex-wrap gap-2">
                      {recommendations?.recentSites.length ? (
                        recommendations.recentSites.map((site) => (
                          <button
                            key={site}
                            type="button"
                            onClick={() => updateDraft("site", site)}
                            className="rounded-full bg-[var(--secondary)] px-3 py-1.5 text-xs font-semibold text-[var(--primary)]"
                          >
                            {site}
                          </button>
                        ))
                      ) : (
                        <span className="text-sm text-[var(--muted)]">추천 현장이 아직 없습니다.</span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[var(--muted)]">자주 쓰는 품목</p>
                    <div className="flex flex-wrap gap-2">
                      {recommendations?.frequentItems.length ? (
                        recommendations.frequentItems.map((item) => (
                          <button
                            key={`${item.itemName}-${item.width}-${item.height}`}
                            type="button"
                            onClick={() => {
                              updateDraft("item_name", item.itemName);
                              updateDraft("width", item.width);
                              updateDraft("height", item.height);
                            }}
                            className="rounded-full bg-[#f4f7fb] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)]"
                          >
                            {item.itemName}
                            {item.width && item.height ? ` ${item.width}x${item.height}` : ""}
                          </button>
                        ))
                      ) : (
                        <span className="text-sm text-[var(--muted)]">추천 품목이 아직 없습니다.</span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[var(--muted)]">자주 쓰는 라인</p>
                    <div className="flex flex-wrap gap-2">
                      {recommendations?.frequentLines.length ? (
                        recommendations.frequentLines.map((line) => (
                          <button
                            key={line}
                            type="button"
                            onClick={() => updateDraft("line", line)}
                            className="rounded-full bg-[#f4f7fb] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)]"
                          >
                            {line}
                          </button>
                        ))
                      ) : (
                        <span className="text-sm text-[var(--muted)]">추천 라인이 아직 없습니다.</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-black/5 bg-white p-5">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">Step 1. 거래처/현장</h3>
                <button
                  type="button"
                  onClick={saveFavorite}
                  disabled={favoriteSaving}
                  className="rounded-xl border border-[var(--primary)]/20 bg-[var(--secondary)] px-3 py-2 text-xs font-semibold text-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {favoriteSaving ? "저장 중..." : "즐겨찾기로 저장"}
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-2 text-sm text-[var(--muted)]">
                  <span>거래처</span>
                  <input
                    list="customer-options"
                    value={draft.customer}
                    onChange={(event) => updateDraft("customer", event.target.value)}
                    className="w-full rounded-2xl border border-black/10 bg-[#f8fafb] px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                    placeholder="거래처 입력"
                  />
                  <datalist id="customer-options">
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.name} />
                    ))}
                  </datalist>
                </label>
                <label className="space-y-2 text-sm text-[var(--muted)]">
                  <span>현장</span>
                  <input
                    value={draft.site}
                    onChange={(event) => updateDraft("site", event.target.value)}
                    className="w-full rounded-2xl border border-black/10 bg-[#f8fafb] px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                    placeholder="현장 입력"
                  />
                </label>
              </div>

              {recentOrders.length ? (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold text-[var(--muted)]">해당 거래처 최근 주문</p>
                  <div className="flex flex-wrap gap-2">
                    {recentOrders.map((order) => (
                      <button
                        key={order.id}
                        type="button"
                        onClick={() => {
                          updateDraft("site", order.site ?? "");
                          updateDraft("item_name", order.item_name);
                          updateDraft("width", order.width);
                          updateDraft("height", order.height);
                          updateDraft("line", order.line ?? "");
                        }}
                        className="rounded-full bg-[#f4f7fb] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)]"
                      >
                        {(order.site ?? "현장 없음") + " / " + order.item_name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-black/5 bg-white p-5">
              <h3 className="mb-4 text-sm font-semibold text-[var(--foreground)]">Step 2. 제품/규격</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-2 text-sm text-[var(--muted)]">
                  <span>공정</span>
                  <select
                    value={draft.process}
                    onChange={(event) => updateDraft("process", event.target.value as BasicOrderDraft["process"])}
                    className="w-full rounded-2xl border border-black/10 bg-[#f8fafb] px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                  >
                    <option value="">공정 선택</option>
                    {PROCESS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-sm text-[var(--muted)]">
                  <span>품목코드</span>
                  <input
                    value={draft.item_code}
                    onChange={(event) => updateDraft("item_code", event.target.value)}
                    className="w-full rounded-2xl border border-black/10 bg-[#f8fafb] px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                    placeholder="품목코드 입력"
                  />
                </label>
                <label className="space-y-2 text-sm text-[var(--muted)] md:col-span-2">
                  <span>품명</span>
                  <input
                    value={draft.item_name}
                    onChange={(event) => updateDraft("item_name", event.target.value)}
                    className="w-full rounded-2xl border border-black/10 bg-[#f8fafb] px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                    placeholder="품명 입력"
                  />
                </label>
                <label className="space-y-2 text-sm text-[var(--muted)]">
                  <span>가로</span>
                  <input
                    type="number"
                    value={draft.width ?? ""}
                    onChange={(event) => updateDraft("width", toNumberOrNull(event.target.value))}
                    className="w-full rounded-2xl border border-black/10 bg-[#f8fafb] px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                    placeholder="가로 입력"
                  />
                </label>
                <label className="space-y-2 text-sm text-[var(--muted)]">
                  <span>세로</span>
                  <input
                    type="number"
                    value={draft.height ?? ""}
                    onChange={(event) => updateDraft("height", toNumberOrNull(event.target.value))}
                    className="w-full rounded-2xl border border-black/10 bg-[#f8fafb] px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                    placeholder="세로 입력"
                  />
                </label>
                <div className="space-y-2 md:col-span-2">
                  <span className="text-sm text-[var(--muted)]">수량</span>
                  <QuantityInput value={draft.quantity} onChange={(value) => updateDraft("quantity", value)} min={1} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-black/5 bg-white p-5">
              <h3 className="mb-4 text-sm font-semibold text-[var(--foreground)]">Step 3. 작업 정보</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-2 text-sm text-[var(--muted)]">
                  <span>라인</span>
                  <input
                    value={draft.line}
                    onChange={(event) => updateDraft("line", event.target.value)}
                    className="w-full rounded-2xl border border-black/10 bg-[#f8fafb] px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                    placeholder="라인 입력"
                  />
                </label>
                <label className="space-y-2 text-sm text-[var(--muted)]">
                  <span>의뢰번호</span>
                  <input
                    value={draft.request_no}
                    onChange={(event) => updateDraft("request_no", event.target.value)}
                    className="w-full rounded-2xl border border-black/10 bg-[#f8fafb] px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                    placeholder="의뢰번호 입력"
                  />
                </label>
                <label className="space-y-2 text-sm text-[var(--muted)]">
                  <span>등록자</span>
                  <input
                    value={draft.registrant}
                    onChange={(event) => updateDraft("registrant", event.target.value)}
                    className="w-full rounded-2xl border border-black/10 bg-[#f8fafb] px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                    placeholder="등록자 입력"
                  />
                </label>
                <label className="space-y-2 text-sm text-[var(--muted)]">
                  <span>상태</span>
                  <select
                    value={draft.status}
                    onChange={(event) => updateDraft("status", event.target.value as BasicOrderDraft["status"])}
                    className="w-full rounded-2xl border border-black/10 bg-[#f8fafb] px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-sm text-[var(--muted)] md:col-span-2">
                  <span>메모</span>
                  <textarea
                    rows={4}
                    value={draft.memo}
                    onChange={(event) => updateDraft("memo", event.target.value)}
                    className="w-full resize-none rounded-2xl border border-black/10 bg-[#f8fafb] px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                    placeholder="메모 입력"
                  />
                </label>
              </div>

              <div className="mt-4 rounded-2xl bg-[#f7faf9] px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-[var(--muted)]">자동 계산 평수</p>
                    <p className="mt-1 text-lg font-bold text-[var(--foreground)]">
                      {areaPyeong ? `${areaPyeong} 평` : "계산 대기"}
                    </p>
                  </div>
                  <p className="text-xs leading-5 text-[var(--warning)]">회사 공식 계산식 확인 필요</p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setDraft(createEmptyOrderDraft());
                    setQuickText("");
                    setError(null);
                    setMessage(null);
                  }}
                  className="rounded-2xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-[var(--foreground)]"
                >
                  초기화
                </button>
                <button
                  type="button"
                  onClick={saveOrder}
                  disabled={saving}
                  className="rounded-2xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "등록 중..." : "등록하기"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
