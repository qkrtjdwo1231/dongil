import type { QuickParseResult } from "@/lib/types";

function cleanRemainingText(source: string) {
  return source.replace(/\s+/g, " ").trim();
}

export function parseQuickOrderText(input: string): QuickParseResult {
  const originalText = input.trim();

  if (!originalText) {
    return {
      width: null,
      height: null,
      quantity: null,
      line: null,
      itemNameCandidate: "",
      memoCandidate: "",
      originalText: ""
    };
  }

  let remaining = originalText;

  const sizeMatch = remaining.match(/(\d{2,5})\s*[xX*]\s*(\d{2,5})/);
  const width = sizeMatch ? Number(sizeMatch[1]) : null;
  const height = sizeMatch ? Number(sizeMatch[2]) : null;
  if (sizeMatch) {
    remaining = remaining.replace(sizeMatch[0], " ");
  }

  const quantityMatch = remaining.match(/(\d+)\s*(장|개)/);
  const quantity = quantityMatch ? Number(quantityMatch[1]) : null;
  if (quantityMatch) {
    remaining = remaining.replace(quantityMatch[0], " ");
  }

  const lineMatch = remaining.match(/(\d+\s*라인)/);
  const line = lineMatch ? lineMatch[1].replace(/\s+/g, "") : null;
  if (lineMatch) {
    remaining = remaining.replace(lineMatch[0], " ");
  }

  const cleaned = cleanRemainingText(remaining);

  return {
    width,
    height,
    quantity,
    line,
    itemNameCandidate: cleaned,
    memoCandidate: cleaned,
    originalText
  };
}

// TODO: 추후 AI API 연결
