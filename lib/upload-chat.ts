import type { UploadChatUsedFile } from "@/lib/types";

type UploadedFileRecord = {
  id: string;
  original_name: string;
  stored_path: string;
  summary_text: string | null;
};

type UploadedRowRecord = {
  id: string;
  row_index: number;
  pid: string | null;
  customer: string | null;
  site: string | null;
  process: string | null;
  item_code: string | null;
  item_name: string | null;
  width: number | null;
  height: number | null;
  quantity: number | null;
  line: string | null;
  request_no: string | null;
  registrant: string | null;
  status: string | null;
  memo: string | null;
  validation_notes: string | null;
  normalized_text: string | null;
};

type MemoryRuleRecord = {
  title: string;
  category: string;
  content: string;
  priority: number;
};

type SearchContext = {
  file: UploadedFileRecord;
  rows: UploadedRowRecord[];
};

type RecommendationMode = "basic" | "quick";

type RecommendationSuggestion = {
  customer: string | null;
  site: string | null;
  process: string | null;
  item_code: string | null;
  item_name: string | null;
  width: number | null;
  height: number | null;
  quantity: number | null;
  line: string | null;
  memo: string | null;
};

type LiveSuggestionItem = {
  label: string;
  reason: string;
  suggestion: RecommendationSuggestion;
};

const MAX_ROWS_PER_FILE = 18;
const FALLBACK_ROWS_PER_FILE = 10;

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeQuestion(question: string) {
  return question.toLowerCase().trim();
}

function extractPidTokens(question: string) {
  const matches = question.match(/pid\s*[:：-]?\s*([a-zA-Z0-9_-]+)/gi) ?? [];
  return unique(
    matches
      .map((match) => {
        const token = match.match(/([a-zA-Z0-9_-]+)$/);
        return token?.[1] ?? "";
      })
      .filter(Boolean)
  );
}

