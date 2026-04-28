import * as XLSX from "xlsx";
import { calculateAreaPyeong } from "@/lib/calculations";
import type {
  ImportedOrderDraft,
  OrderStatus,
  ProcessType,
  UploadPreviewRow
} from "@/lib/types";

const PROCESS_VALUES = new Set(["복층", "강화", "접합", "창호", "기타"]);
const STATUS_VALUES = new Set(["등록", "확인필요", "진행", "완료", "보류"]);

export const UPLOAD_PREVIEW_LIMIT = 12;
export const UPLOAD_BATCH_SIZE = 1000;

type HeaderIndex = {
  createdAt: number;
  pid: number;
  process: number;
  itemCode: number;
  itemName: number;
  width: number;
  height: number;
  quantity: number;
  requestNo: number;
  no: number;
  customer: number;
  site: number;
  line: number;
  registrant: number;
  memo: number;
  status: number;
};

type ParsedUploadRow = {
  rowIndex: number;
  draft: ImportedOrderDraft;
  createdAt: string | null;
  pid: string | null;
  no: string | null;
  valid: boolean;
  reason?: string;
};

export type UploadPreviewSummary = {
  fileName: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  previewRows: UploadPreviewRow[];
};

function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[()]/g, "");
}

function toNullableNumber(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value.replace(/,/g, ""));
  return Number.isNaN(parsed) ? null : parsed;
}

function toQuantity(value: string) {
  const parsed = toNullableNumber(value);
  if (!parsed || parsed <= 0) {
    return 0;
  }

  return Math.floor(parsed);
}

function toProcess(value: string): ProcessType | "" {
  const text = value.trim();
  if (!text) {
    return "";
  }

  return PROCESS_VALUES.has(text) ? text : text;
}

function toStatus(value: string): OrderStatus {
  const text = value.trim();
  return STATUS_VALUES.has(text) ? (text as OrderStatus) : "등록";
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

function getCellText(worksheet: XLSX.WorkSheet, rowIndex: number, columnIndex: number) {
  if (columnIndex < 0) {
    return "";
  }

  const cell = worksheet[XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex })];
  if (!cell || cell.v === undefined || cell.v === null) {
    return "";
  }

  return String(cell.w ?? cell.v).trim();
}

function buildHeaderIndex(worksheet: XLSX.WorkSheet, range: XLSX.Range): HeaderIndex {
  const headers: string[] = [];

  for (let columnIndex = range.s.c; columnIndex <= range.e.c; columnIndex += 1) {
    headers.push(normalizeHeader(getCellText(worksheet, range.s.r, columnIndex)));
  }

  const findHeader = (...candidates: string[]) =>
    headers.findIndex((value) => candidates.includes(value));

  return {
    createdAt: findHeader("등록일시", "createdat", "date"),
    pid: findHeader("pid"),
    process: findHeader("공정", "process"),
    itemCode: findHeader("품목코드", "itemcode", "code"),
    itemName: findHeader("품명", "품목명", "itemname"),
    width: findHeader("가로", "width"),
    height: findHeader("세로", "height"),
    quantity: findHeader("수량", "개수", "quantity"),
    requestNo: findHeader("의뢰번호", "requestno"),
    no: findHeader("no"),
    customer: findHeader("거래처", "customer"),
    site: findHeader("현장", "site"),
    line: findHeader("라인", "line"),
    registrant: findHeader("등록자", "registrant"),
    memo: findHeader("비고", "memo"),
    status: findHeader("상태", "status")
  };
}

