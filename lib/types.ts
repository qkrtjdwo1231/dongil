export type Role = "직원" | "팀장" | "대표";

export type StaffMenu =
  | "basic"
  | "quick"
  | "orders"
  | "favorites"
  | "needs-check";

export type ProcessType = "복층" | "강화" | "접합" | "창호" | "기타";

export type OrderStatus = "등록" | "확인필요" | "진행" | "완료" | "보류";

export type OrderRecord = {
  id: string;
  created_at: string;
  pid: string | null;
  process: ProcessType | null;
  item_code: string | null;
  item_name: string;
  width: number | null;
  height: number | null;
  quantity: number;
  area_pyeong: number | null;
  request_no: string | null;
  no: string | null;
  customer: string;
  site: string | null;
  line: string | null;
  registrant: string | null;
  status: OrderStatus;
  memo: string | null;
  is_favorite_source: boolean;
};

export type FavoriteRecord = {
  id: string;
  created_at: string;
  name: string;
  process: ProcessType | null;
  item_code: string | null;
  item_name: string;
  width: number | null;
  height: number | null;
  quantity: number | null;
  customer: string;
  site: string | null;
  line: string | null;
  memo: string | null;
};

export type CustomerRecord = {
  id: string;
  created_at: string;
  name: string;
  default_site: string | null;
  default_line: string | null;
  memo: string | null;
};

export type ItemRecord = {
  id: string;
  created_at: string;
  item_code: string | null;
  item_name: string;
  process: ProcessType | null;
  width: number | null;
  height: number | null;
  default_quantity: number | null;
  memo: string | null;
};

export type BasicOrderDraft = {
  customer: string;
  site: string;
  process: ProcessType | "";
  item_code: string;
  item_name: string;
  width: number | null;
  height: number | null;
  quantity: number;
  line: string;
  request_no: string;
  registrant: string;
  memo: string;
  status: OrderStatus;
};

export type QuickParseResult = {
  width: number | null;
  height: number | null;
  quantity: number | null;
  line: string | null;
  itemNameCandidate: string;
  memoCandidate: string;
  originalText: string;
};

export type CustomerRecommendations = {
  recentSites: string[];
  frequentLines: string[];
  frequentItems: Array<{
    itemName: string;
    width: number | null;
    height: number | null;
  }>;
};
