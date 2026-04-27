import { calculateAreaPyeong } from "@/lib/calculations";
import { mockCustomers, mockFavorites, mockItems, mockOrders } from "@/lib/mockData";
import { buildOrderPayload } from "@/lib/order-helpers";
import { supabase } from "@/lib/supabaseClient";
import type {
  BasicOrderDraft,
  CustomerRecord,
  FavoriteRecord,
  ImportedOrderDraft,
  ItemRecord,
  OrderRecord,
  OrderStatus
} from "@/lib/types";

type DashboardData = {
  customers: CustomerRecord[];
  items: ItemRecord[];
  orders: OrderRecord[];
  favorites: FavoriteRecord[];
};

function createLocalOrderRecord(draft: ImportedOrderDraft | BasicOrderDraft): OrderRecord {
  return {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    pid: null,
    process: draft.process || null,
    item_code: draft.item_code || null,
    item_name: draft.item_name,
    width: draft.width,
    height: draft.height,
    quantity: draft.quantity,
    area_pyeong: calculateAreaPyeong(draft.width, draft.height, draft.quantity),
    request_no: draft.request_no || null,
    no: null,
    customer: draft.customer,
    site: draft.site || null,
    line: draft.line || null,
    registrant: draft.registrant || null,
    status: draft.status,
    memo: draft.memo || null,
    is_favorite_source: false
  };
}

function createLocalFavoriteRecord(draft: BasicOrderDraft): FavoriteRecord {
  return {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    name: `${draft.customer.trim()} ${draft.site.trim() || "기본"} ${draft.item_name.trim()}`,
    process: draft.process || null,
    item_code: draft.item_code.trim() || null,
    item_name: draft.item_name.trim(),
    width: draft.width,
    height: draft.height,
    quantity: draft.quantity,
    customer: draft.customer.trim(),
    site: draft.site.trim() || null,
    line: draft.line.trim() || null,
    memo: draft.memo.trim() || null
  };
}

export async function loadDashboardData(): Promise<DashboardData> {
  if (!supabase) {
    return {
      customers: mockCustomers,
      items: mockItems,
      orders: mockOrders,
      favorites: mockFavorites
    };
  }

  const [customersResponse, itemsResponse, ordersResponse, favoritesResponse] = await Promise.all([
    supabase.from("customers").select("*").order("name"),
    supabase.from("items").select("*").order("item_name"),
    supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(200),
    supabase.from("favorites").select("*").order("created_at", { ascending: false }).limit(100)
  ]);

  return {
    customers: customersResponse.data ?? [],
    items: itemsResponse.data ?? [],
    orders: ordersResponse.data ?? [],
    favorites: favoritesResponse.data ?? []
  };
}

export async function createOrder(draft: BasicOrderDraft): Promise<OrderRecord> {
  if (!supabase) {
    return createLocalOrderRecord(draft);
  }

  const response = await supabase.from("orders").insert(buildOrderPayload(draft)).select("*").single();
  if (response.error || !response.data) {
    throw response.error ?? new Error("주문 저장 실패");
  }

  return response.data;
}

export async function createFavorite(draft: BasicOrderDraft): Promise<FavoriteRecord> {
  if (!supabase) {
    return createLocalFavoriteRecord(draft);
  }

  const payload = {
    name: `${draft.customer.trim()} ${draft.site.trim() || "기본"} ${draft.item_name.trim()}`,
    process: draft.process || null,
    item_code: draft.item_code.trim() || null,
    item_name: draft.item_name.trim(),
    width: draft.width,
    height: draft.height,
    quantity: draft.quantity,
    customer: draft.customer.trim(),
    site: draft.site.trim() || null,
    line: draft.line.trim() || null,
    memo: draft.memo.trim() || null
  };

  const response = await supabase.from("favorites").insert(payload).select("*").single();
  if (response.error || !response.data) {
    throw response.error ?? new Error("즐겨찾기 저장 실패");
  }

  return response.data;
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
  memo?: string | null
): Promise<OrderRecord | null> {
  if (!supabase) {
    return null;
  }

  const response = await supabase
    .from("orders")
    .update({ status, memo: memo ?? undefined })
    .eq("id", id)
    .select("*")
    .single();

  if (response.error || !response.data) {
    throw response.error ?? new Error("주문 상태 수정 실패");
  }

  return response.data;
}

export async function importOrders(rows: ImportedOrderDraft[]): Promise<OrderRecord[]> {
  if (!rows.length) {
    return [];
  }

  if (!supabase) {
    return rows.map((row) => createLocalOrderRecord(row));
  }

  const payloads = rows.map((row) => ({
    customer: row.customer.trim(),
    site: row.site.trim() || null,
    process: row.process || null,
    item_code: row.item_code.trim() || null,
    item_name: row.item_name.trim(),
    width: row.width,
    height: row.height,
    quantity: row.quantity,
    line: row.line.trim() || null,
    request_no: row.request_no.trim() || null,
    registrant: row.registrant.trim() || null,
    memo: row.memo.trim() || null,
    status: row.status,
    area_pyeong: calculateAreaPyeong(row.width, row.height, row.quantity)
  }));

  const response = await supabase.from("orders").insert(payloads).select("*");
  if (response.error || !response.data) {
    throw response.error ?? new Error("업로드 주문 저장 실패");
  }

  return response.data;
}
