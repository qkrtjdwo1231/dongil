import { NextResponse } from "next/server";
import { gemini } from "@/lib/gemini";

export async function GET() {
  try {
    const response = await gemini.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "청주 유리 작업관리 앱 테스트라고 한 줄로 말해줘.",
    });

    return NextResponse.json({
      ok: true,
      text: response.text,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "Gemini 호출 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
