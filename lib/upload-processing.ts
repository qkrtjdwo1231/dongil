import * as XLSX from "xlsx";
import { calculateAreaPyeong } from "@/lib/calculations";
import { classifyProductFamily } from "@/lib/product-family";
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
  eventDate: string | null;
  eventMonth: string | null;
  eventHour: number | null;
  pid: string | null;
  no: string | null;
  normalizedLine: string | null;
  normalizedSite: string | null;
  productFamily: string;
  pidDuplicate: boolean;
  widthInvalid: boolean;
  heightInvalid: boolean;
  areaInvalid: boolean;
  afterHours: boolean;
  anomalyNotes: string[];
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
  uniqueProductFamilies: 0,
  uniqueLines: 0,
  uniqueRegistrants: 0,
  uniquePids: 0,
  rowsWithPid: 0,
  rowsMissingPid: 0,
  rowsDuplicatePid: 0,
  rowsMissingDimensions: 0,
  rowsMissingCustomer: 0,
  rowsMissingSite: 0,
  rowsMissingItemName: 0,
  rowsMissingQuantity: 0,
  rowsMissingLine: 0,
  rowsMarkedHold: 0,
  rowsInvalidWidth: 0,
  rowsInvalidHeight: 0,
  rowsInvalidArea: 0,
  rowsAfterHours: 0,
  peakMonthLabel: null,
  peakHourLabel: null,
  topProductFamilies: [],
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

function normalizeSite(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : "현장 미입력";
}

