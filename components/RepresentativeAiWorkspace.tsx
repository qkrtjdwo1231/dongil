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
          </div>
        )}
      </SectionCard>

      <UploadChatPanel storedFiles={files} />
      <AiMemoryRulesPanel compact />
    </div>
  );
}
