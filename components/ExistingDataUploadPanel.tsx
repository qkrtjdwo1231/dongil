"use client";

import { useState } from "react";
import { SectionCard } from "@/components/SectionCard";
import { importOrders } from "@/lib/data-access";
import { parseUploadFile } from "@/lib/upload-parser";
import type { OrderRecord, UploadPreviewRow } from "@/lib/types";

type ExistingDataUploadPanelProps = {
  onOrdersImported: (orders: OrderRecord[]) => void;
};

export function ExistingDataUploadPanel({ onOrdersImported }: ExistingDataUploadPanelProps) {
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<UploadPreviewRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validRows = previewRows.filter((row) => row.valid);
  const invalidRows = previewRows.filter((row) => !row.valid);

  const handleFileSelect = async (file: File | null) => {
    if (!file) {
      return;
    }

    setSelectedFileName(file.name);
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const parsedRows = await parseUploadFile(file);
      setPreviewRows(parsedRows);
      setMessage(`파일 분석이 완료되었습니다. 유효 행 ${parsedRows.filter((row) => row.valid).length}건`);
    } catch {
      setPreviewRows([]);
      setError("파일을 읽지 못했습니다. 헤더 형식과 파일 내용을 다시 확인해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!validRows.length) {
      setError("가져올 수 있는 유효한 행이 없습니다.");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const createdOrders = await importOrders(validRows.map((row) => row.draft));
      onOrdersImported(createdOrders);
      setMessage(`${createdOrders.length}건의 주문을 업로드했습니다.`);
    } catch {
      setError("업로드 주문 저장에 실패했습니다. 파일 내용과 Supabase 상태를 확인해 주세요.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard
      title="파일 업로드"
      description="기존 엑셀 관리 데이터를 읽어와 주문 데이터로 미리보기 후 일괄 저장합니다."
    >
      <div className="space-y-6">
        <div className="rounded-2xl border border-dashed border-[var(--primary)]/20 bg-[var(--secondary)]/70 p-6">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-3xl space-y-2">
              <h3 className="text-base font-semibold text-[var(--foreground)]">엑셀 파일 업로드</h3>
              <p className="text-sm leading-6 text-[var(--muted)]">
                첫 번째 시트 기준으로 파일을 읽고, 거래처 · 품명 · 수량이 있는 행만 주문 데이터로
                저장합니다.
              </p>
              <p className="text-xs leading-5 text-[var(--muted)]">
                지원 헤더 예시: 거래처, 현장, 공정, 품목코드, 품명, 가로, 세로, 수량, 라인,
                의뢰번호, 등록자, 메모, 상태
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
            파일을 분석하는 중입니다.
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
                <strong className="text-[var(--foreground)]">{previewRows.length}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>업로드 가능</span>
                <strong className="text-emerald-700">{validRows.length}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>검토 필요</span>
                <strong className="text-amber-700">{invalidRows.length}</strong>
              </div>
            </div>

            <button
              type="button"
              onClick={handleImport}
              disabled={saving || !validRows.length}
              className="mt-6 w-full rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "업로드 저장 중..." : `유효 행 ${validRows.length}건 저장`}
            </button>
          </div>

          <div className="rounded-2xl border border-black/5 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[var(--foreground)]">미리보기</p>
              <span className="text-xs text-[var(--muted)]">상위 12행 표시</span>
            </div>

            {!previewRows.length ? (
              <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
                파일을 선택하면 업로드 전 미리보기와 검토 필요 행을 보여드립니다.
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
                    {previewRows.slice(0, 12).map((row) => (
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
