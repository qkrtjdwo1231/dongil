export type GoalRecord = {
  month: number;
  targetQuantity: number;
  targetArea: number;
  memo: string;
};

export const EXECUTIVE_GOALS_STORAGE_KEY = "dongil-executive-goals";

export function loadExecutiveGoals(): Record<string, GoalRecord[]> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(EXECUTIVE_GOALS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, GoalRecord[]>) : {};
  } catch {
    return {};
  }
}

export function saveExecutiveGoals(payload: Record<string, GoalRecord[]>) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(EXECUTIVE_GOALS_STORAGE_KEY, JSON.stringify(payload));
}
