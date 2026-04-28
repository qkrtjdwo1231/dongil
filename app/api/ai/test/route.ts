import { NextResponse } from "next/server";
import { generateGeminiText } from "@/lib/gemini";

export async function GET() {
  try {
    const response = await generateGeminiText(
      "청주 유리 작업관리 앱 테스트라고 한 줄로 말해줘."
    );

    return NextResponse.json({
      ok: true,
      text: response.text,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Gemini 호출 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
