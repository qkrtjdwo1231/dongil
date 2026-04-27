import type { CustomerRecord, FavoriteRecord, ItemRecord, OrderRecord } from "@/lib/types";

export const mockCustomers: CustomerRecord[] = [
  {
    id: "customer-1",
    created_at: "2026-04-27T09:00:00.000Z",
    name: "OO건설",
    default_site: "청주A현장",
    default_line: "2라인",
    memo: "주요 거래처"
  },
  {
    id: "customer-2",
    created_at: "2026-04-27T09:10:00.000Z",
    name: "청주창호",
    default_site: "오창B현장",
    default_line: "1라인",
    memo: "창호 중심 거래처"
  },
  {
    id: "customer-3",
    created_at: "2026-04-27T09:20:00.000Z",
    name: "충북유리",
    default_site: "진천C현장",
    default_line: "3라인",
    memo: "유리 교체 작업 빈도 높음"
  }
];

export const mockItems: ItemRecord[] = [
  {
    id: "item-1",
    created_at: "2026-04-27T09:00:00.000Z",
    item_code: "DG-001",
    item_name: "복층유리",
    process: "복층",
    width: 1200,
    height: 1800,
    default_quantity: 10,
    memo: "기본 복층유리"
  },
  {
    id: "item-2",
    created_at: "2026-04-27T09:00:00.000Z",
    item_code: "DG-002",
    item_name: "강화유리",
    process: "강화",
    width: 900,
    height: 1200,
    default_quantity: 12,
    memo: "기본 강화유리"
  },
  {
    id: "item-3",
    created_at: "2026-04-27T09:00:00.000Z",
    item_code: "DG-003",
    item_name: "로이복층유리",
    process: "복층",
    width: 1000,
    height: 2000,
    default_quantity: 8,
    memo: "로이유리 포함"
  }
];

export const mockOrders: OrderRecord[] = [
  {
    id: "order-1",
    created_at: "2026-04-27T09:30:00.000Z",
    pid: "P-001",
    process: "복층",
    item_code: "DG-001",
    item_name: "복층유리",
    width: 1200,
    height: 1800,
    quantity: 30,
    area_pyeong: 19.6,
    request_no: "REQ-001",
    no: "1",
    customer: "OO건설",
    site: "청주A현장",
    line: "2라인",
    registrant: "김대리",
    status: "등록",
    memo: "긴급 요청",
    is_favorite_source: false
  },
  {
    id: "order-2",
    created_at: "2026-04-27T10:20:00.000Z",
    pid: "P-002",
    process: "강화",
    item_code: "DG-002",
    item_name: "강화유리",
    width: 900,
    height: 1200,
    quantity: 20,
    area_pyeong: 5.88,
    request_no: "REQ-002",
    no: "2",
    customer: "청주창호",
    site: "오창B현장",
    line: "1라인",
    registrant: "이주임",
    status: "진행",
    memo: "샘플 시공",
    is_favorite_source: false
  },
  {
    id: "order-3",
    created_at: "2026-04-27T11:10:00.000Z",
    pid: "P-003",
    process: "복층",
    item_code: "DG-003",
    item_name: "로이복층유리",
    width: 1000,
    height: null,
    quantity: 15,
    area_pyeong: null,
    request_no: "REQ-003",
    no: "3",
    customer: "충북유리",
    site: "진천C현장",
    line: "3라인",
    registrant: "박사원",
    status: "확인필요",
    memo: "세로 규격 재확인 필요",
    is_favorite_source: true
  }
];

export const mockFavorites: FavoriteRecord[] = [
  {
    id: "favorite-1",
    created_at: "2026-04-27T12:00:00.000Z",
    name: "OO건설 청주A 기본",
    process: "복층",
    item_code: "DG-001",
    item_name: "복층유리",
    width: 1200,
    height: 1800,
    quantity: 30,
    customer: "OO건설",
    site: "청주A현장",
    line: "2라인",
    memo: "자주 쓰는 기본 조합"
  }
];
