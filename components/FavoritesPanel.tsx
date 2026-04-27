import { EmptyState } from "@/components/EmptyState";
import { SectionCard } from "@/components/SectionCard";

export function FavoritesPanel() {
  return (
    <SectionCard
      title="즐겨찾기"
      description="반복 등록이 많은 거래처와 품목 조합을 카드 형태로 저장하고 다시 불러오는 공간입니다."
    >
      <EmptyState
        title="저장된 즐겨찾기가 아직 없습니다"
        description="Phase 8에서 즐겨찾기 저장, 불러오기, 바로 등록 흐름을 구현합니다."
      />
    </SectionCard>
  );
}
