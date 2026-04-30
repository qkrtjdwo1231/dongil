"use client";

import { useEffect, useState } from "react";
import type { StoredUploadFile } from "@/lib/types";

type UploadChatPanelProps = {
  storedFiles: StoredUploadFile[];
  starterPrompts?: string[];
  title?: string;
  description?: string;
  badgeLabel?: string;
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

const defaultStarterPrompts = [
  "최근 업로드 파일에서 거래처별 주문 흐름을 요약해줘.",
  "규격이나 수량이 비어 있는 행이 있는지 찾아줘.",
  "자주 나온 품명과 라인을 정리해줘.",
  "상위 품목과 제품군 특징을 정리해줘."
];

export function UploadChatPanel({
  storedFiles,
  starterPrompts = defaultStarterPrompts,
  title = "AI 업로드 도우미",
  description = "업로드한 파일과 저장된 데이터만 기준으로 답변합니다.",
  badgeLabel = ""
}: UploadChatPanelProps) {
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "궁금한 분석 내용을 입력해 주세요."
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
              {title}
            </p>
            {description ? (
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                {description}
              </p>
            ) : null}
          </div>
          {badgeLabel ? (
            <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800">
              {badgeLabel}
            </span>
          ) : null}
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
                  placeholder="예: 상위 거래처 의존도와 품목 집중도를 같이 정리해줘."
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