function extractKeywords(question: string) {
  const normalized = question
    .replace(/[.,/#!$%^&*;:{}=\-_`~()\[\]"]+/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);

  return unique(normalized);
}

function rowToLine(row: UploadedRowRecord) {
  return [
    `${row.row_index}행`,
    row.pid ? `PID ${row.pid}` : null,
    row.customer ? `거래처 ${row.customer}` : null,
    row.site ? `현장 ${row.site}` : null,
    row.process ? `공정 ${row.process}` : null,
    row.item_name ? `품명 ${row.item_name}` : null,
    row.item_code ? `품목코드 ${row.item_code}` : null,
    row.width || row.height ? `규격 ${row.width ?? "?"}x${row.height ?? "?"}` : null,
    row.quantity ? `수량 ${row.quantity}` : null,
    row.line ? `라인 ${row.line}` : null,
    row.request_no ? `의뢰번호 ${row.request_no}` : null,
    row.status ? `상태 ${row.status}` : null,
    row.validation_notes ? `검토 ${row.validation_notes}` : null,
    row.memo ? `메모 ${row.memo}` : null
  ]
    .filter(Boolean)
    .join(", ");
}

function scoreRow(row: UploadedRowRecord, normalizedQuestion: string, pidTokens: string[], keywords: string[]) {
  let score = 0;
  const haystack = [
    row.pid,
    row.customer,
    row.site,
    row.process,
    row.item_code,
    row.item_name,
    row.line,
    row.request_no,
    row.memo,
    row.validation_notes,
    row.normalized_text
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (pidTokens.length && row.pid && pidTokens.includes(row.pid.toLowerCase())) {
    score += 12;
  }

  for (const keyword of keywords) {
    if (haystack.includes(keyword.toLowerCase())) {
      score += 2;
    }
  }

  if (normalizedQuestion.includes("누락") || normalizedQuestion.includes("없")) {
    if (!row.width || !row.height || !row.quantity || row.validation_notes) {
      score += 3;
    }
  }

  return score;
}

export function buildSearchContext(
  file: UploadedFileRecord,
  rows: UploadedRowRecord[],
  question: string
): SearchContext {
  const normalizedQuestion = normalizeQuestion(question);
  const pidTokens = extractPidTokens(question).map((token) => token.toLowerCase());
  const keywords = extractKeywords(question);

  const scoredRows = rows
    .map((row) => ({
      row,
      score: scoreRow(row, normalizedQuestion, pidTokens, keywords)
    }))
    .sort((a, b) => b.score - a.score || a.row.row_index - b.row.row_index);

  const picked = scoredRows.filter((entry) => entry.score > 0).slice(0, MAX_ROWS_PER_FILE).map((entry) => entry.row);
  const fallback = rows.slice(0, FALLBACK_ROWS_PER_FILE);

  return {
    file,
    rows: picked.length ? picked : fallback
  };
}

function buildRuleSection(rules: MemoryRuleRecord[]) {
  if (!rules.length) {
    return "회사 기억 규칙: 별도 규칙 없음";
  }

  return [
    "회사 기억 규칙:",
    ...rules.map(
      (rule, index) =>
        `${index + 1}. [${rule.category}] ${rule.title} (우선순위 ${rule.priority}) - ${rule.content}`
    )
  ].join("\n");
}

export function buildPromptFromSearchContexts(
  question: string,
  contexts: SearchContext[],
  rules: MemoryRuleRecord[]
) {
  return [
    "너는 청주 유리/창호 제조업체의 작업관리 보조 도우미다.",
    "아래 저장된 업로드 데이터와 회사 기억 규칙만 바탕으로 답변해라.",
    "답변은 자연스러운 한국어로 짧고 명확하게 작성해라.",
    "모르는 내용은 추측하지 말고 업로드 데이터에서 확인되지 않는다고 답해라.",
    "필요하면 PID, 거래처, 현장, 품명, 규격, 수량, 라인, 검토메모를 근거로 정리해라.",
    "답변이 길어질 경우 먼저 핵심 결론을 1~3줄로 주고, 그 다음 근거를 정리해라.",
    buildRuleSection(rules),
    "",
    `질문: ${question}`,
    "",
    "참고 업로드 데이터:",
    ...contexts.flatMap((context, index) => [
      `파일 ${index + 1}: ${context.file.original_name}`,
      `요약: ${context.file.summary_text ?? "요약 없음"}`,
      `행 수: ${context.rows.length}`,
      ...context.rows.map((row) => rowToLine(row)),
      ""
    ])
  ].join("\n");
}

export function buildRecommendationPrompt(
  mode: RecommendationMode,
  currentInput: string,
  question: string,
  contexts: SearchContext[],
  rules: MemoryRuleRecord[]
) {
  return [
    "너는 청주 유리/창호 제조업체의 작업관리 추천 도우미다.",
    "반드시 저장된 업로드 데이터와 회사 기억 규칙만 근거로 추천해라.",
    "파일에 없는 값은 추측하지 말고 null로 둬라.",
    "추천은 현재 입력값을 보조하는 용도이며, 업로드 데이터와 연결되는 값만 제안해라.",
    mode === "basic"
      ? "기본 등록 추천이므로 거래처, 현장, 공정, 품명, 규격, 수량, 라인, 메모까지 보강 가능한 값을 제안해라."
      : "빠른 등록 추천이므로 거래처, 현장, 공정, 품명, 규격, 수량, 라인 중심으로 제안해라.",
    "응답은 반드시 JSON 하나만 반환하고, 설명 문장은 JSON 밖에 쓰지 마라.",
    "JSON 형식:",
    '{"summary":"짧은 요약","suggestion":{"customer":null,"site":null,"process":null,"item_code":null,"item_name":null,"width":null,"height":null,"quantity":null,"line":null,"memo":null}}',
    buildRuleSection(rules),
    "",
    `현재 입력값: ${currentInput || "없음"}`,
    `추가 요청: ${question || "없음"}`,
    "",
    "참고 업로드 데이터:",
    ...contexts.flatMap((context, index) => [
      `파일 ${index + 1}: ${context.file.original_name}`,
      `요약: ${context.file.summary_text ?? "요약 없음"}`,
      `행 수: ${context.rows.length}`,
      ...context.rows.map((row) => rowToLine(row)),
      ""
    ])
  ].join("\n");
}

export function buildLiveSuggestionPrompt(
  input: string,
  contexts: SearchContext[],
  rules: MemoryRuleRecord[]
) {
  return [
    "너는 청주 유리/창호 제조업체의 빠른 문장 입력 추천 도우미다.",
    "사용자가 타이핑 중인 문장을 저장된 업로드 데이터와 회사 기억 규칙만 바탕으로 해석해라.",
    "업로드 데이터에서 근거가 약한 값은 추천하지 말고 null로 둬라.",
    "응답은 반드시 JSON 하나만 반환하고 설명 문장은 JSON 밖에 쓰지 마라.",
    "추천 후보는 1개 이상 4개 이하로 만든다.",
    "JSON 형식:",
    '{"suggestions":[{"label":"짧은 후보명","reason":"왜 이 후보가 맞는지 짧게 설명","suggestion":{"customer":null,"site":null,"process":null,"item_code":null,"item_name":null,"width":null,"height":null,"quantity":null,"line":null,"memo":null}}]}',
    buildRuleSection(rules),
    "",
    `사용자 입력: ${input}`,
    "",
    "참고 업로드 데이터:",
    ...contexts.flatMap((context, index) => [
      `파일 ${index + 1}: ${context.file.original_name}`,
      `요약: ${context.file.summary_text ?? "요약 없음"}`,
      `행 수: ${context.rows.length}`,
      ...context.rows.map((row) => rowToLine(row)),
      ""
    ])
  ].join("\n");
}

export function buildUsedFileSummaries(contexts: SearchContext[]): UploadChatUsedFile[] {
  return contexts.map((context) => ({
    id: context.file.id,
    name: context.file.original_name,
    path: context.file.stored_path,
    summary:
      context.file.summary_text ??
      `검색된 ${context.rows.length}행을 기준으로 답변함`,
    rowCount: context.rows.length
  }));
}

export type {
  LiveSuggestionItem,
  MemoryRuleRecord,
  RecommendationMode,
  RecommendationSuggestion,
  SearchContext,
  UploadedFileRecord,
  UploadedRowRecord
};
