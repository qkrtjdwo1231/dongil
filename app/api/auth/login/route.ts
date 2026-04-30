import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, isValidLogin } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { id?: string; password?: string };
    const id = String(body.id ?? "").trim();
    const password = String(body.password ?? "");

    if (!id || !password) {
      return NextResponse.json(
        { error: "아이디와 비밀번호를 입력해 주세요." },
        { status: 400 }
      );
    }

    if (!isValidLogin(id, password)) {
      return NextResponse.json(
        { error: "아이디 또는 비밀번호가 올바르지 않습니다." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(AUTH_COOKIE_NAME, "authenticated", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "로그인 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
