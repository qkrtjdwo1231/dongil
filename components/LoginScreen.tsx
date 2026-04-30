"use client";

import { useState } from "react";

export function LoginScreen() {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ id, password })
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "로그인에 실패했습니다.");
      }

      window.location.reload();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "로그인에 실패했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f7fb] px-6 py-12">
      <div className="w-full max-w-md rounded-[2rem] border border-black/5 bg-white p-8 shadow-[0_24px_80px_rgba(24,39,56,0.12)]">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--primary)]">
            Dongil Glass
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[var(--foreground)]">
            동일유리 작업관리
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            대표와 팀장이 생산실적 데이터를 분석하기 위한 내부 접속 화면입니다.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-[var(--foreground)]">아이디</span>
            <input
              value={id}
              onChange={(event) => setId(event.target.value)}
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-[var(--primary)]"
              placeholder="아이디를 입력해 주세요"
              autoComplete="username"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-[var(--foreground)]">비밀번호</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-[var(--primary)]"
              placeholder="비밀번호를 입력해 주세요"
              autoComplete="current-password"
            />
          </label>

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-[var(--foreground)] px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>
      </div>
    </main>
  );
}
