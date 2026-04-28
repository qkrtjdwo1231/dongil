import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { generateGeminiText } from "@/lib/gemini";
import {
  buildLiveSuggestionPrompt,
  buildSearchContext,
  buildUsedFileSummaries,
  type LiveSuggestionItem,
  type MemoryRuleRecord,
  type RecommendationSuggestion,
  type UploadedFileRecord,
  type UploadedRowRecord
} from "@/lib/upload-chat";

export const runtime = "nodejs";

type LiveOrderSuggestRequest = {
  input?: string;
};

type LiveOrderSuggestResponse = {
  suggestions: LiveSuggestionItem[];
  usedFiles: ReturnType<typeof buildUsedFileSummaries>;
};

function createSupabaseServerClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return createClient(url, anonKey);
}

function sanitizeText(value: string) {
  return value.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
}

function normalizeSuggestion(value: unknown): RecommendationSuggestion {
  const source = (value ?? {}) as Record<string, unknown>;
  return {
    customer: typeof source["customer"] === "string" ? (source["customer"] as string) : null,
    site: typeof source["site"] === "string" ? (source["site"] as string) : null,
    process: typeof source["process"] === "string" ? (source["process"] as string) : null,
    item_code: typeof source["item_code"] === "string" ? (source["item_code"] as string) : null,
    item_name: typeof source["item_name"] === "string" ? (source["item_name"] as string) : null,
    width: typeof source["width"] === "number" ? (source["width"] as number) : null,
    height: typeof source["height"] === "number" ? (source["height"] as number) : null,
    quantity: typeof source["quantity"] === "number" ? (source["quantity"] as number) : null,
    line: typeof source["line"] === "string" ? (source["line"] as string) : null,
    memo: typeof source["memo"] === "string" ? (source["memo"] as string) : null
  };
}

function parseLiveSuggestions(rawText: string): LiveSuggestionItem[] {
  const cleaned = sanitizeText(rawText);
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < 0 || end <= start) {
    throw new Error("실시간 추천 결과를 해석하지 못했습니다.");
  }

  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as {
    suggestions?: Array<Record<string, unknown>>;
  };

  return (parsed.suggestions ?? [])
    .slice(0, 4)
    .map((item) => ({
      label:
        typeof item["label"] === "string" && item["label"].trim()
          ? (item["label"] as string).trim()
          : "추천 후보",
      reason:
        typeof item["reason"] === "string" && item["reason"].trim()
          ? (item["reason"] as string).trim()
          : "업로드 데이터 기준 관련도가 높습니다.",
      suggestion: normalizeSuggestion(item["suggestion"])
    }))
    .filter(
      (item) =>
        item.suggestion.item_name || item.suggestion.customer || item.suggestion.site || item.suggestion.line
    );
}

async function loadMemoryRules(supabase: SupabaseClient) {
  const response = await supabase
    .from("ai_memory_rules")
    .select("title, category, content, priority")
    .eq("is_active", true)
    .order("priority", { ascending: true })
    .limit(20);

  if (response.error) {
    throw new Error(response.error.message);
  }

  return (response.data ?? []) as MemoryRuleRecord[];
}

async function loadLatestFilePaths(supabase: SupabaseClient) {
  const response = await supabase
    .from("uploaded_files")
    .select("stored_path")
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(3);

  if (response.error) {
    throw new Error(response.error.message);
  }

  return (response.data ?? []).map((row) => String(row.stored_path ?? "")).filter(Boolean);
}

async function loadFileContexts(
  supabase: SupabaseClient,
  filePaths: string[],
  searchText: string
) {
  const fileResponse = await supabase
    .from("uploaded_files")
    .select("id, original_name, stored_path, summary_text")
    .in("stored_path", filePaths);

  if (fileResponse.error) {
    throw new Error(fileResponse.error.message);
  }

  const files = (fileResponse.data ?? []) as UploadedFileRecord[];
  if (!files.length) {
    return [];
  }

  const fileIds = files.map((file) => file.id);
  const rowResponse = await supabase
    .from("uploaded_rows")
    .select(
      "id, file_id, row_index, pid, customer, site, process, item_code, item_name, width, height, quantity, line, request_no, registrant, status, memo, validation_notes, normalized_text"
    )
    .in("file_id", fileIds)
    .order("row_index", { ascending: true })
    .limit(2000);

  if (rowResponse.error) {
    throw new Error(rowResponse.error.message);
  }

  const rows = (rowResponse.data ?? []) as Array<UploadedRowRecord & { file_id: string }>;

  return files
    .map((file) => {
      const fileRows = rows.filter((row) => row.file_id === file.id);
      return buildSearchContext(file, fileRows, searchText);
    })
    .filter((context) => context.rows.length);
}

export async function POST(request: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY가 설정되지 않았습니다." }, { status: 503 });
    }

    const body = (await request.json()) as LiveOrderSuggestRequest;
    const input = String(body.input ?? "").trim();
    if (input.length < 2) {
      return NextResponse.json({ suggestions: [], usedFiles: [] });
    }

    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase 환경변수가 설정되지 않았습니다." }, { status: 503 });
    }

    const [filePaths, memoryRules] = await Promise.all([
      loadLatestFilePaths(supabase),
      loadMemoryRules(supabase)
    ]);

    if (!filePaths.length) {
      return NextResponse.json({ suggestions: [], usedFiles: [] });
    }

    const contexts = await loadFileContexts(supabase, filePaths, input);
    if (!contexts.length) {
      return NextResponse.json({ suggestions: [], usedFiles: [] });
    }

    const prompt = buildLiveSuggestionPrompt(input, contexts, memoryRules);
    const aiResponse = await generateGeminiText(prompt);
    const suggestions = parseLiveSuggestions(aiResponse.text || "");
    const usedFiles = buildUsedFileSummaries(contexts);

    return NextResponse.json({ suggestions, usedFiles });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "실시간 문장 추천 생성 중 오류가 발생했습니다."
      },
      { status: 500 }
    );
  }
}
