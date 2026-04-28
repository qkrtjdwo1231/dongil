"use client";

import { useEffect, useMemo, useState } from "react";
import type { AiMemoryRule } from "@/lib/types";

type AiMemoryRulesPanelProps = {
  compact?: boolean;
};

type RulesResponse = {
  rules?: AiMemoryRule[];
  rule?: AiMemoryRule;
  error?: string;
};

type RuleDraft = {
  id?: string;
  title: string;
  category: string;
  content: string;
  priority: number;
  is_active: boolean;
};

const emptyDraft: RuleDraft = {
  title: "",
  category: "업무규칙",
  content: "",
  priority: 100,
  is_active: true
};

const categoryOptions = ["업무규칙", "용어사전", "품명매핑", "답변형식", "현장규칙"];

async function requestRules<T>(method: string, body?: Record<string, unknown>) {
  const response = await fetch("/api/ai/memory-rules", {
    method,
    headers: {
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "AI 기억 규칙 요청에 실패했습니다.");
  }

  return payload;
}

export function AiMemoryRulesPanel({ compact = false }: AiMemoryRulesPanelProps) {
  const [rules, setRules] = useState<AiMemoryRule[]>([]);
  const [draft, setDraft] = useState<RuleDraft>(emptyDraft);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const activeCount = useMemo(() => rules.filter((rule) => rule.is_active).length, [rules]);

  const loadRules = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await requestRules<RulesResponse>("GET");
      setRules(response.rules ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "규칙을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRules();
  }, []);

  const resetDraft = () => {
    setDraft(emptyDraft);
  };

  const startEdit = (rule: AiMemoryRule) => {
    setDraft({
      id: rule.id,
      title: rule.title,
      category: rule.category,
      content: rule.content,
      priority: rule.priority,
      is_active: rule.is_active
    });
    setMessage(null);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!draft.title.trim() || !draft.content.trim()) {
      setError("규칙 제목과 내용을 입력해 주세요.");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const method = draft.id ? "PATCH" : "POST";
      const response = await requestRules<RulesResponse>(method, draft);
      const nextRule = response.rule;
      if (!nextRule) {
        throw new Error("저장된 규칙 정보를 받지 못했습니다.");
      }

      setRules((current) => {
        const withoutCurrent = current.filter((rule) => rule.id !== nextRule.id);
        return [...withoutCurrent, nextRule].sort(
          (a, b) => a.priority - b.priority || Date.parse(b.created_at) - Date.parse(a.created_at)
        );
      });
      setMessage(draft.id ? "AI 기억 규칙을 수정했습니다." : "AI 기억 규칙을 저장했습니다.");
      resetDraft();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "규칙 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("이 AI 기억 규칙을 삭제하시겠습니까?")) {
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await requestRules("DELETE", { id });
      setRules((current) => current.filter((rule) => rule.id !== id));
      if (draft.id === id) {
        resetDraft();
      }
      setMessage("AI 기억 규칙을 삭제했습니다.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "규칙 삭제에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const panelClass = compact
    ? "rounded-[2rem] border border-black/5 bg-white p-5 shadow-[0_18px_60px_rgba(24,39,56,0.08)]"
    : "rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_60px_rgba(24,39,56,0.08)]";

  return (
    <div className={panelClass}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-lg font-semibold tracking-[-0.02em] text-[var(--foreground)]">
            AI 기억 규칙
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            업로드 파일 기반 답변에 항상 반영할 회사 규칙을 저장합니다. 저장한 규칙은 다음 질문부터 계속 기억된 것처럼 적용됩니다.
          </p>
        </div>
        <div className="rounded-2xl border border-black/5 bg-[var(--secondary)] px-3 py-2 text-xs leading-5 text-[var(--muted)]">
          활성 규칙 {activeCount}건 / 전체 {rules.length}건
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4 rounded-3xl border border-black/5 bg-[var(--secondary)]/60 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-[var(--foreground)]">
              <span className="font-medium">규칙 제목</span>
              <input
                value={draft.title}
                onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                placeholder="예: PID는 답변 첫 줄에 함께 표시"
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--primary)]"
              />
            </label>

            <label className="space-y-2 text-sm text-[var(--foreground)]">
              <span className="font-medium">규칙 분류</span>
              <select
                value={draft.category}
                onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)]"
              >
                {categoryOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="space-y-2 text-sm text-[var(--foreground)]">
            <span className="font-medium">규칙 내용</span>
            <textarea
              value={draft.content}
              onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))}
              rows={5}
              placeholder="예: 업로드 데이터에서 PID가 확인되면 답변 핵심 결론에도 PID를 함께 보여준다. 파일에 없는 값은 추측하지 않는다."
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--primary)]"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-[0.55fr_0.45fr]">
            <label className="space-y-2 text-sm text-[var(--foreground)]">
              <span className="font-medium">우선순위</span>
              <input
                type="number"
                min={1}
                max={999}
                value={draft.priority}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, priority: Number(event.target.value) || 100 }))
                }
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)]"
              />
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-[var(--foreground)]">
              <input
                type="checkbox"
                checked={draft.is_active}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, is_active: event.target.checked }))
                }
                className="h-4 w-4 rounded border-black/20 text-[var(--primary)] focus:ring-[var(--primary)]"
              />
              <span className="font-medium">바로 적용할 활성 규칙</span>
            </label>
          </div>

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-800">
              {error}
            </div>
          ) : null}

          {message ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-800">
              {message}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={saving}
              className="rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "저장 중..." : draft.id ? "규칙 수정" : "규칙 저장"}
            </button>
            <button
              type="button"
              onClick={resetDraft}
              disabled={saving}
              className="rounded-2xl border border-black/10 px-4 py-3 text-sm font-medium text-[var(--foreground)] hover:bg-black/5 disabled:opacity-60"
            >
              새 규칙 작성
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-black/5 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[var(--foreground)]">저장된 규칙 목록</p>
            <button
              type="button"
              onClick={() => void loadRules()}
              className="rounded-xl border border-black/10 px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-black/5"
            >
              새로고침
            </button>
          </div>

          {loading ? (
            <p className="mt-4 text-sm text-[var(--muted)]">규칙을 불러오는 중입니다.</p>
          ) : !rules.length ? (
            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
              저장된 규칙이 아직 없습니다. 예를 들어 "PID가 보이면 핵심 결론에도 함께 표시" 같은 규칙을 먼저 넣어두면 챗봇 답변이 더 일관되게 맞춰집니다.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {rules.map((rule) => (
                <div key={rule.id} className="rounded-2xl border border-black/5 bg-[var(--secondary)]/60 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-[var(--foreground)]">{rule.title}</p>
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[var(--muted)] ring-1 ring-black/5">
                          {rule.category}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            rule.is_active
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {rule.is_active ? "활성" : "비활성"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{rule.content}</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--foreground)] ring-1 ring-black/5">
                      우선순위 {rule.priority}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(rule)}
                      className="rounded-xl border border-black/10 px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-black/5"
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(rule.id)}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