function normalizeLine(value: string) {
  const trimmed = value.trim().toUpperCase();
  if (!trimmed) {
    return null;
  }

  if (/(^|\D)1\s*-?\s*LINE/.test(trimmed) || trimmed === "1" || trimmed === "1LINE") {
    return "1-LINE";
  }

  if (/(^|\D)2\s*-?\s*LINE/.test(trimmed) || trimmed === "2" || trimmed === "2LINE") {
    return "2-LINE";
  }

  return trimmed;
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

function extractDateParts(value: string | null) {
  if (!value) {
    return {
      eventDate: null,
      eventMonth: null,
      eventHour: null,
      afterHours: false
    };
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return {
      eventDate: null,
      eventMonth: null,
      eventHour: null,
      afterHours: false
    };
  }

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = date.getHours();

  return {
    eventDate: `${date.getFullYear()}-${month}-${day}`,
    eventMonth: `${date.getFullYear()}-${month}`,
    eventHour: hour,
    afterHours: hour >= 18
  };
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

function buildNormalizedText(parsed: ParsedUploadRow) {
  const parts = [
    parsed.pid,
    parsed.no,
    parsed.draft.customer,
    parsed.normalizedSite,
    parsed.draft.process,
    parsed.productFamily,
    parsed.draft.item_code,
    parsed.draft.item_name,
    parsed.draft.width ? String(parsed.draft.width) : null,
    parsed.draft.height ? String(parsed.draft.height) : null,
    parsed.draft.quantity ? String(parsed.draft.quantity) : null,
    parsed.normalizedLine,
    parsed.draft.request_no,
    parsed.draft.registrant,
    parsed.draft.memo,
    parsed.draft.status,
    parsed.eventMonth,
    parsed.eventHour !== null ? `${parsed.eventHour}시` : null,
    ...parsed.anomalyNotes
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

function detectPeakLabel(counter: Map<string, number>) {
  const sorted = [...counter.entries()].sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] ?? null;
}

function buildHighlights(summary: Omit<UploadAnalysisSnapshot, "highlights">) {
  const highlights: string[] = [];

  if (summary.rowsMissingDimensions > 0) {
    highlights.push(`규격 누락 ${summary.rowsMissingDimensions.toLocaleString()}건`);
  }

  if (summary.rowsMissingSite > 0) {
    highlights.push(`현장 미입력 ${summary.rowsMissingSite.toLocaleString()}건`);
  }

  if (summary.rowsAfterHours > 0) {
    highlights.push(`18시 이후 등록 ${summary.rowsAfterHours.toLocaleString()}건`);
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

  if (summary.topProductFamilies.length && summary.totalQuantity > 0) {
    const topFamily = summary.topProductFamilies[0];
    const familyShare = (topFamily.quantity / summary.totalQuantity) * 100;
    if (familyShare >= 60) {
      highlights.push(`${topFamily.label} 비중 ${familyShare.toFixed(1)}%`);
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

  const familyMap = new Map<string, { count: number; quantity: number; area: number }>();
  const customerMap = new Map<string, { count: number; quantity: number; area: number }>();
  const itemMap = new Map<string, { count: number; quantity: number; area: number }>();
  const lineMap = new Map<string, { count: number; quantity: number; area: number }>();
  const processMap = new Map<string, { count: number; quantity: number; area: number }>();
  const registrantMap = new Map<string, { count: number; quantity: number; area: number }>();
  const monthCounter = new Map<string, number>();
  const hourCounter = new Map<string, number>();

  const createdAtList = parsedRows
    .map((row) => row.createdAt)
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => new Date(left).getTime() - new Date(right).getTime());

  let totalQuantity = 0;
  let totalArea = 0;
  let rowsWithPid = 0;
  let rowsMissingPid = 0;
  let rowsDuplicatePid = 0;
  let rowsMissingDimensions = 0;
  let rowsMissingCustomer = 0;
  let rowsMissingSite = 0;
  let rowsMissingItemName = 0;
  let rowsMissingQuantity = 0;
  let rowsMissingLine = 0;
  let rowsMarkedHold = 0;
  let rowsInvalidWidth = 0;
  let rowsInvalidHeight = 0;
  let rowsInvalidArea = 0;
  let rowsAfterHours = 0;

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

    if (row.pidDuplicate) {
      rowsDuplicatePid += 1;
    }

    if (!row.draft.width || !row.draft.height) {
      rowsMissingDimensions += 1;
    }

    if (!row.draft.customer.trim()) {
      rowsMissingCustomer += 1;
    }

    if (row.normalizedSite === "현장 미입력") {
      rowsMissingSite += 1;
    }

    if (!row.draft.item_name.trim()) {
      rowsMissingItemName += 1;
    }

    if (!row.draft.quantity) {
      rowsMissingQuantity += 1;
    }

    if (!row.normalizedLine) {
      rowsMissingLine += 1;
    }

    if (row.draft.status === "확인필요" || row.draft.status === "보류") {
      rowsMarkedHold += 1;
    }

    if (row.widthInvalid) {
      rowsInvalidWidth += 1;
    }

    if (row.heightInvalid) {
      rowsInvalidHeight += 1;
    }

    if (row.areaInvalid) {
      rowsInvalidArea += 1;
    }

    if (row.afterHours) {
      rowsAfterHours += 1;
    }

    if (row.eventMonth) {
      monthCounter.set(row.eventMonth, (monthCounter.get(row.eventMonth) ?? 0) + 1);
    }

    if (row.eventHour !== null) {
      const label = `${String(row.eventHour).padStart(2, "0")}시`;
      hourCounter.set(label, (hourCounter.get(label) ?? 0) + 1);
    }

    upsertMetric(familyMap, row.productFamily, quantity, area);
    upsertMetric(customerMap, row.draft.customer, quantity, area);
    upsertMetric(itemMap, row.draft.item_name, quantity, area);
    upsertMetric(lineMap, row.normalizedLine, quantity, area);
    upsertMetric(processMap, row.draft.process, quantity, area);
    upsertMetric(registrantMap, row.draft.registrant, quantity, area);
  });

  const baseSummary = {
    periodStart: formatDateLabel(createdAtList[0] ?? null),
    periodEnd: formatDateLabel(createdAtList.at(-1) ?? null),
    totalQuantity,
    totalArea,
    uniqueCustomers: countUnique(parsedRows.map((row) => row.draft.customer)),
    uniqueSites: countUnique(parsedRows.map((row) => row.normalizedSite)),
    uniqueItems: countUnique(parsedRows.map((row) => row.draft.item_name)),
    uniqueProductFamilies: countUnique(parsedRows.map((row) => row.productFamily)),
    uniqueLines: countUnique(parsedRows.map((row) => row.normalizedLine)),
    uniqueRegistrants: countUnique(parsedRows.map((row) => row.draft.registrant)),
    uniquePids: countUnique(parsedRows.map((row) => row.pid)),
    rowsWithPid,
    rowsMissingPid,
    rowsDuplicatePid,
    rowsMissingDimensions,
    rowsMissingCustomer,
    rowsMissingSite,
    rowsMissingItemName,
    rowsMissingQuantity,
    rowsMissingLine,
    rowsMarkedHold,
    rowsInvalidWidth,
    rowsInvalidHeight,
    rowsInvalidArea,
    rowsAfterHours,
    peakMonthLabel: detectPeakLabel(monthCounter),
    peakHourLabel: detectPeakLabel(hourCounter),
    topProductFamilies: buildTopGroups(familyMap),
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

  const createdAt = parseCreatedAt(getCellText(worksheet, rowIndex, headerIndex.createdAt));
  const { eventDate, eventMonth, eventHour, afterHours } = extractDateParts(createdAt);
  const normalizedLine = normalizeLine(draft.line);
  const normalizedSite = normalizeSite(draft.site);
  const productFamily = classifyProductFamily(draft.item_name);
  const widthInvalid = draft.width !== null && draft.width <= 0;
  const heightInvalid = draft.height !== null && draft.height <= 0;
  const areaInvalid =
    draft.width !== null && draft.height !== null && draft.quantity > 0
      ? (calculateAreaPyeong(draft.width, draft.height, draft.quantity) ?? 0) <= 0
      : false;

  const parsed: ParsedUploadRow = {
    rowIndex: rowIndex + 1,
    draft,
    createdAt,
    eventDate,
    eventMonth,
    eventHour,
    pid: getCellText(worksheet, rowIndex, headerIndex.pid) || null,
    no: getCellText(worksheet, rowIndex, headerIndex.no) || null,
    normalizedLine,
    normalizedSite,
    productFamily,
    pidDuplicate: false,
    widthInvalid,
    heightInvalid,
    areaInvalid,
    afterHours,
    anomalyNotes: [],
    valid: true,
    rawPayload: buildRawPayload(worksheet, rowIndex, range, headers),
    normalizedText: ""
  };

  if (!draft.customer || !draft.item_name || !draft.quantity) {
    parsed.valid = false;
    parsed.reason = !draft.customer ? "거래처 누락" : !draft.item_name ? "품명 누락" : "수량 누락";
  }

  if (widthInvalid) {
    parsed.anomalyNotes.push("가로 이상값");
  }

  if (heightInvalid) {
    parsed.anomalyNotes.push("세로 이상값");
  }

  if (areaInvalid) {
    parsed.anomalyNotes.push("평수 이상값");
  }

  if (normalizedSite === "현장 미입력") {
    parsed.anomalyNotes.push("현장 미입력");
  }

  if (!normalizedLine) {
    parsed.anomalyNotes.push("라인 미입력");
  }

  if (afterHours) {
    parsed.anomalyNotes.push("18시 이후 등록");
  }

  parsed.normalizedText = buildNormalizedText(parsed);
  return parsed;
}

function applyDuplicatePidFlags(rows: ParsedUploadRow[]) {
  const pidCount = new Map<string, number>();

  rows.forEach((row) => {
    if (!row.pid) {
      return;
    }

    const key = row.pid.trim().toLowerCase();
    pidCount.set(key, (pidCount.get(key) ?? 0) + 1);
  });

  rows.forEach((row) => {
    if (!row.pid) {
      return;
    }

    const key = row.pid.trim().toLowerCase();
    if ((pidCount.get(key) ?? 0) > 1) {
      row.pidDuplicate = true;
      if (!row.anomalyNotes.includes("PID 중복")) {
        row.anomalyNotes.push("PID 중복");
      }
      row.normalizedText = buildNormalizedText(row);
    }
  });
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
  const headers: string[] = [];

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
  }

  applyDuplicatePidFlags(parsedRows);

  for (const parsed of parsedRows) {
    if (previewRows.length >= previewLimit) {
      break;
    }

    previewRows.push({
      rowIndex: parsed.rowIndex,
      pid: parsed.pid,
      no: parsed.no,
      draft: parsed.draft,
      valid: parsed.valid,
      reason: parsed.reason
    });
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
      product_family: row.productFamily,
      item_code: row.draft.item_code.trim() || null,
      item_name: row.draft.item_name.trim(),
      width: row.draft.width,
      height: row.draft.height,
      quantity: row.draft.quantity,
      area_pyeong: calculateAreaPyeong(row.draft.width, row.draft.height, row.draft.quantity),
      request_no: row.draft.request_no.trim() || null,
      no: row.no,
      customer: row.draft.customer.trim(),
      site: row.normalizedSite,
      line: row.normalizedLine,
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
    event_date: row.eventDate,
    event_month: row.eventMonth,
    event_hour: row.eventHour,
    pid: row.pid,
    pid_duplicate: row.pidDuplicate,
    customer: row.draft.customer.trim() || null,
    site: row.normalizedSite,
    process: row.draft.process || null,
    product_family: row.productFamily,
    item_code: row.draft.item_code.trim() || null,
    item_name: row.draft.item_name.trim() || null,
    width: row.draft.width,
    height: row.draft.height,
    quantity: row.draft.quantity || null,
    line: row.normalizedLine,
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
    anomaly_notes: row.anomalyNotes.length ? row.anomalyNotes.join(", ") : null,
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
