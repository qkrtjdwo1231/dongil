import * as XLSX from "xlsx";
import type { ImportedOrderDraft, OrderStatus, ProcessType, UploadPreviewRow } from "@/lib/types";

const PROCESS_VALUES: ProcessType[] = ["복층", "강화", "접합", "창호", "기타"];
const STATUS_VALUES: OrderStatus[] = ["등록", "확인필요", "진행", "완료", "보류"];

function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[()]/g, "");
}

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(String(value).replace(/,/g, ""));
  return Number.isNaN(parsed) ? null : parsed;
}

function toQuantity(value: unknown) {
  const parsed = toNullableNumber(value);
  if (!parsed || parsed <= 0) {
    return 0;
  }

  return Math.floor(parsed);
}

function toProcess(value: unknown): ProcessType | "" {
  const text = String(value ?? "").trim();
  return PROCESS_VALUES.includes(text as ProcessType) ? (text as ProcessType) : "";
}

function toStatus(value: unknown): OrderStatus {
  const text = String(value ?? "").trim();
  return STATUS_VALUES.includes(text as OrderStatus) ? (text as OrderStatus) : "등록";
}

function emptyDraft(): ImportedOrderDraft {
  return {
    customer: "",
    site: "",
    process: "",
    item_code: "",
    item_name: "",
    width: null,
    height: null,
    quantity: 0,
    line: "",
    request_no: "",
    registrant: "",
    memo: "",
    status: "등록"
  };
}

function parseWorkbookRows(rows: unknown[][]): UploadPreviewRow[] {
  if (!rows.length) {
    return [];
  }

  const headers = rows[0].map((value) => normalizeHeader(value));

  const headerIndex = {
    customer: headers.findIndex((value) => ["customer", "거래처"].includes(value)),
    site: headers.findIndex((value) => ["site", "현장"].includes(value)),
    process: headers.findIndex((value) => ["process", "공정"].includes(value)),
    item_code: headers.findIndex((value) => ["itemcode", "품목코드", "code"].includes(value)),
    item_name: headers.findIndex((value) => ["itemname", "품명", "품목명"].includes(value)),
    width: headers.findIndex((value) => ["width", "가로"].includes(value)),
    height: headers.findIndex((value) => ["height", "세로"].includes(value)),
    quantity: headers.findIndex((value) => ["quantity", "수량", "장수", "개수"].includes(value)),
    line: headers.findIndex((value) => ["line", "라인"].includes(value)),
    request_no: headers.findIndex((value) => ["requestno", "의뢰번호"].includes(value)),
    registrant: headers.findIndex((value) => ["registrant", "등록자"].includes(value)),
    memo: headers.findIndex((value) => ["memo", "메모", "비고"].includes(value)),
    status: headers.findIndex((value) => ["status", "상태"].includes(value))
  };

  return rows
    .slice(1)
    .filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""))
    .map((row, index) => {
      const draft = emptyDraft();
      draft.customer = String(row[headerIndex.customer] ?? "").trim();
      draft.site = String(row[headerIndex.site] ?? "").trim();
      draft.process = toProcess(row[headerIndex.process]);
      draft.item_code = String(row[headerIndex.item_code] ?? "").trim();
      draft.item_name = String(row[headerIndex.item_name] ?? "").trim();
      draft.width = toNullableNumber(row[headerIndex.width]);
      draft.height = toNullableNumber(row[headerIndex.height]);
      draft.quantity = toQuantity(row[headerIndex.quantity]);
      draft.line = String(row[headerIndex.line] ?? "").trim();
      draft.request_no = String(row[headerIndex.request_no] ?? "").trim();
      draft.registrant = String(row[headerIndex.registrant] ?? "").trim();
      draft.memo = String(row[headerIndex.memo] ?? "").trim();
      draft.status = toStatus(row[headerIndex.status]);

      if (!draft.customer || !draft.item_name || !draft.quantity) {
        const reason = !draft.customer
          ? "거래처 누락"
          : !draft.item_name
            ? "품명 누락"
            : "수량 누락";

        return {
          rowIndex: index + 2,
          draft,
          valid: false,
          reason
        };
      }

      return {
        rowIndex: index + 2,
        draft,
        valid: true
      };
    });
}

export async function parseUploadFile(file: File): Promise<UploadPreviewRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false }) as unknown[][];

  return parseWorkbookRows(rows);
}
