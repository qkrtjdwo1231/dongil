import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { gemini } from "@/lib/gemini";
import {
  buildRecommendationPrompt,
  buildSearchContext,
  buildUsedFileSummaries,
  type MemoryRuleRecord,
  type RecommendationMode,
  type RecommendationSuggestion,
  type UploadedFileRecord,
  type UploadedRowRecord
} from "@/lib/upload-chat";

export const runtime = "nodejs";

type OrderRecommendRequest = {
  mode?: RecommendationMode;
  question?: string;
  filePaths?: string[];
  currentInput?: string;
};

type OrderRecommendResponse = {
  summary: string;
  suggestion: RecommendationSuggestion;
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

function parseRecommendationPayload(rawText: string): Pick<OrderRecommendResponse, "summary" | "suggestion"> {
  const cleaned = sanitizeText(rawText);
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < 0 || end <= start) {
    throw new Error("AI 추천 결과를 해석하지 못했습니다.");
  }

  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as Partial<OrderRecommendResponse>;
  const suggestion = (parsed.suggestion ?? {}) as Record<string, unknown>;

  return {
    summary: typeof parsed.summary === "string" && parsed.summary.trim() ? parsed.summary.trim() : "업로드 데이터 기준 추천 결과입니다.",
    suggestion: {
      customer: typeof suggestion["customer"] === "string" ? (suggestion["customer"] as string) : null,
      site: typeof suggestion["site"] === "string" ? (suggestion["site"] as string) : null,
      process: typeof suggestion["process"] === "string" ? (suggestion["process"] as string) : null,
      item_code: typeof suggestion["item_code"] === "string" ? (suggestion["item_code"] as string) : null,
      item_name: typeof suggestion["item_name"] === "string" ? (suggestion["item_name"] as string) : null,
      width: typeof suggestion["width"] === "number" ? (suggestion["width"] as number) : null,
      height: typeof suggestion["height"] === "number" ? (suggestion["height"] as number) : null,
      quantity: typeof suggestion["quantity"] === "number" ? (suggestion["quantity"] as number) : null,
      line: typeof suggestion["line"] === "string" ? (suggestion["line"] as string) : null,
      memo: typeof suggestion["memo"] === "string" ? (suggestion["memo"] as string) : null
    }
  };
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

    const body = (await request.json()) as OrderRecommendRequest;
    const mode: RecommendationMode = body.mode === "quick" ? "quick" : "basic";
    const question = String(body.question ?? "").trim();
    const currentInput = String(body.currentInput ?? "").trim();
    const filePaths = Array.isArray(body.filePaths)
      ? body.filePaths.map((value) => String(value ?? "").trim()).filter(Boolean).slice(0, 5)
      : [];

    if (!filePaths.length) {
      return NextResponse.json({ error: "추천에 참고할 업로드 파일을 선택해 주세요." }, { status: 400 });
    }

    const searchText = [currentInput, question].filter(Boolean).join(" ").trim() || "업로드 추천";
    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase 환경변수가 설정되지 않았습니다." }, { status: 503 });
    }

    const [contexts, memoryRules] = await Promise.all([
      loadFileContexts(supabase, filePaths, searchText),
      loadMemoryRules(supabase)
    ]);

    if (!contexts.length) {
      return NextResponse.json({ error: "선택한 파일에서 추천에 참고할 업로드 데이터를 찾지 못했습니다." }, { status: 400 });
    }

    const prompt = buildRecommendationPrompt(mode, currentInput, question, contexts, memoryRules);
    const aiResponse = await gemini.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt
    });

    const recommendation = parseRecommendationPayload(aiResponse.text ?? "");
    const usedFiles = buildUsedFileSummaries(contexts);

    return NextResponse.json({
      ...recommendation,
      usedFiles
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "업로드 기반 추천 생성 중 오류가 발생했습니다."
      },
      { status: 500 }
    );
  }
}

