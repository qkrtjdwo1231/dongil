import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { importWorkbookInBatches } from "@/lib/upload-processing";

export const runtime = "nodejs";

function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return createClient(url, anonKey);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
    }

    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase 환경변수가 설정되지 않았습니다." },
        { status: 503 }
      );
    }

    const buffer = await file.arrayBuffer();
    const result = await importWorkbookInBatches(buffer, async (rows) => {
      const response = await supabase.from("orders").insert(rows);

      if (response.error) {
        throw new Error(response.error.message);
      }
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "파일 저장 중 오류가 발생했습니다."
      },
      { status: 500 }
    );
  }
}
