import { mockOrders } from "@/lib/mockData";
import { supabase } from "@/lib/supabaseClient";
import type { OrderRecord, OrderStatus } from "@/lib/types";

type DashboardData = {
  orders: OrderRecord[];
};

export async function loadDashboardData(): Promise<DashboardData> {
  if (!supabase) {
    return {
      orders: mockOrders
    };
  }

  const ordersResponse = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5000);

  return {
    orders: ordersResponse.data ?? []
  };
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
    throw response.error ?? new Error("주문 상태 수정에 실패했습니다.");
  }

  return response.data;
}
