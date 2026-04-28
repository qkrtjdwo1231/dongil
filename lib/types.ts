export type Role = "팀장" | "대표";

export type TeamLeadMenu = "dashboard" | "projects" | "schedule" | "teams" | "settings";

export type ExecutiveMenu =
  | "dashboard"
  | "analysis"
  | "targets"
  | "data-grid"
  | "import"
  | "ai-analysis"
  | "settings";

export type ProcessType = string;

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

export type ImportedOrderDraft = {
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

export type UploadPreviewRow = {
  rowIndex: number;
  pid: string | null;
  no: string | null;
  draft: ImportedOrderDraft;
  valid: boolean;
  reason?: string;
};

export type UploadAnalysisGroup = {
  label: string;
  count: number;
  quantity: number;
  area: number;
};

export type UploadAnalysisSnapshot = {
  periodStart: string | null;
  periodEnd: string | null;
  totalQuantity: number;
  totalArea: number;
  uniqueCustomers: number;
  uniqueSites: number;
  uniqueItems: number;
  uniqueLines: number;
  uniqueRegistrants: number;
  uniquePids: number;
  rowsWithPid: number;
  rowsMissingPid: number;
  rowsMissingDimensions: number;
  rowsMissingCustomer: number;
  rowsMissingItemName: number;
  rowsMissingQuantity: number;
  rowsMarkedHold: number;
  topCustomers: UploadAnalysisGroup[];
  topItems: UploadAnalysisGroup[];
  topLines: UploadAnalysisGroup[];
  topProcesses: UploadAnalysisGroup[];
  topRegistrants: UploadAnalysisGroup[];
  highlights: string[];
};

export type UploadPreviewSummary = {
  fileName: string;
  sheetName?: string | null;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  previewRows: UploadPreviewRow[];
  analysis: UploadAnalysisSnapshot;
};

export type UploadImportResult = {
  fileName?: string;
  sheetName?: string | null;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  insertedRows: number;
  uploadedFileId?: string;
  insertedUploadRows?: number;
  storedFileBucket?: string;
  storedFilePath?: string;
  analysis: UploadAnalysisSnapshot;
};

export type StoredUploadFile = {
  name: string;
  path: string;
  size: number | null;
  updatedAt: string | null;
  signedUrl: string | null;
};

export type UploadChatUsedFile = {
  id?: string;
  name: string;
  path: string;
  summary: string;
  rowCount?: number;
};

export type AiMemoryRule = {
  id: string;
  created_at: string;
  title: string;
  category: string;
  content: string;
  priority: number;
  is_active: boolean;
};
