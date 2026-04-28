import * as XLSX from "xlsx";
import { calculateAreaPyeong } from "@/lib/calculations";
import type {
  ImportedOrderDraft,
  OrderStatus,
  ProcessType,
  UploadAnalysisGroup,
  UploadAnalysisSnapshot,
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
  analysis: UploadAnalysisSnapshot;
};

const EMPTY_ANALYSIS: UploadAnalysisSnapshot = {
  periodStart: null,
  periodEnd: null,
  totalQuantity: 0,
  totalArea: 0,
  uniqueCustomers: 0,
  uniqueSites: 0,
  uniqueItems: 0,
  uniqueLines: 0,
  uniqueRegistrants: 0,
  uniquePids: 0,
  rowsWithPid: 0,
  rowsMissingPid: 0,
  rowsMissingDimensions: 0,
  rowsMissingCustomer: 0,
  rowsMissingItemName: 0,
  rowsMissingQuantity: 0,
  rowsMarkedHold: 0,
  topCustomers: [],
  topItems: [],
  topLines: [],
  topProcesses: [],
  topRegistrants: [],
  highlights: []
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

function countUnique(values: Array<string | null | undefined>) {
  return new Set(values.filter((value): value is string => Boolean(value && value.trim()))).size;
}

function formatDateLabel(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function buildTopGroups(
  map: Map<string, { count: number; quantity: number; area: number }>,
  limit = 5
): UploadAnalysisGroup[] {
  return [...map.entries()]
    .map(([label, value]) => ({
      label,
      count: value.count,
      quantity: value.quantity,
      area: value.area
    }))
    .sort((left, right) => {
      if (right.quantity !== left.quantity) {
        return right.quantity - left.quantity;
      }
      if (right.area !== left.area) {
        return right.area - left.area;
      }
      return right.count - left.count;
    })
    .slice(0, limit);
}

function upsertMetric(
  map: Map<string, { count: number; quantity: number; area: number }>,
  key: string | null | undefined,
  quantity: number,
  area: number
) {
  const label = key?.trim();
  if (!label) {
    return;
  }

  const current = map.get(label) ?? { count: 0, quantity: 0, area: 0 };
  current.count += 1;
  current.quantity += quantity;
  current.area += area;
  map.set(label, current);
}

function buildHighlights(summary: Omit<UploadAnalysisSnapshot, "highlights">) {
  const highlights: string[] = [];

  if (summary.rowsMissingPid > 0) {
    highlights.push(`PID 누락 ${summary.rowsMissingPid.toLocaleString()}건`);
  }

  if (summary.rowsMissingDimensions > 0) {
    highlights.push(`규격 누락 ${summary.rowsMissingDimensions.toLocaleString()}건`);
  }

  if (summary.rowsMissingQuantity > 0) {
    highlights.push(`수량 누락 ${summary.rowsMissingQuantity.toLocaleString()}건`);
  }

  if (summary.rowsMarkedHold > 0) {
    highlights.push(`보류/확인필요 상태 ${summary.rowsMarkedHold.toLocaleString()}건`);
  }

  if (summary.topCustomers.length && summary.totalQuantity > 0) {
    const topCustomer = summary.topCustomers[0];
    const concentration = (topCustomer.quantity / summary.totalQuantity) * 100;
    if (concentration >= 35) {
      highlights.push(`${topCustomer.label} 비중 ${concentration.toFixed(1)}%`);
    }
  }

  if (summary.topLines.length && summary.totalQuantity > 0) {
    const topLine = summary.topLines[0];
    const lineShare = (topLine.quantity / summary.totalQuantity) * 100;
    if (lineShare >= 55) {
      highlights.push(`${topLine.label} 라인 집중 ${lineShare.toFixed(1)}%`);
    }
  }

  if (!highlights.length) {
    highlights.push("업로드 직후 바로 분석 가능한 기본 구조를 확인했습니다.");
  }

  return highlights.slice(0, 6);
}

function buildAnalysisSnapshot(parsedRows: ParsedUploadRow[]): UploadAnalysisSnapshot {
  if (!parsedRows.length) {
    return EMPTY_ANALYSIS;
  }

  const customerMap = new Map<string, { count: number; quantity: number; area: number }>();
  const itemMap = new Map<string, { count: number; quantity: number; area: number }>();
  const lineMap = new Map<string, { count: number; quantity: number; area: number }>();
  const processMap = new Map<string, { count: number; quantity: number; area: number }>();
  const registrantMap = new Map<string, { count: number; quantity: number; area: number }>();

  const createdAtList = parsedRows
    .map((row) => row.createdAt)
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => new Date(left).getTime() - new Date(right).getTime());

  let totalQuantity = 0;
  let totalArea = 0;
  let rowsWithPid = 0;
  let rowsMissingPid = 0;
  let rowsMissingDimensions = 0;
  let rowsMissingCustomer = 0;
  let rowsMissingItemName = 0;
  let rowsMissingQuantity = 0;
  let rowsMarkedHold = 0;

  parsedRows.forEach((row) => {
    const quantity = row.draft.quantity || 0;
    const area =
      row.draft.width && row.draft.height && row.draft.quantity
        ? (calculateAreaPyeong(row.draft.width, row.draft.height, row.draft.quantity) ?? 0)
        : 0;

    totalQuantity += quantity;
    totalArea += area;

    if (row.pid) {
      rowsWithPid += 1;
    } else {
      rowsMissingPid += 1;
    }

    if (!row.draft.width || !row.draft.height) {
      rowsMissingDimensions += 1;
    }

    if (!row.draft.customer.trim()) {
      rowsMissingCustomer += 1;
    }

    if (!row.draft.item_name.trim()) {
      rowsMissingItemName += 1;
    }

    if (!row.draft.quantity) {
      rowsMissingQuantity += 1;
    }

    if (row.draft.status === "확인필요" || row.draft.status === "보류") {
      rowsMarkedHold += 1;
    }

    upsertMetric(customerMap, row.draft.customer, quantity, area);
    upsertMetric(itemMap, row.draft.item_name, quantity, area);
    upsertMetric(lineMap, row.draft.line, quantity, area);
    upsertMetric(processMap, row.draft.process, quantity, area);
    upsertMetric(registrantMap, row.draft.registrant, quantity, area);
  });

  const baseSummary = {
    periodStart: formatDateLabel(createdAtList[0] ?? null),
    periodEnd: formatDateLabel(createdAtList.at(-1) ?? null),
    totalQuantity,
    totalArea,
    uniqueCustomers: countUnique(parsedRows.map((row) => row.draft.customer)),
    uniqueSites: countUnique(parsedRows.map((row) => row.draft.site)),
    uniqueItems: countUnique(parsedRows.map((row) => row.draft.item_name)),
    uniqueLines: countUnique(parsedRows.map((row) => row.draft.line)),
    uniqueRegistrants: countUnique(parsedRows.map((row) => row.draft.registrant)),
    uniquePids: countUnique(parsedRows.map((row) => row.pid)),
    rowsWithPid,
    rowsMissingPid,
    rowsMissingDimensions,
    rowsMissingCustomer,
    rowsMissingItemName,
    rowsMissingQuantity,
    rowsMarkedHold,
    topCustomers: buildTopGroups(customerMap),
    topItems: buildTopGroups(itemMap),
    topLines: buildTopGroups(lineMap),
    topProcesses: buildTopGroups(processMap),
    topRegistrants: buildTopGroups(registrantMap)
  };

  return {
    ...baseSummary,
    highlights: buildHighlights(baseSummary)
  };
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
      previewRows: [],
      analysis: EMPTY_ANALYSIS
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
    previewRows,
    analysis: buildAnalysisSnapshot(parsedRows)
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
    sheetName: extraction.sheetName,
    totalRows: extraction.totalRows,
    validRows: extraction.validRows,
    invalidRows: extraction.invalidRows,
    previewRows: extraction.previewRows,
    analysis: extraction.analysis
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
