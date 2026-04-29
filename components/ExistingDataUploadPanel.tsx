"use client";

import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "@/components/SectionCard";
import { AiMemoryRulesPanel } from "@/components/AiMemoryRulesPanel";
import { UploadChatPanel } from "@/components/UploadChatPanel";
import type {
  StoredUploadFile,
  UploadAnalysisGroup,
  UploadImportResult,
  UploadPreviewSummary
} from "@/lib/types";

const UPLOAD_HISTORY_STORAGE_KEY = "existing-data-upload-history";

type ExistingDataUploadPanelProps = {
  onImportComplete: (result: UploadImportResult) => Promise<void> | void;
};

type StoredFilesResponse = {
  bucket: string;
  files: StoredUploadFile[];
};

async function postUpload<T>(url: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(url, {
    method: "POST",
    body: formData
  });

  const contentType = response.headers.get("content-type") ?? "";
  const rawText = await response.text();
  const payload = contentType.includes("application/json")
    ? ((rawText ? JSON.parse(rawText) : {}) as T & { error?: string })
    : ({ error: rawText || "업로드 요청에 실패했습니다." } as T & { error?: string });

  if (!response.ok) {
    throw new Error(payload.error ?? "업로드 요청에 실패했습니다.");
  }

  return payload as T;
}

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

