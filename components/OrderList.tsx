import { EmptyState } from "@/components/EmptyState";
import { SectionCard } from "@/components/SectionCard";

export function OrderList() {
  return (
    <SectionCard
      title="주문 목록"
      description="등록된 주문을 검색하고 상태를 바꾸는 테이블 영역입니다."
    >
      <EmptyState
        title="주문 목록 테이블 준비 중"
        description="Phase 9에서 검색, 상태 필터, 상세 보기와 상태 변경 기능을 연결합니다."
      />
    </SectionCard>
  );
}
