"use client";

import { useState } from "react";
import { SectionCard } from "@/components/SectionCard";
import type { UploadImportResult, UploadPreviewSummary } from "@/lib/types";

type ExistingDataUploadPanelProps = {
  onImportComplete: (result: UploadImportResult) => Promise<void> | void;
};

async function postUpload<T>(url: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(url, {
    method: "POST",
    body: formData
  });

  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "업로드 요청에 실패했습니다.");
  }

  return payload as T;
}

export function ExistingDataUploadPanel({ onImportComplete }: ExistingDataUploadPanelProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [summary, setSummary] = useState<UploadPreviewSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      setMessage(
        `파일 분석이 완료되었습니다. 총 ${preview.totalRows.toLocaleString()}행 중 유효 행 ${preview.validRows.toLocaleString()}건`
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

    if (!summary?.validRows) {
      setError("가져올 수 있는 유효 행이 없습니다.");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage("대용량 파일을 배치로 저장 중입니다. 행 수가 많으면 시간이 걸릴 수 있습니다.");

    try {
      const result = await postUpload<UploadImportResult>("/api/upload/import", selectedFile);
      await onImportComplete(result);
      setMessage(
        `${result.insertedRows.toLocaleString()}건 저장이 완료되었습니다.`
      );
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

  const previewRows = summary?.previewRows ?? [];

  return (
    <SectionCard
      title="파일 업로드"
      description="기존 엑셀 관리 데이터를 서버에서 읽어 요약과 미리보기를 만든 뒤 배치 단위로 저장합니다."
    >
      <div className="space-y-6">
        <div className="rounded-2xl border border-dashed border-[var(--primary)]/20 bg-[var(--secondary)]/70 p-6">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-3xl space-y-2">
              <h3 className="text-base font-semibold text-[var(--foreground)]">엑셀 파일 업로드</h3>
              <p className="text-sm leading-6 text-[var(--muted)]">
                첫 번째 시트 기준으로 파일을 읽고, 거래처와 품명, 수량이 있는 행만 주문 데이터로 저장합니다.
              </p>
              <p className="text-xs leading-5 text-[var(--muted)]">
                대용량 파일은 브라우저가 아니라 서버에서 분석하고, 저장은 여러 번에 나눠 배치로 처리합니다.
              </p>
              {selectedFileName ? (
                <p className="text-xs font-medium text-[var(--primary)]">선택 파일: {selectedFileName}</p>
              ) : null}
            </div>
            <label className="inline-flex cursor-pointer items-center rounded-2xl bg-[var(--foreground)] px-4 py-2.5 text-sm font-semibold text-white">
              파일 선택
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(event) => void handleFileSelect(event.target.files?.[0] ?? null)}
              />
            </label>
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

        <div className="grid gap-4 lg:grid-cols-[0.72fr_1.28fr]">
          <div className="rounded-2xl border border-black/5 bg-white p-5">
            <p className="text-sm font-semibold text-[var(--foreground)]">분석 요약</p>
            <div className="mt-4 space-y-3 text-sm text-[var(--muted)]">
              <div className="flex items-center justify-between">
                <span>총 행</span>
                <strong className="text-[var(--foreground)]">
                  {summary ? summary.totalRows.toLocaleString() : 0}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span>업로드 가능</span>
                <strong className="text-emerald-700">
                  {summary ? summary.validRows.toLocaleString() : 0}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span>검토 필요</span>
                <strong className="text-amber-700">
                  {summary ? summary.invalidRows.toLocaleString() : 0}
                </strong>
              </div>
            </div>

            <button
              type="button"
              onClick={handleImport}
              disabled={saving || !summary?.validRows}
              className="mt-6 w-full rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "배치 저장 중..."
                : `유효 행 ${summary?.validRows.toLocaleString() ?? 0}건 저장`}
            </button>
          </div>

          <div className="rounded-2xl border border-black/5 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[var(--foreground)]">미리보기</p>
              <span className="text-xs text-[var(--muted)]">상위 12행만 표시</span>
            </div>

            {!previewRows.length ? (
              <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
                파일을 선택하면 서버 분석 결과와 함께 상위 일부 행만 미리 보여줍니다.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-black/5 text-xs uppercase tracking-[0.08em] text-[var(--muted)]">
                      <th className="px-3 py-3">행</th>
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
                        <td className="px-3 py-3 font-medium text-[var(--foreground)]">
                          {row.draft.customer || "-"}
                        </td>
                        <td className="px-3 py-3 text-[var(--foreground)]">{row.draft.item_name || "-"}</td>
                        <td className="px-3 py-3 text-[var(--foreground)]">{row.draft.quantity || "-"}</td>
                        <td className="px-3 py-3">
                          {row.valid ? (
                            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                              업로드 가능
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
      </div>
    </SectionCard>
  );
}
