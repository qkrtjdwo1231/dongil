"use client";

import { useEffect, useState } from "react";
import { AiMemoryRulesPanel } from "@/components/AiMemoryRulesPanel";
import { UploadChatPanel } from "@/components/UploadChatPanel";
import type { StoredUploadFile } from "@/lib/types";

type StoredFilesResponse = {
  bucket: string;
  files: StoredUploadFile[];
};

const executivePrompts = [
  "최근 업로드 기준으로 전체 요약, 핵심 변화, 라인별 특징, 품목/제품군 특징, 거래처/현장 특징, 데이터 품질 이슈, 액션 아이템을 정리해줘.",
  "1-LINE과 2-LINE의 차이를 제품군과 거래처 기준으로 비교해줘.",
  "상위 거래처 의존도와 품목 집중도를 대표 관점에서 설명해줘.",
  "현장 누락과 규격 이상값이 경영 판단에 어떤 영향을 주는지 설명해줘.",
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
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
          저장된 업로드 파일을 불러오는 중입니다.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-900">
          {error}
        </div>
      ) : null}

      <UploadChatPanel
        storedFiles={files}
        starterPrompts={executivePrompts}
        title="대표 AI 분석 도우미"
        description=""
        badgeLabel=""
      />
      <AiMemoryRulesPanel compact />
    </div>
  );
}
