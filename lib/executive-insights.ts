import { calculateMissingRate, calculateTopSharePercent, groupOrdersByDimension, sumMetric } from "@/lib/analytics";
import type { OrderRecord, UploadAnalysisSnapshot } from "@/lib/types";

export type CustomerSegment = {
  label: string;
  reason: string;
};

export type ExecutiveInsightReport = {
  summary: string[];
  changes: string[];
  quality: string[];
  actions: string[];
};

function averageArea(orders: OrderRecord[]) {
  if (!orders.length) {
    return 0;
  }

  return sumMetric(orders, "area") / orders.length;
}

function dominantProductFamily(orders: OrderRecord[]) {
  return groupOrdersByDimension(orders, "productFamily").sort((a, b) => b.area - a.area)[0] ?? null;
}

export function buildCustomerSegments(orders: OrderRecord[]) {
  return groupOrdersByDimension(orders, "customer")
    .sort((a, b) => b.area - a.area)
    .slice(0, 12)
    .map((group) => {
      const avgArea = averageArea(group.orders);
      const family = dominantProductFamily(group.orders);
      const missingSiteRate = calculateMissingRate(group.orders, "site");
      const activeMonths = new Set(
        group.orders.map((order) => {
          const date = new Date(order.created_at);
          return Number.isNaN(date.getTime())
            ? null
            : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        }).filter(Boolean)
      ).size;

      let label = "안정 고객";
      let reason = "기간 전반에 걸쳐 비교적 고르게 물량이 발생했습니다.";

      if (family && family.label === "로이/코팅") {
        label = "기능성 제품 고객";
        reason = `${family.label} 비중이 ${((family.area / Math.max(group.area, 1)) * 100).toFixed(1)}%로 높습니다.`;
      } else if (avgArea >= 8) {
        label = "대형 규격 고객";
        reason = `건당 평균 평수가 ${avgArea.toFixed(2)}로 커서 포장 부담이 큽니다.`;
      } else if (activeMonths <= 2) {
        label = "프로젝트성 고객";
        reason = `활동 월 수가 ${activeMonths}개로 짧아 특정 프로젝트 집중 가능성이 있습니다.`;
      } else if (missingSiteRate >= 5) {
        label = "데이터 관리 필요 고객";
        reason = `현장 누락률이 ${missingSiteRate.toFixed(1)}%로 높습니다.`;
      } else if (group.area > 0) {
        label = "핵심 물량 고객";
        reason = `총 평수 ${group.area.toFixed(1)}로 상위권 물량을 차지합니다.`;
      }

      return {
        customer: group.label,
        area: group.area,
        quantity: group.quantity,
        label,
        reason
      };
    });
}

export function buildExecutiveInsightReport({
  orders,
  previousOrders,
  snapshot
}: {
  orders: OrderRecord[];
  previousOrders: OrderRecord[];
  snapshot: UploadAnalysisSnapshot | null;
}): ExecutiveInsightReport {
  const totalArea = sumMetric(orders, "area");
  const totalQuantity = sumMetric(orders, "quantity");
  const topCustomerShare = calculateTopSharePercent(orders, "customer", 5, "area");
  const topItemShare = calculateTopSharePercent(orders, "item", 5, "area");
  const topFamily = dominantProductFamily(orders);
  const siteMissingRate = calculateMissingRate(orders, "site");
  const previousArea = sumMetric(previousOrders, "area");
  const previousQuantity = sumMetric(previousOrders, "quantity");

  const areaChange = previousArea ? ((totalArea - previousArea) / previousArea) * 100 : 0;
  const quantityChange = previousQuantity ? ((totalQuantity - previousQuantity) / previousQuantity) * 100 : 0;

  const summary = [
    `현재 분석 기간 기준 총 포장 건수는 ${orders.length.toLocaleString()}건, 총 수량은 ${totalQuantity.toLocaleString()}, 총 평수는 ${totalArea.toFixed(1)}입니다.`,
    topFamily
      ? `제품 믹스는 ${topFamily.label} 비중이 가장 높고, 해당 제품군 평수는 ${topFamily.area.toFixed(1)}입니다.`
      : "제품군별 의미 있는 차이를 읽을 만큼 데이터가 충분하지 않습니다.",
    `상위 5개 거래처 평수 비중은 ${topCustomerShare.toFixed(1)}%, 상위 5개 품목 평수 비중은 ${topItemShare.toFixed(1)}%입니다.`
  ];

  const changes = [
    previousOrders.length
      ? `직전 동일 길이 구간 대비 평수는 ${areaChange >= 0 ? "증가" : "감소"}(${Math.abs(areaChange).toFixed(1)}%)했고, 수량은 ${quantityChange >= 0 ? "증가" : "감소"}(${Math.abs(quantityChange).toFixed(1)}%)했습니다.`
      : "비교 가능한 직전 구간 데이터가 적어 전기 대비 해석은 제한적입니다.",
    snapshot?.peakMonthLabel
      ? `최근 업로드 기준 피크 월은 ${snapshot.peakMonthLabel}, 피크 시간대는 ${snapshot.peakHourLabel ?? "집계 없음"}입니다.`
      : "최근 업로드 파일의 월별/시간대 피크 정보가 아직 없습니다."
  ];

  const quality = [
    `현장 누락률은 ${siteMissingRate.toFixed(1)}%입니다.`,
    snapshot
      ? `최근 업로드 기준 규격 누락 ${snapshot.rowsMissingDimensions.toLocaleString()}건, 현장 미입력 ${snapshot.rowsMissingSite.toLocaleString()}건이 확인됩니다.`
      : "최근 업로드 품질 지표가 아직 없습니다."
  ];

  const actions: string[] = [];
  if (topCustomerShare >= 50) {
    actions.push("상위 거래처 집중도가 높으므로 핵심 거래처 의존 리스크를 점검하세요.");
  }
  if (topItemShare >= 50) {
    actions.push("상위 품목 쏠림이 높으므로 자재 준비와 포장 계획을 상위 품목 중심으로 재점검하세요.");
  }
  if (siteMissingRate >= 5) {
    actions.push("현장 누락이 분석 신뢰도를 떨어뜨리므로 업로드 전 정제 규칙을 강화하세요.");
  }
  if (!actions.length) {
    actions.push("현재 구간은 구조 리스크보다 추세 확인과 상위 거래처 흐름 모니터링이 더 중요합니다.");
  }

  return {
    summary,
    changes,
    quality,
    actions
  };
}
