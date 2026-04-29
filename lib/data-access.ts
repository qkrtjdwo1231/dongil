import { mockOrders } from "@/lib/mockData";
import { supabase } from "@/lib/supabaseClient";
import type { OrderRecord, OrderStatus, UploadedAnalysisFile } from "@/lib/types";

type DashboardData = {
  orders: OrderRecord[];
  uploadedFiles: UploadedAnalysisFile[];
};

export async function loadDashboardData(): Promise<DashboardData> {
  if (!supabase) {
    return {
      orders: mockOrders,
      uploadedFiles: []
    };
  }

  const ordersResponse = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5000);

  const uploadedFilesResponse = await supabase
    .from("uploaded_files")
    .select("id, created_at, original_name, stored_path, summary_text, analysis_snapshot")
    .order("created_at", { ascending: false })
    .limit(30);

  return {
    orders: ordersResponse.data ?? [],
    uploadedFiles: uploadedFilesResponse.data ?? []
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
