import { calculateAreaPyeong } from "@/lib/calculations";
import type { BasicOrderDraft, FavoriteRecord, OrderRecord } from "@/lib/types";

export function createEmptyOrderDraft(): BasicOrderDraft {
  return {
    customer: "",
    site: "",
    process: "",
    item_code: "",
    item_name: "",
    width: null,
    height: null,
    quantity: 1,
    line: "",
    request_no: "",
    registrant: "",
    memo: "",
    status: "등록"
  };
}

export function cloneLatestOrderToDraft(order: OrderRecord): BasicOrderDraft {
  return {
    customer: order.customer,
    site: order.site ?? "",
    process: order.process ?? "",
    item_code: order.item_code ?? "",
    item_name: order.item_name,
    width: order.width,
    height: order.height,
    quantity: order.quantity,
    line: order.line ?? "",
    request_no: order.request_no ?? "",
    registrant: order.registrant ?? "",
    memo: order.memo ?? "",
    status: order.status
  };
}

export function favoriteToDraft(favorite: FavoriteRecord): BasicOrderDraft {
  return {
    customer: favorite.customer,
    site: favorite.site ?? "",
    process: favorite.process ?? "",
    item_code: favorite.item_code ?? "",
    item_name: favorite.item_name,
    width: favorite.width,
    height: favorite.height,
    quantity: favorite.quantity ?? 1,
    line: favorite.line ?? "",
    request_no: "",
    registrant: "",
    memo: favorite.memo ?? "",
    status: "등록"
  };
}

export function buildOrderPayload(draft: BasicOrderDraft) {
  return {
    customer: draft.customer.trim(),
    site: draft.site.trim() || null,
    process: draft.process || null,
    item_code: draft.item_code.trim() || null,
    item_name: draft.item_name.trim(),
    width: draft.width,
    height: draft.height,
    quantity: draft.quantity,
    line: draft.line.trim() || null,
    request_no: draft.request_no.trim() || null,
    registrant: draft.registrant.trim() || null,
    memo: draft.memo.trim() || null,
    status: draft.status,
    area_pyeong: calculateAreaPyeong(draft.width, draft.height, draft.quantity)
  };
}
