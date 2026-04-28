import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { gemini } from "@/lib/gemini";
import {
  buildPromptFromSearchContexts,
  buildSearchContext,
  buildUsedFileSummaries,
  type MemoryRuleRecord,
  type UploadedFileRecord,
  type UploadedRowRecord
} from "@/lib/upload-chat";

export const runtime = "nodejs";

type UploadChatRequest = {
  question?: string;
  filePaths?: string[];
};

function createSupabaseServerClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return createClient(url, anonKey);
}

function stripMarkdown(value: string) {
  return value
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
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
  question: string
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
      return buildSearchContext(file, fileRows, question);
    })
    .filter((context) => context.rows.length);
}

export async function POST(request: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY가 설정되지 않았습니다." }, { status: 503 });
    }

    const body = (await request.json()) as UploadChatRequest;
    const question = String(body.question ?? "").trim();
    const filePaths = Array.isArray(body.filePaths)
      ? body.filePaths
          .map((value) => String(value ?? "").trim())
          .filter(Boolean)
          .slice(0, 5)
      : [];

    if (!question) {
      return NextResponse.json({ error: "질문 내용을 입력해 주세요." }, { status: 400 });
    }

    if (!filePaths.length) {
      return NextResponse.json({ error: "참고할 업로드 파일을 선택해 주세요." }, { status: 400 });
    }

    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase 환경변수가 설정되지 않았습니다." }, { status: 503 });
    }

    const [contexts, memoryRules] = await Promise.all([
      loadFileContexts(supabase, filePaths, question),
      loadMemoryRules(supabase)
    ]);

    if (!contexts.length) {
      return NextResponse.json({ error: "선택한 파일에서 참고할 업로드 데이터를 찾지 못했습니다." }, { status: 400 });
    }

    const prompt = buildPromptFromSearchContexts(question, contexts, memoryRules);
    const aiResponse = await gemini.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt
    });

    const answer = stripMarkdown(aiResponse.text ?? "답변을 생성하지 못했습니다.");
    const usedFiles = buildUsedFileSummaries(contexts);
    const usedFileIds = usedFiles.map((file) => file.id).filter(Boolean);
    const usedRowIds = contexts.flatMap((context) => context.rows.map((row) => row.id));

    await supabase.from("ai_conversations").insert({
      question,
      answer,
      used_file_ids: usedFileIds,
      used_row_ids: usedRowIds
    });

    return NextResponse.json({
      answer,
      usedFiles
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "업로드 파일 챗봇 처리 중 오류가 발생했습니다."
      },
      { status: 500 }
    );
  }
}
