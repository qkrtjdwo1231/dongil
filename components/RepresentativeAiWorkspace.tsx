"use client";

import { useEffect, useState } from "react";
import { AiMemoryRulesPanel } from "@/components/AiMemoryRulesPanel";
import { SectionCard } from "@/components/SectionCard";
import { UploadChatPanel } from "@/components/UploadChatPanel";
import type { StoredUploadFile } from "@/lib/types";

type StoredFilesResponse = {
  bucket: string;
  files: StoredUploadFile[];
};

const executivePrompts = [
  "최근 업로드 기준으로 대표 리포트 형식의 전체 요약, 핵심 변화, 라인별 특징, 품목/제품군 특징, 거래처/현장 특징, 데이터 품질 이슈, 액션 아이템을 정리해줘.",
  "1-LINE과 2-LINE의 차이를 제품군과 거래처 기준으로 비교해줘.",
  "상위 거래처 의존도와 품목 집중도를 대표 관점에서 설명해줘.",
  "현장 누락, PID 중복, 규격 이상값이 경영 판단에 어떤 영향을 주는지 설명해줘.",
  "이 데이터로 가능한 해석과 추가 데이터가 있어야 가능한 해석을 구분해서 정리해줘."
];

export function RepresentativeAiWorkspace() {
  const [files, setFiles] = useState<StoredUploadFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadFiles() {
      try {
        setLoading(true);
        const response = await fetch("/api/upload/files");
        const payload = (await response.json()) as StoredFilesResponse & { error?: string };
        if (!response.ok) {
          throw new Error(payload.error ?? "저장된 업로드 파일을 불러오지 못했습니다.");
        }
        setFiles(payload.files ?? []);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "파일 목록을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    }

    void loadFiles();
  }, []);

  return (
    <div className="space-y-6">
      <SectionCard title="AI 분석" description="업로드한 파일과 저장된 행 데이터만 기준으로 대표용 질문과 요약을 생성합니다.">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
            저장된 업로드 파일을 불러오는 중입니다.
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-900">
            {error}
          </div>
        ) : (
          <div className="rounded-2xl border border-black/5 bg-white p-5">
            <p className="text-sm leading-6 text-[var(--muted)]">
              대표 화면에서는 업로드된 생산실적 파일을 기준으로 거래처 집중도, 기간별 흐름, 목표 달성 상태, 이상 항목을 AI에게 바로 질의할 수 있습니다.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl bg-[var(--secondary)] px-4 py-3 text-sm leading-6 text-[var(--foreground)]">
                <strong>가능한 해석</strong>
                <p className="mt-1 text-[var(--muted)]">생산 부담, 라인 부하, 제품 믹스, 거래처 의존도, 데이터 품질, 이상징후</p>
              </div>
              <div className="rounded-2xl bg-[var(--secondary)] px-4 py-3 text-sm leading-6 text-[var(--foreground)]">
                <strong>추가 데이터 필요</strong>
                <p className="mt-1 text-[var(--muted)]">수익성, 원가, 마진, 영업이익, 판매단가 기반 해석</p>
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      <UploadChatPanel
        storedFiles={files}
        starterPrompts={executivePrompts}
        title="대표 AI 분석 도우미"
        description="업로드한 생산실적 파일과 저장된 행 데이터만 기준으로 대표 리포트, 라인 비교, 고객 집중도, 데이터 품질, 액션 아이템을 해석합니다."
        badgeLabel="대표 리포트 / 근거 기반 분석"
      />
      <AiMemoryRulesPanel compact />
    </div>
  );
}
