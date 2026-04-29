"use client";

import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "@/components/SectionCard";
import { GoalRecord, loadExecutiveGoals, saveExecutiveGoals } from "@/lib/executive-goals";
import type { OrderRecord } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

function buildMonthMetrics(orders: OrderRecord[], year: number, month: number) {
  const monthOrders = orders.filter((order) => {
    const date = new Date(order.created_at);
    return !Number.isNaN(date.getTime()) && date.getFullYear() === year && date.getMonth() + 1 === month;
  });

  const quantity = monthOrders.reduce((sum, order) => sum + (order.quantity || 0), 0);
  const area = monthOrders.reduce((sum, order) => sum + (order.area_pyeong || 0), 0);
  const activeDays = new Set(monthOrders.map((order) => order.created_at.slice(0, 10)).filter(Boolean)).size;
  const totalDays = new Date(year, month, 0).getDate();

  return {
    quantity,
    area,
    activeDays,
    totalDays,
    projectedQuantity: activeDays ? (quantity / activeDays) * totalDays : quantity,
    projectedArea: activeDays ? (area / activeDays) * totalDays : area
  };
}

export function ExecutiveGoalSettings({
  onGoalsChange,
  orders = []
}: {
  onGoalsChange?: (payload: Record<string, GoalRecord[]>) => void;
  orders?: OrderRecord[];
}) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [goalsByYear, setGoalsByYear] = useState<Record<string, GoalRecord[]>>({});

  useEffect(() => {
    setGoalsByYear(loadExecutiveGoals());
  }, []);

  const goals = useMemo(() => goalsByYear[String(year)] ?? [], [goalsByYear, year]);
  const latestOrderDate = useMemo(() => {
    return orders
      .map((order) => new Date(order.created_at))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((left, right) => right.getTime() - left.getTime())[0] ?? null;
  }, [orders]);

  const highlightedMonth = latestOrderDate && latestOrderDate.getFullYear() === year
    ? latestOrderDate.getMonth() + 1
    : new Date().getMonth() + 1;

  const highlightedGoal = goals.find((goal) => goal.month === highlightedMonth) ?? null;
  const highlightedMetrics = useMemo(
    () => buildMonthMetrics(orders, year, highlightedMonth),
    [highlightedMonth, orders, year]
  );

  const highlightedQuantityRate = highlightedGoal?.targetQuantity
    ? (highlightedMetrics.quantity / highlightedGoal.targetQuantity) * 100
    : 0;
  const highlightedAreaRate = highlightedGoal?.targetArea
    ? (highlightedMetrics.area / highlightedGoal.targetArea) * 100
    : 0;
  const highlightedProjectedQuantityRate = highlightedGoal?.targetQuantity
    ? (highlightedMetrics.projectedQuantity / highlightedGoal.targetQuantity) * 100
    : 0;
  const highlightedProjectedAreaRate = highlightedGoal?.targetArea
    ? (highlightedMetrics.projectedArea / highlightedGoal.targetArea) * 100
    : 0;

  const persistGoals = (nextState: Record<string, GoalRecord[]>) => {
    setGoalsByYear(nextState);
    saveExecutiveGoals(nextState);
    onGoalsChange?.(nextState);
  };

  const upsertGoal = (month: number) => {
    const quantityInput = window.prompt("목표 수량을 입력해 주세요.", "17000");
    if (!quantityInput) return;
    const areaInput = window.prompt("목표 평수를 입력해 주세요.", "150000");
    if (areaInput === null) return;
    const memoInput = window.prompt("메모를 입력해 주세요.", "");

    const nextGoals = [
      ...goals.filter((goal) => goal.month !== month),
      {
        month,
        targetQuantity: Number(quantityInput) || 0,
        targetArea: Number(areaInput) || 0,
        memo: memoInput ?? ""
      }
    ].sort((a, b) => a.month - b.month);

    persistGoals({
      ...goalsByYear,
      [String(year)]: nextGoals
    });
  };

  const removeGoal = (month: number) => {
    const nextGoals = goals.filter((goal) => goal.month !== month);
    persistGoals({
      ...goalsByYear,
      [String(year)]: nextGoals
    });
  };

  return (
    <SectionCard
      title="목표 설정"
      description="월별 생산 목표를 설정하고, 현재 업로드된 실적 기준으로 진행률과 예상 마감 수준을 함께 확인합니다."
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
            onClick={() => upsertGoal(highlightedMonth)}
            className="rounded-2xl bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white"
          >
            목표 추가
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {highlightedGoal ? (
          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-black/5 bg-white p-4">
                <p className="text-sm font-semibold text-[var(--foreground)]">{year}년 {highlightedMonth}월 수량 진행률</p>
                <p className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[var(--foreground)]">{highlightedQuantityRate.toFixed(1)}%</p>
                <p className="mt-2 text-xs text-[var(--muted)]">실적 {formatNumber(highlightedMetrics.quantity)} / 목표 {formatNumber(highlightedGoal.targetQuantity)}</p>
              </div>
              <div className="rounded-2xl border border-black/5 bg-white p-4">
                <p className="text-sm font-semibold text-[var(--foreground)]">{year}년 {highlightedMonth}월 평수 진행률</p>
                <p className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[var(--foreground)]">{highlightedAreaRate.toFixed(1)}%</p>
                <p className="mt-2 text-xs text-[var(--muted)]">실적 {highlightedMetrics.area.toFixed(1)} / 목표 {formatNumber(highlightedGoal.targetArea)}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
              <p className="text-sm font-semibold text-sky-900">현재 추세 기준 예상 마감</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs text-sky-800">예상 수량</p>
                  <p className="mt-1 text-lg font-semibold text-sky-950">{formatNumber(Math.round(highlightedMetrics.projectedQuantity))}</p>
                  <p className="text-xs text-sky-800">달성률 {highlightedProjectedQuantityRate.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-xs text-sky-800">예상 평수</p>
                  <p className="mt-1 text-lg font-semibold text-sky-950">{highlightedMetrics.projectedArea.toFixed(1)}</p>
                  <p className="text-xs text-sky-800">달성률 {highlightedProjectedAreaRate.toFixed(1)}%</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-sky-900">
                해당 월 실적이 입력된 {formatNumber(highlightedMetrics.activeDays)}일을 기준으로 단순 추세를 계산했습니다.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-black/10 bg-white px-5 py-8 text-sm text-[var(--muted)]">
            {year}년 {highlightedMonth}월 목표가 아직 없습니다. 목표를 등록하면 진행률과 예상 마감이 함께 표시됩니다.
          </div>
        )}

        <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#f8fafb] text-xs uppercase tracking-[0.08em] text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3">연월</th>
                <th className="px-4 py-3">목표 수량</th>
                <th className="px-4 py-3">실적 수량</th>
                <th className="px-4 py-3">예상 수량</th>
                <th className="px-4 py-3">목표 평수</th>
                <th className="px-4 py-3">실적 평수</th>
                <th className="px-4 py-3">예상 평수</th>
                <th className="px-4 py-3">메모</th>
                <th className="px-4 py-3">작업</th>
              </tr>
            </thead>
            <tbody>
              {goals.length ? (
                goals.map((goal) => {
                  const metrics = buildMonthMetrics(orders, year, goal.month);
                  return (
                    <tr key={`${year}-${goal.month}`} className="border-t border-black/5">
                      <td className="px-4 py-3 font-medium text-[var(--foreground)]">{year}년 {goal.month}월</td>
                      <td className="px-4 py-3">{formatNumber(goal.targetQuantity)}</td>
                      <td className="px-4 py-3">{formatNumber(metrics.quantity)}</td>
                      <td className="px-4 py-3">{formatNumber(Math.round(metrics.projectedQuantity))}</td>
                      <td className="px-4 py-3">{formatNumber(goal.targetArea)}</td>
                      <td className="px-4 py-3">{metrics.area.toFixed(1)}</td>
                      <td className="px-4 py-3">{metrics.projectedArea.toFixed(1)}</td>
                      <td className="px-4 py-3">{goal.memo || "-"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button type="button" onClick={() => upsertGoal(goal.month)} className="rounded-xl border border-black/10 px-3 py-1 text-xs">수정</button>
                          <button type="button" onClick={() => removeGoal(goal.month)} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1 text-xs text-rose-700">삭제</button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-[var(--muted)]">
                    등록된 목표가 없습니다. 목표 추가 버튼으로 월별 목표를 등록해 주세요.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </SectionCard>
  );
}
