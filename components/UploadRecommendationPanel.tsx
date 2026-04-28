"use client";

import { useEffect, useMemo, useState } from "react";
import type { StoredUploadFile, UploadChatUsedFile } from "@/lib/types";

type RecommendationSuggestion = {
  customer: string | null;
  site: string | null;
  process: string | null;
  item_code: string | null;
  item_name: string | null;
  width: number | null;
  height: number | null;
  quantity: number | null;
  line: string | null;
  memo: string | null;
};

type UploadRecommendationPanelProps = {
  mode: "basic" | "quick";
  title: string;
  currentInput: string;
  applyLabel: string;
  onApply: (suggestion: RecommendationSuggestion) => void;
};

type StoredFilesResponse = {
  bucket: string;
  files: StoredUploadFile[];
};

type RecommendationResponse = {
  summary: string;
  suggestion: RecommendationSuggestion;
  usedFiles: UploadChatUsedFile[];
  error?: string;
};

async function requestJson<T>(url: string, options?: RequestInit) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {})
    }
  });

  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "요청 처리 중 오류가 발생했습니다.");
  }

  return payload;
}

function stringifySuggestion(suggestion: RecommendationSuggestion) {
  const parts = [
    suggestion.customer ? `거래처 ${suggestion.customer}` : null,
    suggestion.site ? `현장 ${suggestion.site}` : null,
    suggestion.process ? `공정 ${suggestion.process}` : null,
    suggestion.item_name ? `품명 ${suggestion.item_name}` : null,
    suggestion.width || suggestion.height ? `규격 ${suggestion.width ?? "?"}x${suggestion.height ?? "?"}` : null,
    suggestion.quantity ? `수량 ${suggestion.quantity}` : null,
    suggestion.line ? `라인 ${suggestion.line}` : null
  ].filter(Boolean);

  return parts.length ? parts.join(" / ") : "추천된 값이 아직 없습니다.";
}

export function UploadRecommendationPanel({
  mode,
  title,
  currentInput,
  applyLabel,
  onApply
}: UploadRecommendationPanelProps) {
  const [storedFiles, setStoredFiles] = useState<StoredUploadFile[]>([]);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(true);
  const [recommending, setRecommending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RecommendationResponse | null>(null);

  useEffect(() => {
    const loadFiles = async () => {
      setLoading(true);
      try {
        const response = await requestJson<StoredFilesResponse>("/api/upload/files", { method: "GET" });
        const files = response.files ?? [];
        setStoredFiles(files);
        setSelectedPaths(files.slice(0, 3).map((file) => file.path));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "업로드 파일 목록을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    void loadFiles();
  }, []);

  const selectedNames = useMemo(
    () => storedFiles.filter((file) => selectedPaths.includes(file.path)).map((file) => file.name),
    [selectedPaths, storedFiles]
  );

  const requestRecommendation = async () => {
    if (!selectedPaths.length) {
      setError("추천에 참고할 업로드 파일을 1개 이상 선택해 주세요.");
      return;
    }

    setRecommending(true);
    setError(null);

    try {
      const response = await requestJson<RecommendationResponse>("/api/ai/order-recommend", {
        method: "POST",
        body: JSON.stringify({
          mode,
          currentInput,
          question,
          filePaths: selectedPaths
        })
      });
      setResult(response);
    } catch (recommendError) {
      setError(recommendError instanceof Error ? recommendError.message : "추천을 불러오지 못했습니다.");
    } finally {
      setRecommending(false);
    }
  };

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">{title}</p>
          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
            업로드 파일과 저장된 업로드 데이터만 기준으로 추천합니다. 파일에 없는 값은 비워 두고, 확인되는 값만 제안합니다.
          </p>
        </div>
        <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800">
          Gemini 1.5 Flash
        </span>
      </div>

      <div className="mt-4 rounded-2xl border border-black/5 bg-[var(--secondary)]/60 p-4">
        <p className="text-xs font-semibold text-[var(--muted)]">현재 입력값</p>
        <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">{currentInput || "아직 입력된 값이 없습니다."}</p>
      </div>

      <div className="mt-4 rounded-2xl border border-black/5 bg-[var(--secondary)]/60 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-[var(--muted)]">업로드 데이터 자동 참고</p>
          <span className="text-xs text-[var(--muted)]">
            {selectedNames.length ? `${selectedNames.length}개 파일 자동 연결됨` : "연결된 파일 없음"}
          </span>
        </div>

        {loading ? (
          <p className="mt-2 text-sm text-[var(--muted)]">파일 목록을 불러오는 중입니다.</p>
        ) : !storedFiles.length ? (
          <p className="mt-2 text-sm text-[var(--muted)]">추천에 사용할 업로드 파일이 아직 없습니다.</p>
        ) : (
          <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">
            {selectedNames.join(", ")}
          </p>
        )}
      </div>

      <div className="mt-4 space-y-2">
        <label className="text-xs font-semibold text-[var(--muted)]">추가 요청</label>
        <textarea
          rows={3}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder={mode === "basic" ? "예: 거래처와 품명, 라인을 우선 추천해줘." : "예: 이 거래처/현장 기준으로 가장 가능성 높은 조합을 추천해줘."}
          className="w-full resize-none rounded-2xl border border-black/10 bg-[#f8fafb] px-4 py-3 text-sm outline-none focus:border-[var(--primary)]"
        />
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-900">
          {error}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void requestRecommendation()}
          disabled={recommending || loading || !storedFiles.length}
          className="rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-strong)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {recommending ? "추천 생성 중..." : "업로드 기반 추천 받기"}
        </button>

        {result ? (
          <button
            type="button"
            onClick={() => onApply(result.suggestion)}
            className="rounded-2xl border border-[var(--primary)]/20 bg-[var(--secondary)] px-4 py-3 text-sm font-semibold text-[var(--primary)]"
          >
            {applyLabel}
          </button>
        ) : null}
      </div>

      {result ? (
        <div className="mt-5 space-y-4 rounded-3xl border border-black/5 bg-[var(--secondary)]/50 p-4">
          <div>
            <p className="text-xs font-semibold text-[var(--muted)]">추천 요약</p>
            <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">{result.summary}</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-[var(--muted)]">추천 값</p>
            <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">{stringifySuggestion(result.suggestion)}</p>
          </div>

          {result.usedFiles?.length ? (
            <div>
              <p className="text-xs font-semibold text-[var(--muted)]">참고 파일</p>
              <div className="mt-2 space-y-1 text-xs leading-5 text-[var(--muted)]">
                {result.usedFiles.map((file) => (
                  <p key={file.path}>
                    {file.name}: {file.summary}{file.rowCount ? ` / 참고 행 ${file.rowCount}건` : ""}
                  </p>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
