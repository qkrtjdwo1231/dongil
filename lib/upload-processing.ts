import * as XLSX from "xlsx";
import { calculateAreaPyeong } from "@/lib/calculations";
import type {
  ImportedOrderDraft,
  OrderStatus,
  ProcessType,
  UploadPreviewRow,
  UploadPreviewSummary
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
  rawPayload: Record<string, string>;
  normalizedText: string;
};

type UploadExtraction = {
  fileName: string;
  sheetName: string | null;
  headers: string[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
  parsedRows: ParsedUploadRow[];
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
    createdAt: findHeader("등록일시", "createdat", "date", "created_at"),
    pid: findHeader("pid"),
    process: findHeader("공정", "process"),
    itemCode: findHeader("품목코드", "itemcode", "code", "item_code"),
    itemName: findHeader("품명", "품목명", "itemname", "item_name"),
    width: findHeader("가로", "width"),
    height: findHeader("세로", "height"),
    quantity: findHeader("수량", "개수", "quantity"),
    requestNo: findHeader("의뢰번호", "requestno", "request_no"),
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

  const date = new Date(trimmed);
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

function buildRawPayload(
  worksheet: XLSX.WorkSheet,
  rowIndex: number,
  range: XLSX.Range,
  headers: string[]
) {
  const payload: Record<string, string> = {};

  for (let columnIndex = range.s.c; columnIndex <= range.e.c; columnIndex += 1) {
    const headerLabel = headers[columnIndex - range.s.c] || `column_${columnIndex + 1}`;
    payload[headerLabel] = getCellText(worksheet, rowIndex, columnIndex);
  }

  return payload;
}

function buildNormalizedText(parsed: {
  pid: string | null;
  no: string | null;
  draft: ImportedOrderDraft;
}) {
  const parts = [
    parsed.pid,
    parsed.no,
    parsed.draft.customer,
    parsed.draft.site,
    parsed.draft.process,
    parsed.draft.item_code,
    parsed.draft.item_name,
    parsed.draft.width ? String(parsed.draft.width) : null,
    parsed.draft.height ? String(parsed.draft.height) : null,
    parsed.draft.quantity ? String(parsed.draft.quantity) : null,
    parsed.draft.line,
    parsed.draft.request_no,
    parsed.draft.registrant,
    parsed.draft.memo,
    parsed.draft.status
  ];

  return parts.filter((value): value is string => Boolean(value && value.trim())).join(" ");
}

function parseWorksheetRow(
  worksheet: XLSX.WorkSheet,
  rowIndex: number,
  range: XLSX.Range,
  headerIndex: HeaderIndex,
  headers: string[]
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

  const parsed: ParsedUploadRow = {
    rowIndex: rowIndex + 1,
    draft,
    createdAt: parseCreatedAt(getCellText(worksheet, rowIndex, headerIndex.createdAt)),
    pid: getCellText(worksheet, rowIndex, headerIndex.pid) || null,
    no: getCellText(worksheet, rowIndex, headerIndex.no) || null,
    valid: true,
    rawPayload: buildRawPayload(worksheet, rowIndex, range, headers),
    normalizedText: ""
  };

  if (!draft.customer || !draft.item_name || !draft.quantity) {
    parsed.valid = false;
    parsed.reason = !draft.customer ? "거래처 누락" : !draft.item_name ? "품명 누락" : "수량 누락";
  }

  parsed.normalizedText = buildNormalizedText(parsed);
  return parsed;
}

export function readWorkbook(buffer: ArrayBuffer) {
  return XLSX.read(buffer, {
    type: "array",
    dense: false,
    cellDates: false
  });
}

export function extractWorkbookData(
  buffer: ArrayBuffer,
  fileName: string,
  previewLimit = UPLOAD_PREVIEW_LIMIT
): UploadExtraction {
  const workbook = readWorkbook(buffer);
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    return {
      fileName,
      sheetName: null,
      headers: [],
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      parsedRows: [],
      previewRows: []
    };
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const range = XLSX.utils.decode_range(worksheet["!ref"] ?? "A1:A1");
  const headers = [] as string[];
  for (let columnIndex = range.s.c; columnIndex <= range.e.c; columnIndex += 1) {
    headers.push(getCellText(worksheet, range.s.r, columnIndex) || `column_${columnIndex + 1}`);
  }

  const headerIndex = buildHeaderIndex(worksheet, range);
  const parsedRows: ParsedUploadRow[] = [];
  const previewRows: UploadPreviewRow[] = [];
  let totalRows = 0;
  let validRows = 0;
  let invalidRows = 0;

  for (let rowIndex = range.s.r + 1; rowIndex <= range.e.r; rowIndex += 1) {
    if (isEmptyRow(worksheet, rowIndex, range)) {
      continue;
    }

    totalRows += 1;
    const parsed = parseWorksheetRow(worksheet, rowIndex, range, headerIndex, headers);
    parsedRows.push(parsed);

    if (parsed.valid) {
      validRows += 1;
    } else {
      invalidRows += 1;
    }

    if (previewRows.length < previewLimit) {
      previewRows.push({
        rowIndex: parsed.rowIndex,
        pid: parsed.pid,
        no: parsed.no,
        draft: parsed.draft,
        valid: parsed.valid,
        reason: parsed.reason
      });
    }
  }

  return {
    fileName,
    sheetName: firstSheetName,
    headers,
    totalRows,
    validRows,
    invalidRows,
    parsedRows,
    previewRows
  };
}

export function analyzeWorkbook(
  buffer: ArrayBuffer,
  fileName: string,
  previewLimit = UPLOAD_PREVIEW_LIMIT
): UploadPreviewSummary {
  const extraction = extractWorkbookData(buffer, fileName, previewLimit);

  return {
    fileName: extraction.fileName,
    totalRows: extraction.totalRows,
    validRows: extraction.validRows,
    invalidRows: extraction.invalidRows,
    previewRows: extraction.previewRows
  };
}

export function buildOrderInsertRows(parsedRows: ParsedUploadRow[]) {
  return parsedRows
    .filter((row) => row.valid)
    .map((row) => ({
      created_at: row.createdAt,
      pid: row.pid,
      process: row.draft.process || null,
      item_code: row.draft.item_code.trim() || null,
      item_name: row.draft.item_name.trim(),
      width: row.draft.width,
      height: row.draft.height,
      quantity: row.draft.quantity,
      area_pyeong: calculateAreaPyeong(row.draft.width, row.draft.height, row.draft.quantity),
      request_no: row.draft.request_no.trim() || null,
      no: row.no,
      customer: row.draft.customer.trim(),
      site: row.draft.site.trim() || null,
      line: row.draft.line.trim() || null,
      registrant: row.draft.registrant.trim() || null,
      status: row.draft.status,
      memo: row.draft.memo.trim() || null,
      is_favorite_source: false
    }));
}

export function buildUploadedRowInsertRows(fileId: string, parsedRows: ParsedUploadRow[]) {
  return parsedRows.map((row) => ({
    file_id: fileId,
    row_index: row.rowIndex,
    pid: row.pid,
    customer: row.draft.customer.trim() || null,
    site: row.draft.site.trim() || null,
    process: row.draft.process || null,
    item_code: row.draft.item_code.trim() || null,
    item_name: row.draft.item_name.trim() || null,
    width: row.draft.width,
    height: row.draft.height,
    quantity: row.draft.quantity || null,
    line: row.draft.line.trim() || null,
    request_no: row.draft.request_no.trim() || null,
    registrant: row.draft.registrant.trim() || null,
    status: row.draft.status,
    memo: row.draft.memo.trim() || null,
    area_pyeong:
      row.draft.width && row.draft.height && row.draft.quantity
        ? calculateAreaPyeong(row.draft.width, row.draft.height, row.draft.quantity)
        : null,
    is_valid: row.valid,
    validation_notes: row.reason || null,
    normalized_text: row.normalizedText,
    raw_payload: row.rawPayload
  }));
}

export async function insertRowsInBatches(
  rows: Array<Record<string, unknown>>,
  insertBatch: (rows: Array<Record<string, unknown>>) => Promise<void>,
  batchSize = UPLOAD_BATCH_SIZE
) {
  for (let index = 0; index < rows.length; index += batchSize) {
    await insertBatch(rows.slice(index, index + batchSize));
  }
}
