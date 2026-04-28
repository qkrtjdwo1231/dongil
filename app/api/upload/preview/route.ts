import { NextResponse } from "next/server";
import { analyzeWorkbook } from "@/lib/upload-processing";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const summary = analyzeWorkbook(buffer, file.name);

    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "파일 분석 중 오류가 발생했습니다."
      },
      { status: 500 }
    );
  }
}
