"use client";

import { useEffect, useState } from "react";
import { SectionCard } from "@/components/SectionCard";

const STORAGE_KEY = "dongil-executive-ai-settings";
const DEFAULT_PROMPT = `당신은 동일유리 대표용 분석 도우미입니다.
업로드된 파일과 저장된 데이터만 근거로 답변하세요.
없는 데이터는 추측하지 말고 확인되지 않았다고 답변하세요.
생산 수량, 평수, 거래처 집중도, 라인별 추이, 전년 대비 해석을 우선 설명하세요.`;

export function ExecutiveSettingsPanel() {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      setPrompt(raw);
    }
  }, []);

  const handleSave = () => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, prompt);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  };

  const handleReset = () => {
    setPrompt(DEFAULT_PROMPT);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, DEFAULT_PROMPT);
    }
  };

  return (
    <SectionCard title="설정" description="AI 분석 동작 방식을 커스터마이징합니다.">
      <div className="space-y-4 rounded-2xl border border-black/5 bg-white p-5">
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">AI 시스템 프롬프트</p>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            AI가 질문을 해석하고 답변을 생성하는 방식을 정의합니다. 스키마와 답변 기준을 유지하면서 대표가 보고 싶은 해석 포인트를 조정할 수 있습니다.
          </p>
        </div>
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          rows={12}
          className="w-full rounded-2xl border border-black/10 bg-[#fbfcfd] px-4 py-3 text-sm leading-6 outline-none focus:border-[var(--primary)]"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={handleReset} className="rounded-2xl border border-black/10 px-4 py-2 text-sm font-medium">
            기본값으로 되돌리기
          </button>
          <button type="button" onClick={handleSave} className="rounded-2xl bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white">
            저장
          </button>
          {saved ? <span className="text-xs text-emerald-700">저장되었습니다.</span> : null}
        </div>
      </div>
    </SectionCard>
  );
}
