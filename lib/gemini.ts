import { GoogleGenAI } from "@google/genai";

export const gemini = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"] as const;

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error ?? "");
}

export function humanizeGeminiError(error: unknown) {
  const message = toErrorMessage(error);

  if (message.includes("RESOURCE_EXHAUSTED") || message.includes('"code":429')) {
    return "AI 추천 한도를 초과했습니다. 잠시 후 다시 시도하거나 관리자에게 문의해 주세요.";
  }

  if (message.includes("UNAVAILABLE") || message.includes('"code":503') || message.includes("high demand")) {
    return "AI 요청이 많아 잠시 지연되고 있습니다. 잠시 후 다시 시도해 주세요.";
  }

  if (message.includes("NOT_FOUND") || message.includes('"code":404') || message.includes("not found")) {
    return "현재 AI 모델 연결 상태를 확인하는 중입니다. 잠시 후 다시 시도해 주세요.";
  }

  if (message.includes("API key") || message.includes("GEMINI_API_KEY")) {
    return "Gemini API 설정을 확인해 주세요.";
  }

  return "AI 응답을 가져오는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
}

export async function generateGeminiText(contents: string) {
  let lastError: unknown = null;

  for (const model of GEMINI_MODELS) {
    try {
      const response = await gemini.models.generateContent({
        model,
        contents
      });

      return {
        text: response.text ?? "",
        model
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(humanizeGeminiError(lastError));
}
