"use client";

import { useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { QuantityInput } from "@/components/QuantityInput";
import { SectionCard } from "@/components/SectionCard";
import { createOrder } from "@/lib/data-access";
import { favoriteToDraft } from "@/lib/order-helpers";
import { joinText } from "@/lib/utils";
import type { FavoriteRecord, OrderRecord } from "@/lib/types";

type FavoritesPanelProps = {
  favorites: FavoriteRecord[];
  onLoadFavorite: (favorite: FavoriteRecord) => void;
  onOrderCreated: (order: OrderRecord) => void;
};

export function FavoritesPanel({
  favorites,
  onLoadFavorite,
  onOrderCreated
}: FavoritesPanelProps) {
  const [quantityModal, setQuantityModal] = useState<FavoriteRecord | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const registerFavorite = async (favorite: FavoriteRecord, overrideQuantity?: number) => {
    setSavingId(favorite.id);
    setError(null);

    try {
      const draft = favoriteToDraft(favorite);
      draft.quantity = overrideQuantity ?? favorite.quantity ?? 1;
      const order = await createOrder(draft);
      onOrderCreated(order);
      setMessage(`${favorite.name} 즐겨찾기를 바로 등록했습니다.`);
      setQuantityModal(null);
    } catch {
      setError("즐겨찾기 바로 등록에 실패했습니다.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <SectionCard
      title="즐겨찾기"
      description="반복 등록이 많은 거래처와 품목 조합을 저장하고 바로 다시 불러올 수 있습니다."
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

        {!favorites.length ? (
          <EmptyState
            title="저장된 즐겨찾기가 아직 없습니다"
            description="기본 등록 화면에서 자주 쓰는 조합을 저장하면 여기에서 빠르게 다시 사용할 수 있습니다."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {favorites.map((favorite) => (
              <article
                key={favorite.id}
                className="rounded-2xl border border-black/5 bg-white p-5 shadow-[0_8px_24px_rgba(24,39,56,0.04)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[var(--primary)]">{favorite.customer}</p>
                    <h3 className="mt-1 text-lg font-bold text-[var(--foreground)]">{favorite.item_name}</h3>
                  </div>
                  <span className="rounded-full bg-[#f4f7fb] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                    {favorite.process ?? "공정 미지정"}
                  </span>
                </div>

                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                  {joinText([
                    favorite.site ?? "현장 미입력",
                    favorite.width && favorite.height ? `${favorite.width} x ${favorite.height}` : null,
                    favorite.line ?? "라인 미입력"
                  ])}
                </p>

                <p className="mt-2 text-sm text-[var(--muted)]">기본 수량: {favorite.quantity ?? "미지정"}</p>

                {favorite.memo ? (
                  <p className="mt-3 rounded-2xl bg-[#f8fafb] px-3 py-2 text-sm text-[var(--muted)]">
                    {favorite.memo}
                  </p>
                ) : null}

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => onLoadFavorite(favorite)}
                    className="rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)]"
                  >
                    불러오기
                  </button>
                  <button
                    type="button"
                    disabled={savingId === favorite.id}
                    onClick={() => {
                      if (!favorite.quantity) {
                        setQuantityModal(favorite);
                        setQuantity(1);
                        return;
                      }
                      void registerFavorite(favorite);
                    }}
                    className="rounded-2xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingId === favorite.id ? "등록 중..." : "바로 등록"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {quantityModal ? (
          <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/35 p-6">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-[0_24px_60px_rgba(24,39,56,0.2)]">
              <h3 className="text-lg font-bold text-[var(--foreground)]">수량 입력 후 바로 등록</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {quantityModal.name} 즐겨찾기는 기본 수량이 없어서 직접 입력이 필요합니다.
              </p>
              <div className="mt-5">
                <QuantityInput value={quantity} onChange={setQuantity} min={1} />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setQuantityModal(null)}
                  className="rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)]"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => void registerFavorite(quantityModal, quantity)}
                  className="rounded-2xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white"
                >
                  등록하기
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}