function parseCreatedAt(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );

  if (!match) {
    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
  const hour = Number(match[4] ?? 0);
  const minute = Number(match[5] ?? 0);
  const second = Number(match[6] ?? 0);
  const date = new Date(year, month - 1, day, hour, minute, second);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function isEmptyRow(worksheet: XLSX.WorkSheet, rowIndex: number, range: XLSX.Range) {
  for (let columnIndex = range.s.c; columnIndex <= range.e.c; columnIndex += 1) {
    if (getCellText(worksheet, rowIndex, columnIndex)) {
      return false;
    }
  }

  return true;
}

function parseWorksheetRow(
  worksheet: XLSX.WorkSheet,
  rowIndex: number,
  headerIndex: HeaderIndex
): ParsedUploadRow {
  const draft = emptyDraft();

  draft.customer = getCellText(worksheet, rowIndex, headerIndex.customer);
  draft.site = getCellText(worksheet, rowIndex, headerIndex.site);
  draft.process = toProcess(getCellText(worksheet, rowIndex, headerIndex.process));
  draft.item_code = getCellText(worksheet, rowIndex, headerIndex.itemCode);
  draft.item_name = getCellText(worksheet, rowIndex, headerIndex.itemName);
  draft.width = toNullableNumber(getCellText(worksheet, rowIndex, headerIndex.width));
  draft.height = toNullableNumber(getCellText(worksheet, rowIndex, headerIndex.height));
  draft.quantity = toQuantity(getCellText(worksheet, rowIndex, headerIndex.quantity));
  draft.line = getCellText(worksheet, rowIndex, headerIndex.line);
  draft.request_no = getCellText(worksheet, rowIndex, headerIndex.requestNo);
  draft.registrant = getCellText(worksheet, rowIndex, headerIndex.registrant);
  draft.memo = getCellText(worksheet, rowIndex, headerIndex.memo);
  draft.status = toStatus(getCellText(worksheet, rowIndex, headerIndex.status));

  if (!draft.customer || !draft.item_name || !draft.quantity) {
    const reason = !draft.customer
      ? "거래처 누락"
      : !draft.item_name
        ? "품명 누락"
        : "수량 누락";

    return {
      rowIndex: rowIndex + 1,
      draft,
      createdAt: parseCreatedAt(getCellText(worksheet, rowIndex, headerIndex.createdAt)),
      pid: getCellText(worksheet, rowIndex, headerIndex.pid) || null,
      no: getCellText(worksheet, rowIndex, headerIndex.no) || null,
      valid: false,
      reason
    };
  }

  return {
    rowIndex: rowIndex + 1,
    draft,
    createdAt: parseCreatedAt(getCellText(worksheet, rowIndex, headerIndex.createdAt)),
    pid: getCellText(worksheet, rowIndex, headerIndex.pid) || null,
    no: getCellText(worksheet, rowIndex, headerIndex.no) || null,
    valid: true
  };
}

export function readWorkbook(buffer: ArrayBuffer) {
  return XLSX.read(buffer, {
    type: "array",
    dense: false,
    cellDates: false
  });
}

export function analyzeWorkbook(
  buffer: ArrayBuffer,
  fileName: string,
  previewLimit = UPLOAD_PREVIEW_LIMIT
): UploadPreviewSummary {
  const workbook = readWorkbook(buffer);
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    return {
      fileName,
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      previewRows: []
    };
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const range = XLSX.utils.decode_range(worksheet["!ref"] ?? "A1:A1");
  const headerIndex = buildHeaderIndex(worksheet, range);
  const previewRows: UploadPreviewRow[] = [];
  let totalRows = 0;
  let validRows = 0;
  let invalidRows = 0;

  for (let rowIndex = range.s.r + 1; rowIndex <= range.e.r; rowIndex += 1) {
    if (isEmptyRow(worksheet, rowIndex, range)) {
      continue;
    }

    totalRows += 1;

    const parsed = parseWorksheetRow(worksheet, rowIndex, headerIndex);
    if (parsed.valid) {
      validRows += 1;
    } else {
      invalidRows += 1;
    }

    if (previewRows.length < previewLimit) {
      previewRows.push({
        rowIndex: parsed.rowIndex,
        draft: parsed.draft,
        valid: parsed.valid,
        reason: parsed.reason
      });
    }
  }

  return {
    fileName,
    totalRows,
    validRows,
    invalidRows,
    previewRows
  };
}

export async function importWorkbookInBatches(
  buffer: ArrayBuffer,
  insertBatch: (rows: Array<Record<string, unknown>>) => Promise<void>,
  batchSize = UPLOAD_BATCH_SIZE
) {
  const workbook = readWorkbook(buffer);
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    return {
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      insertedRows: 0
    };
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const range = XLSX.utils.decode_range(worksheet["!ref"] ?? "A1:A1");
  const headerIndex = buildHeaderIndex(worksheet, range);
  const batch: Array<Record<string, unknown>> = [];
  let totalRows = 0;
  let validRows = 0;
  let invalidRows = 0;
  let insertedRows = 0;

  for (let rowIndex = range.s.r + 1; rowIndex <= range.e.r; rowIndex += 1) {
    if (isEmptyRow(worksheet, rowIndex, range)) {
      continue;
    }

    totalRows += 1;

    const parsed = parseWorksheetRow(worksheet, rowIndex, headerIndex);
    if (!parsed.valid) {
      invalidRows += 1;
      continue;
    }

    validRows += 1;
    batch.push({
      created_at: parsed.createdAt,
      pid: parsed.pid,
      process: parsed.draft.process || null,
      item_code: parsed.draft.item_code.trim() || null,
      item_name: parsed.draft.item_name.trim(),
      width: parsed.draft.width,
      height: parsed.draft.height,
      quantity: parsed.draft.quantity,
      area_pyeong: calculateAreaPyeong(
        parsed.draft.width,
        parsed.draft.height,
        parsed.draft.quantity
      ),
      request_no: parsed.draft.request_no.trim() || null,
      no: parsed.no,
      customer: parsed.draft.customer.trim(),
      site: parsed.draft.site.trim() || null,
      line: parsed.draft.line.trim() || null,
      registrant: parsed.draft.registrant.trim() || null,
      status: parsed.draft.status,
      memo: parsed.draft.memo.trim() || null,
      is_favorite_source: false
    });

    if (batch.length >= batchSize) {
      await insertBatch(batch);
      insertedRows += batch.length;
      batch.length = 0;
    }
  }

  if (batch.length) {
    await insertBatch(batch);
    insertedRows += batch.length;
  }

  return {
    totalRows,
    validRows,
    invalidRows,
    insertedRows
  };
}
