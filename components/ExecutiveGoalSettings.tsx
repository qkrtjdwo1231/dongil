"use client";

import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "@/components/SectionCard";
import { formatNumber } from "@/lib/utils";

type GoalRecord = {
  month: number;
  targetQuantity: number;
  targetArea: number;
  memo: string;
};

const STORAGE_KEY = "dongil-executive-goals";

function loadAllGoals(): Record<string, GoalRecord[]> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, GoalRecord[]>) : {};
  } catch {
    return {};
  }
}

function saveAllGoals(payload: Record<string, GoalRecord[]>) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function ExecutiveGoalSettings() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [goalsByYear, setGoalsByYear] = useState<Record<string, GoalRecord[]>>({});

  useEffect(() => {
    setGoalsByYear(loadAllGoals());
  }, []);

  const goals = useMemo(() => goalsByYear[String(year)] ?? [], [goalsByYear, year]);

  const upsertGoal = (month: number) => {
    const quantityInput = window.prompt("목표 수량을 입력해 주세요.", "17000");
    if (!quantityInput) return;
    const areaInput = window.prompt("목표 평수를 입력해 주세요.", "150000");
    if (areaInput === null) return;
    const memoInput = window.prompt("메모를 입력해 주세요.", "");

    const nextGoals = [...goals.filter((goal) => goal.month !== month), {
      month,
      targetQuantity: Number(quantityInput) || 0,
      targetArea: Number(areaInput) || 0,
      memo: memoInput ?? ""
    }].sort((a, b) => a.month - b.month);

    const nextState = {
      ...goalsByYear,
      [String(year)]: nextGoals
    };
    setGoalsByYear(nextState);
    saveAllGoals(nextState);
  };

  const removeGoal = (month: number) => {
    const nextGoals = goals.filter((goal) => goal.month !== month);
    const nextState = {
      ...goalsByYear,
      [String(year)]: nextGoals
    };
    setGoalsByYear(nextState);
    saveAllGoals(nextState);
  };

  return (
    <SectionCard
      title="목표 설정"
      description="월별 생산 목표를 설정하고 관리합니다. 업로드된 실적과 함께 목표 대비 현황을 비교할 수 있습니다."
      action={
        <div className="flex items-center gap-2">
          <select
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
            className="rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm"
          >
            {[currentYear - 1, currentYear, currentYear + 1].map((option) => (
              <option key={option} value={option}>
                {option}년
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => upsertGoal(new Date().getMonth() + 1)}
            className="rounded-2xl bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white"
          >
            목표 추가
          </button>
        </div>
      }
    >
      <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#f8fafb] text-xs uppercase tracking-[0.08em] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">연월</th>
              <th className="px-4 py-3">목표 수량</th>
              <th className="px-4 py-3">목표 평수</th>
              <th className="px-4 py-3">메모</th>
              <th className="px-4 py-3">작업</th>
            </tr>
          </thead>
          <tbody>
            {goals.length ? (
              goals.map((goal) => (
                <tr key={`${year}-${goal.month}`} className="border-t border-black/5">
                  <td className="px-4 py-3 font-medium text-[var(--foreground)]">{year}년 {goal.month}월</td>
                  <td className="px-4 py-3">{formatNumber(goal.targetQuantity)}</td>
                  <td className="px-4 py-3">{formatNumber(goal.targetArea)}</td>
                  <td className="px-4 py-3">{goal.memo || "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => upsertGoal(goal.month)} className="rounded-xl border border-black/10 px-3 py-1 text-xs">수정</button>
                      <button type="button" onClick={() => removeGoal(goal.month)} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1 text-xs text-rose-700">삭제</button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-[var(--muted)]">
                  등록된 목표가 없습니다. 목표 추가 버튼으로 월별 목표를 등록해 주세요.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
