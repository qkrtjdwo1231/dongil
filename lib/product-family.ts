import type { ProductFamily } from "@/lib/types";

const SAFETY_KEYWORDS = ["접합", "PVB", "안전"];
const LOW_E_KEYWORDS = ["로이", "LOW-E", "LOWE", "SKN", "MCT", "MZT"];
const ARGON_KEYWORDS = ["AR", "아르곤", "단열"];

function includesKeyword(source: string, keywords: string[]) {
  return keywords.some((keyword) => source.includes(keyword));
}

export function classifyProductFamily(itemName: string): ProductFamily {
  const normalized = itemName.trim().toUpperCase();

  if (!normalized) {
    return "일반/복층";
  }

  if (includesKeyword(normalized, SAFETY_KEYWORDS.map((keyword) => keyword.toUpperCase()))) {
    return "접합/안전";
  }

  if (includesKeyword(normalized, LOW_E_KEYWORDS.map((keyword) => keyword.toUpperCase()))) {
    return "로이/코팅";
  }

  if (includesKeyword(normalized, ARGON_KEYWORDS.map((keyword) => keyword.toUpperCase()))) {
    return "단열/아르곤";
  }

  return "일반/복층";
}