function formatBytes(value: number | null) {
  if (!value || value < 0) {
    return "-";
  }
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDateRange(start: string | null | undefined, end: string | null | undefined) {
  if (!start || !end) {
    return "기간 정보 없음";
  }

  return `${start} ~ ${end}`;
}

function renderTopGroup(groups: UploadAnalysisGroup[]) {
  if (!groups.length) {
    return "-";
  }

  const top = groups[0];
  return `${top.label} (${top.quantity.toLocaleString()})`;
}

function buildFileStatus(summary: UploadPreviewSummary | null, loading: boolean, saving: boolean) {
  if (saving) {
    return { label: "등록 중", tone: "amber" as const };
  }
  if (loading) {
    return { label: "분석 중", tone: "sky" as const };
  }
  if (summary) {
    return { label: "분석 완료", tone: "emerald" as const };
  }
  return { label: "대기", tone: "slate" as const };
}

function hasPidRows(summary: UploadPreviewSummary | null) {
  return Boolean(summary?.previewRows.some((row) => Boolean(row.pid)));
}

function detectColumnGuide(summary: UploadPreviewSummary | null) {
  return [
    { label: "PID", active: Boolean(summary?.previewRows.some((row) => row.pid)) },
    { label: "거래처", active: Boolean(summary?.previewRows.some((row) => row.draft.customer)) },
    { label: "품명", active: Boolean(summary?.previewRows.some((row) => row.draft.item_name)) },
    { label: "수량", active: Boolean(summary?.previewRows.some((row) => row.draft.quantity)) }
  ];
}

export function ExistingDataUploadPanel({ onImportComplete }: ExistingDataUploadPanelProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [uploadedFileNames, setUploadedFileNames] = useState<string[]>([]);
  const [summary, setSummary] = useState<UploadPreviewSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [storedFiles, setStoredFiles] = useState<StoredUploadFile[]>([]);
  const [storedBucket, setStoredBucket] = useState<string | null>(null);
  const [loadingStoredFiles, setLoadingStoredFiles] = useState(false);
  const [updatingPath, setUpdatingPath] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const saved = window.localStorage.getItem(UPLOAD_HISTORY_STORAGE_KEY);
      if (!saved) {
        return;
      }

      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) {
        return;
      }

      const normalized = parsed
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        .slice(0, 20);

      if (normalized.length) {
        setUploadedFileNames(normalized);
        setSelectedFileName((current) => current ?? normalized[0]);
      }
    } catch {
      // Ignore invalid localStorage payloads.
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(
        UPLOAD_HISTORY_STORAGE_KEY,
        JSON.stringify(uploadedFileNames.slice(0, 20))
      );
    } catch {
      // Ignore storage write failures.
    }
  }, [uploadedFileNames]);

  const loadStoredFiles = async () => {
    setLoadingStoredFiles(true);
    try {
      const response = await requestJson<StoredFilesResponse>("/api/upload/files", {
        method: "GET"
      });
      setStoredBucket(response.bucket);
      setStoredFiles(response.files ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "저장된 파일 목록을 불러오지 못했습니다."
      );
    } finally {
      setLoadingStoredFiles(false);
    }
  };

  useEffect(() => {
    void loadStoredFiles();
  }, []);

  const handleFileSelect = async (file: File | null) => {
    if (!file) {
      return;
    }

    setSelectedFile(file);
    setSelectedFileName(file.name);
    setSummary(null);
    setLoading(true);
    setSaving(false);
    setError(null);
    setMessage(null);

    try {
      const preview = await postUpload<UploadPreviewSummary>("/api/upload/preview", file);
      setSummary(preview);
      setUploadedFileNames((current) => [file.name, ...current.filter((name) => name !== file.name)]);
      setMessage(
        `파일 분석을 완료했습니다. ${formatDateRange(
          preview.analysis.periodStart,
          preview.analysis.periodEnd
        )} 기준 ${preview.totalRows.toLocaleString()}행, 총 수량 ${preview.analysis.totalQuantity.toLocaleString()}, 총 평수 ${preview.analysis.totalArea.toFixed(1)}를 확인했습니다.`
      );
    } catch (uploadError) {
      setSelectedFile(null);
      setSummary(null);
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "파일을 분석하지 못했습니다. 파일 형식과 내용을 다시 확인해 주세요."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      setError("먼저 업로드할 파일을 선택해 주세요.");
      return;
    }

    if (!summary?.totalRows) {
      setError("먼저 분석할 행 데이터가 있는 파일을 선택해 주세요.");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage("선택한 파일을 분석용 데이터와 원본 행 기준으로 저장하는 중입니다.");

    try {
      const result = await postUpload<UploadImportResult>("/api/upload/import", selectedFile);
      await onImportComplete(result);
      const storageNote = result.storedFilePath
        ? ` 저장 위치: ${result.storedFileBucket}/${result.storedFilePath}`
        : "";
      setMessage(
        `분석 행 ${result.insertedUploadRows?.toLocaleString() ?? 0}건 저장을 완료했습니다. 주문 테이블 반영 ${result.insertedRows.toLocaleString()}건.${storageNote}`
      );
      await loadStoredFiles();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "파일 저장에 실패했습니다. 잠시 후 다시 시도해 주세요."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStoredFile = async (path: string) => {
    if (!window.confirm("이 업로드 파일을 삭제하시겠습니까?")) {
      return;
    }

    setUpdatingPath(path);
    setError(null);
    try {
      await requestJson("/api/upload/files", {
        method: "DELETE",
        body: JSON.stringify({ path })
      });
      setMessage("업로드 파일을 삭제했습니다.");
      await loadStoredFiles();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "파일 삭제에 실패했습니다.");
    } finally {
      setUpdatingPath(null);
    }
  };

  const handleRenameStoredFile = async (path: string, currentName: string) => {
    const nextName = window.prompt("새 파일명을 입력해 주세요.", currentName);
    if (!nextName || nextName.trim() === currentName.trim()) {
      return;
    }

    setUpdatingPath(path);
    setError(null);
    try {
      await requestJson("/api/upload/files", {
        method: "PATCH",
        body: JSON.stringify({ path, nextName })
      });
      setMessage("파일명을 수정했습니다.");
      await loadStoredFiles();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "파일명 수정에 실패했습니다.");
    } finally {
      setUpdatingPath(null);
    }
  };

  const previewRows = summary?.previewRows ?? [];
  const fileStatus = buildFileStatus(summary, loading, saving);
  const columnGuide = detectColumnGuide(summary);
  const selectedStoredFile = useMemo(
    () => storedFiles.find((file) => file.name === selectedFileName) ?? null,
    [selectedFileName, storedFiles]
  );

  return (
    <SectionCard
      title="파일 업로드 / AI 도우미"
      description="업로드, 검토, 저장, AI 질의를 한 화면에서 이어서 처리할 수 있는 작업공간입니다. AI 답변과 추천은 선택한 업로드 파일과 저장된 업로드 데이터만 기준으로 생성됩니다."
    >
      <div className="space-y-6">
        <div className="rounded-[2rem] border border-black/5 bg-white px-5 py-5 shadow-[0_18px_60px_rgba(24,39,56,0.08)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    fileStatus.tone === "emerald"
                      ? "bg-emerald-100 text-emerald-800"
                      : fileStatus.tone === "amber"
                        ? "bg-amber-100 text-amber-800"
                        : fileStatus.tone === "sky"
                          ? "bg-sky-100 text-sky-800"
                          : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {fileStatus.label}
                </span>
                <span className="text-xs text-[var(--muted)]">
                  대용량 파일도 전체를 한 번에 표시하지 않고, 상위 미리보기와 저장 데이터 기준으로 처리합니다.
                </span>
              </div>

              <div>
                <h3 className="text-lg font-semibold tracking-[-0.02em] text-[var(--foreground)]">
                  업로드 파일 작업공간
                </h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  엑셀 파일을 올리면 먼저 구조를 분석하고, 핵심 컬럼과 PID 포함 여부를 확인한 뒤 저장과 AI 질의를 이어서 진행합니다.
                </p>
              </div>
            </div>

            <label className="inline-flex shrink-0 items-center rounded-2xl bg-[var(--foreground)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90">
              파일 선택
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(event) => void handleFileSelect(event.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-2xl border border-black/5 bg-[var(--secondary)]/60 p-4">
              <p className="text-sm font-semibold text-[var(--foreground)]">현재 선택 파일</p>
              <div className="mt-3 space-y-2 text-sm text-[var(--muted)]">
                <div className="flex items-center justify-between gap-4">
                  <span>파일명</span>
                  <strong className="truncate text-[var(--foreground)]">{selectedFileName ?? "선택 전"}</strong>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>저장 파일 연결</span>
                  <strong className="text-[var(--foreground)]">{selectedStoredFile ? "연결됨" : "미연결"}</strong>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>PID 포함 여부</span>
                  <strong className={hasPidRows(summary) ? "text-emerald-700" : "text-amber-700"}>
                    {hasPidRows(summary) ? "확인됨" : "미확인"}
                  </strong>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-black/5 bg-[var(--secondary)]/60 p-4">
              <p className="text-sm font-semibold text-[var(--foreground)]">핵심 컬럼 감지</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {columnGuide.map((item) => (
                  <span
                    key={item.label}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      item.active
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {item.label} {item.active ? "감지" : "검토 필요"}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-black/5 pt-4">
            <span className="text-xs font-semibold text-[var(--muted)]">최근 업로드 파일</span>
            {uploadedFileNames.length ? (
              uploadedFileNames.map((fileName) => {
                const active = fileName === selectedFileName;

                return (
                  <span
                    key={fileName}
                    title={fileName}
                    className={`max-w-full truncate rounded-full px-3 py-1 text-xs font-medium ${
                      active
                        ? "bg-[var(--primary)] text-white"
                        : "bg-white text-[var(--foreground)] ring-1 ring-black/5"
                    }`}
                  >
                    {fileName}
                  </span>
                );
              })
            ) : (
              <span className="text-xs text-[var(--muted)]">아직 업로드한 파일이 없습니다.</span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
            서버에서 파일 구조를 분석하는 중입니다.
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-900">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900">
            {message}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]">
          <div className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-2xl border border-black/5 bg-white p-5">
                <p className="text-sm font-semibold text-[var(--foreground)]">분석 요약</p>
                <div className="mt-4 space-y-3 text-sm text-[var(--muted)]">
                  <div className="flex items-center justify-between">
                    <span>분석 기간</span>
                    <strong className="text-[var(--foreground)]">
                      {summary
                        ? formatDateRange(summary.analysis.periodStart, summary.analysis.periodEnd)
                        : "기간 정보 없음"}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>총 행</span>
                    <strong className="text-[var(--foreground)]">
                      {summary ? summary.totalRows.toLocaleString() : 0}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>총 수량</span>
                    <strong className="text-emerald-700">
                      {summary ? summary.analysis.totalQuantity.toLocaleString() : 0}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>총 평수</span>
                    <strong className="text-[var(--foreground)]">
                      {summary ? summary.analysis.totalArea.toFixed(1) : "0.0"}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>거래처 / 품명</span>
                    <strong className="text-[var(--foreground)]">
                      {summary
                        ? `${summary.analysis.uniqueCustomers.toLocaleString()} / ${summary.analysis.uniqueItems.toLocaleString()}`
                        : "0 / 0"}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>검토 필요</span>
                    <strong className="text-amber-700">
                      {summary ? summary.invalidRows.toLocaleString() : 0}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>PID 누락 / 규격 누락</span>
                    <strong className={hasPidRows(summary) ? "text-amber-700" : "text-[var(--foreground)]"}>
                      {summary
                        ? `${summary.analysis.rowsMissingPid.toLocaleString()} / ${summary.analysis.rowsMissingDimensions.toLocaleString()}`
                        : "0 / 0"}
                    </strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleImport}
                  disabled={saving || !summary?.totalRows}
                  className="mt-6 w-full rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "분석 데이터 저장 중..."
                    : `분석 행 ${summary?.totalRows.toLocaleString() ?? 0}건 저장`}
                </button>
              </div>

              <div className="rounded-2xl border border-black/5 bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[var(--foreground)]">미리보기</p>
                  <span className="text-xs text-[var(--muted)]">상위 12행 표시</span>
                </div>

                {!previewRows.length ? (
                  <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
                    파일을 선택하면 분석 결과와 함께 상위 행 데이터가 표시됩니다.
                  </p>
                ) : (
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-black/5 text-xs uppercase tracking-[0.08em] text-[var(--muted)]">
                          <th className="px-3 py-3">행</th>
                          <th className="px-3 py-3">PID</th>
                          <th className="px-3 py-3">거래처</th>
                          <th className="px-3 py-3">품명</th>
                          <th className="px-3 py-3">수량</th>
                          <th className="px-3 py-3">상태</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((row) => (
                          <tr key={row.rowIndex} className="border-b border-black/5 last:border-b-0">
                            <td className="px-3 py-3 text-[var(--muted)]">{row.rowIndex}</td>
                            <td className="px-3 py-3 text-[var(--foreground)]">{row.pid || "-"}</td>
                            <td className="px-3 py-3 font-medium text-[var(--foreground)]">
                              {row.draft.customer || "-"}
                            </td>
                            <td className="px-3 py-3 text-[var(--foreground)]">{row.draft.item_name || "-"}</td>
                            <td className="px-3 py-3 text-[var(--foreground)]">{row.draft.quantity || "-"}</td>
                            <td className="px-3 py-3">
                              {row.valid ? (
                                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                  핵심 필드 충족
                                </span>
                              ) : (
                                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                                  {row.reason}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-black/5 bg-white p-5">
                <p className="text-sm font-semibold text-[var(--foreground)]">상위 분포</p>
                <div className="mt-4 space-y-3 text-sm text-[var(--muted)]">
                  <div className="flex items-center justify-between gap-3">
                    <span>주요 거래처</span>
                    <strong className="text-right text-[var(--foreground)]">
                      {summary ? renderTopGroup(summary.analysis.topCustomers) : "-"}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>주요 품목</span>
                    <strong className="text-right text-[var(--foreground)]">
                      {summary ? renderTopGroup(summary.analysis.topItems) : "-"}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>주요 제품군</span>
                    <strong className="text-right text-[var(--foreground)]">
                      {summary ? renderTopGroup(summary.analysis.topProductFamilies) : "-"}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>주요 라인</span>
                    <strong className="text-right text-[var(--foreground)]">
                      {summary ? renderTopGroup(summary.analysis.topLines) : "-"}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-black/5 bg-white p-5">
                <p className="text-sm font-semibold text-[var(--foreground)]">데이터 품질</p>
                <div className="mt-4 space-y-3 text-sm text-[var(--muted)]">
                  <div className="flex items-center justify-between gap-3">
                    <span>PID 보유 행</span>
                    <strong className="text-[var(--foreground)]">
                      {summary ? summary.analysis.rowsWithPid.toLocaleString() : 0}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>PID 중복</span>
                    <strong className="text-amber-700">
                      {summary ? summary.analysis.rowsDuplicatePid.toLocaleString() : 0}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>거래처 누락</span>
                    <strong className="text-amber-700">
                      {summary ? summary.analysis.rowsMissingCustomer.toLocaleString() : 0}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>현장 미입력</span>
                    <strong className="text-amber-700">
                      {summary ? summary.analysis.rowsMissingSite.toLocaleString() : 0}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>품명 누락</span>
                    <strong className="text-amber-700">
                      {summary ? summary.analysis.rowsMissingItemName.toLocaleString() : 0}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-black/5 bg-white p-5">
                <p className="text-sm font-semibold text-[var(--foreground)]">대표 체크 포인트</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {summary?.analysis.highlights?.length ? (
                    summary.analysis.highlights.map((highlight) => (
                      <span
                        key={highlight}
                        className="rounded-full bg-[var(--secondary)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)]"
                      >
                        {highlight}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-[var(--muted)]">파일을 선택하면 검토 포인트가 표시됩니다.</span>
                  )}
                </div>
                {summary ? (
                  <div className="mt-4 grid gap-2 text-xs text-[var(--muted)] sm:grid-cols-2">
                    <div className="rounded-2xl bg-[var(--secondary)] px-3 py-2">
                      피크 월: <strong className="text-[var(--foreground)]">{summary.analysis.peakMonthLabel ?? "-"}</strong>
                    </div>
                    <div className="rounded-2xl bg-[var(--secondary)] px-3 py-2">
                      피크 시간대: <strong className="text-[var(--foreground)]">{summary.analysis.peakHourLabel ?? "-"}</strong>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-black/5 bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    저장된 업로드 파일{storedBucket ? ` (${storedBucket})` : ""}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    업로드한 원본 파일은 Storage에 보관되고, AI는 필요한 파일만 선택해서 참고합니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void loadStoredFiles()}
                  className="rounded-xl border border-black/10 px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-black/5"
                >
                  새로고침
                </button>
              </div>

              {loadingStoredFiles ? (
                <p className="mt-3 text-sm text-[var(--muted)]">파일 목록을 불러오는 중입니다.</p>
              ) : !storedFiles.length ? (
                <p className="mt-3 text-sm text-[var(--muted)]">저장된 업로드 파일이 없습니다.</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-black/5 text-xs uppercase tracking-[0.08em] text-[var(--muted)]">
                        <th className="px-3 py-3">파일명</th>
                        <th className="px-3 py-3">크기</th>
                        <th className="px-3 py-3">수정 시각</th>
                        <th className="px-3 py-3">작업</th>
                      </tr>
                    </thead>
                    <tbody>
                      {storedFiles.map((file) => {
                        const busy = updatingPath === file.path;
                        return (
                          <tr key={file.path} className="border-b border-black/5 last:border-b-0">
                            <td className="px-3 py-3 font-medium text-[var(--foreground)]">{file.name}</td>
                            <td className="px-3 py-3 text-[var(--muted)]">{formatBytes(file.size)}</td>
                            <td className="px-3 py-3 text-[var(--muted)]">
                              {file.updatedAt ? new Date(file.updatedAt).toLocaleString() : "-"}
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex flex-wrap gap-2">
                                <a
                                  href={file.signedUrl ?? "#"}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={`rounded-lg border border-black/10 px-2.5 py-1 text-xs font-medium ${
                                    file.signedUrl
                                      ? "text-[var(--foreground)] hover:bg-black/5"
                                      : "pointer-events-none opacity-50"
                                  }`}
                                >
                                  열기
                                </a>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void handleRenameStoredFile(file.path, file.name)}
                                  className="rounded-lg border border-black/10 px-2.5 py-1 text-xs font-medium text-[var(--foreground)] hover:bg-black/5 disabled:opacity-50"
                                >
                                  수정
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void handleDeleteStoredFile(file.path)}
                                  className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                                >
                                  삭제
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <UploadChatPanel storedFiles={storedFiles} />
            <AiMemoryRulesPanel compact />
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
