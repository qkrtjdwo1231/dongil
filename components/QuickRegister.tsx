import { EmptyState } from "@/components/EmptyState";
import { RecentOrderButton } from "@/components/RecentOrderButton";
import { SectionCard } from "@/components/SectionCard";

export function QuickRegister() {
  return (
    <SectionCard
      title="빠른 등록"
      description="기존 거래처와 현장, 자주 쓰는 품목 조합을 선택해 수량만 바꿔 빠르게 등록하는 화면입니다."
      action={<RecentOrderButton disabled />}
    >
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-black/5 bg-white p-5">
          <label className="space-y-2 text-sm text-[var(--muted)]">
            <span>거래처 검색</span>
            <input
              disabled
              placeholder="거래처명을 입력해 주세요"
              className="w-full rounded-2xl border border-black/10 bg-[#f8fafb] px-4 py-3 text-sm outline-none"
            />
          </label>
          <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
            거래처 선택 후 최근 현장과 자주 쓰는 품목 조합을 보여주도록 구현할 예정입니다.
          </p>
        </div>
        <EmptyState
          title="빠른 등록 추천 카드가 여기에 표시됩니다"
          description="Phase 7에서 거래처와 현장 선택 흐름, 수량 조절 UI, 빠른 등록 저장 기능을 연결합니다."
        />
      </div>
    </SectionCard>
  );
}
