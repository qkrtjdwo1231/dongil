import { EmptyState } from "@/components/EmptyState";
import { SectionCard } from "@/components/SectionCard";

export function NeedsCheckList() {
  return (
    <SectionCard
      title="확인필요"
      description="규격 누락, 상태값 확인필요 등 추후 체크가 필요한 주문을 따로 모아 보는 영역입니다."
    >
      <EmptyState
        title="확인필요 주문 목록 준비 중"
        description="Phase 10에서 누락 조건 기준 필터링과 강조 UI를 구현합니다."
      />
    </SectionCard>
  );
}
