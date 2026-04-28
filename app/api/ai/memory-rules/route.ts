import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type MemoryRulePayload = {
  id?: string;
  title?: string;
  category?: string;
  content?: string;
  priority?: number;
  is_active?: boolean;
};

function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return createClient(url, anonKey);
}

function normalizePayload(body: MemoryRulePayload) {
  return {
    title: String(body.title ?? "").trim(),
    category: String(body.category ?? "업무규칙").trim() || "업무규칙",
    content: String(body.content ?? "").trim(),
    priority: Number.isFinite(Number(body.priority)) ? Number(body.priority) : 100,
    is_active: body.is_active ?? true
  };
}

export async function GET() {
  try {
    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase 환경변수가 설정되지 않았습니다." }, { status: 503 });
    }

    const response = await supabase
      .from("ai_memory_rules")
      .select("id, created_at, title, category, content, priority, is_active")
      .order("priority", { ascending: true })
      .order("created_at", { ascending: false });

    if (response.error) {
      return NextResponse.json({ error: response.error.message }, { status: 400 });
    }

    return NextResponse.json({ rules: response.data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI 기억 규칙을 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase 환경변수가 설정되지 않았습니다." }, { status: 503 });
    }

    const body = (await request.json()) as MemoryRulePayload;
    const payload = normalizePayload(body);

    if (!payload.title || !payload.content) {
      return NextResponse.json({ error: "제목과 규칙 내용을 입력해 주세요." }, { status: 400 });
    }

    const response = await supabase
      .from("ai_memory_rules")
      .insert(payload)
      .select("id, created_at, title, category, content, priority, is_active")
      .single();

    if (response.error) {
      return NextResponse.json({ error: response.error.message }, { status: 400 });
    }

    return NextResponse.json({ rule: response.data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI 기억 규칙 저장에 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase 환경변수가 설정되지 않았습니다." }, { status: 503 });
    }

    const body = (await request.json()) as MemoryRulePayload;
    const id = String(body.id ?? "").trim();
    if (!id) {
      return NextResponse.json({ error: "수정할 규칙 ID가 필요합니다." }, { status: 400 });
    }

    const payload = normalizePayload(body);
    if (!payload.title || !payload.content) {
      return NextResponse.json({ error: "제목과 규칙 내용을 입력해 주세요." }, { status: 400 });
    }

    const response = await supabase
      .from("ai_memory_rules")
      .update(payload)
      .eq("id", id)
      .select("id, created_at, title, category, content, priority, is_active")
      .single();

    if (response.error) {
      return NextResponse.json({ error: response.error.message }, { status: 400 });
    }

    return NextResponse.json({ rule: response.data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI 기억 규칙 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase 환경변수가 설정되지 않았습니다." }, { status: 503 });
    }

    const body = (await request.json()) as MemoryRulePayload;
    const id = String(body.id ?? "").trim();
    if (!id) {
      return NextResponse.json({ error: "삭제할 규칙 ID가 필요합니다." }, { status: 400 });
    }

    const response = await supabase.from("ai_memory_rules").delete().eq("id", id);
    if (response.error) {
      return NextResponse.json({ error: response.error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI 기억 규칙 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
