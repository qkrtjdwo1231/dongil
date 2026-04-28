"use client";

import { useEffect, useMemo, useState } from "react";
import type { StoredUploadFile } from "@/lib/types";

type UploadChatPanelProps = {
  storedFiles: StoredUploadFile[];
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type UploadChatResponse = {
  answer: string;
  usedFiles: Array<{
    id?: string;
    name: string;
    path: string;
    summary: string;
    rowCount?: number;
  }>;
};

const starterPrompts = [
  "최근 업로드 파일에서 거래처별 주문 흐름을 요약해줘.",
  "규격이나 수량이 비어 있는 행이 있는지 찾아줘.",
  "자주 나온 품명과 라인을 정리해줘.",
  "PID가 있는 행 기준으로 핵심 값만 정리해줘."
];

export function UploadChatPanel({ storedFiles }: UploadChatPanelProps) {
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: crypto.randomUUID(),
      role: "assistant",
      content:
        "선택한 업로드 파일만 기준으로 답변합니다. 파일에 없는 내용은 추측하지 않고, 확인되지 않으면 그대로 알려드리겠습니다."
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usedFiles, setUsedFiles] = useState<UploadChatResponse["usedFiles"]>([]);

  useEffect(() => {
    if (!storedFiles.length) {
      setSelectedPaths([]);
      return;
    }

    setSelectedPaths((current) => {
      const stillValid = current.filter((path) => storedFiles.some((file) => file.path === path));
      if (stillValid.length) {
        return stillValid;
      }

      return storedFiles.slice(0, 3).map((file) => file.path);
    });
  }, [storedFiles]);

  const selectedNames = useMemo(
    () => storedFiles.filter((file) => selectedPaths.includes(file.path)).map((file) => file.name),
    [selectedPaths, storedFiles]
  );

  const toggleFile = (path: string) => {
    setSelectedPaths((current) =>
      current.includes(path) ? current.filter((item) => item !== path) : [...current, path]
    );
  };

  const sendQuestion = async (nextQuestion: string) => {
    const trimmed = nextQuestion.trim();
    if (!trimmed || loading) {
      return;
    }

    if (!selectedPaths.length) {
      setError("먼저 챗봇이 참고할 업로드 파일을 1개 이상 선택해 주세요.");
      return;
    }

    setLoading(true);
    setError(null);

    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed
      }
    ]);
    setQuestion("");

    try {
      const response = await fetch("/api/ai/upload-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          question: trimmed,
          filePaths: selectedPaths
        })
      });

      const payload = (await response.json()) as UploadChatResponse & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "AI 응답을 받아오지 못했습니다.");
      }

      setUsedFiles(payload.usedFiles ?? []);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: payload.answer
        }
      ]);
    } catch (chatError) {
      const message =
        chatError instanceof Error
          ? chatError.message
          : "AI 대화 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
      setError(message);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `오류가 발생했습니다. ${message}`
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-[2rem] border border-black/5 bg-white p-5 shadow-[0_18px_60px_rgba(24,39,56,0.08)]">
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-lg font-semibold tracking-[-0.02em] text-[var(--foreground)]">
              AI 업로드 도우미
            </p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              업로드한 파일과 저장된 업로드 데이터만 기준으로 답변합니다. 추측하지 않고, 필요한 경우 PID·거래처·품명·규격 기준으로 정리해드립니다.
            </p>
          </div>
          <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800">
            선택 파일 기준 답변
          </span>
        </div>

        <div className="rounded-2xl border border-black/5 bg-[var(--secondary)]/70 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">참고 파일 선택</p>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                현재 {selectedPaths.length}개 파일을 참고합니다.
                {selectedNames.length ? ` (${selectedNames.join(", ")})` : ""}
              </p>
            </div>
            <div className="rounded-2xl bg-white px-3 py-2 text-xs leading-5 text-[var(--muted)] ring-1 ring-black/5">
              파일이 많아도 전체를 한 번에 읽지 않고, 필요한 행만 골라서 답변합니다.
            </div>
          </div>

          <div className="mt-4 max-h-44 space-y-2 overflow-y-auto pr-1">
            {storedFiles.length ? (
              storedFiles.map((file) => {
                const checked = selectedPaths.includes(file.path);

                return (
                  <label
                    key={file.path}
                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-2 text-sm transition ${
                      checked
                        ? "border-[var(--primary)] bg-white text-[var(--foreground)]"
                        : "border-black/5 bg-white/70 text-[var(--muted)] hover:border-black/10"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleFile(file.path)}
                      className="mt-1 h-4 w-4 rounded border-black/20 text-[var(--primary)] focus:ring-[var(--primary)]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{file.name}</span>
                      <span className="block text-xs text-[var(--muted)]">
                        {file.updatedAt ? new Date(file.updatedAt).toLocaleString() : "업로드 시각 없음"}
                      </span>
                    </span>
                  </label>
                );
              })
            ) : (
              <p className="text-sm text-[var(--muted)]">
                저장된 업로드 파일이 아직 없습니다. 먼저 파일 업로드를 완료해 주세요.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-black/5 bg-white">
          <div className="flex h-[31rem] flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[88%] rounded-3xl px-4 py-3 text-sm leading-6 shadow-sm ${
                      message.role === "user"
                        ? "bg-[var(--primary)] text-white"
                        : "border border-black/5 bg-[var(--secondary)] text-[var(--foreground)]"
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-black/5 px-4 py-4">
              <div className="mb-3 flex flex-wrap gap-2">
                {starterPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void sendQuestion(prompt)}
                    disabled={loading || !storedFiles.length}
                    className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {error ? (
                <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-800">
                  {error}
                </div>
              ) : null}

              {usedFiles.length ? (
                <div className="mb-3 rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-900">
                  <p className="font-semibold">이번 답변에 참고한 파일</p>
                  <div className="mt-2 space-y-1">
                    {usedFiles.map((file) => (
                      <p key={file.path}>
                        {file.name}: {file.summary}{file.rowCount ? ` / 참고 행 ${file.rowCount}건` : ""}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="flex items-end gap-3">
                <textarea
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="예: PID가 있는 행 기준으로 규격 누락과 수량 누락을 같이 정리해줘."
                  rows={3}
                  className="min-h-[88px] flex-1 resize-none rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--primary)]"
                />
                <button
                  type="button"
                  onClick={() => void sendQuestion(question)}
                  disabled={loading || !question.trim() || !storedFiles.length}
                  className="rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "질문 중..." : "보내기"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
