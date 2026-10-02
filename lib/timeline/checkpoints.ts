import { addDays, daysBetween } from "@/lib/saver/dates";
import type { Goal } from "@/lib/saver/schema";
import { projectGoal } from "./eta";

export type Checkpoint = {
  id: string;
  kind: "step" | "milestone" | "finish";
  amount: number;
  date: string;
  pct?: number;
};

/** One deposit. Payday saves are split into four weekly bites so a node is always a week away. */
export function depositSize(goal: Goal): number {
  if (goal.autoSave.amount <= 0) return 1;
  if (goal.autoSave.cadence === "weekly") return goal.autoSave.amount;
  return Math.max(1, Math.round(goal.autoSave.amount / 4));
}

export function buildCheckpoints(goal: Goal, today: string): Checkpoint[] {
  const deposit = depositSize(goal);
  const items: Checkpoint[] = [];

  for (let k = 1; k <= 4; k += 1) {
    const amount = roundPence(goal.savedSoFar + k * deposit);
    if (amount >= goal.targetAmount) break;
    items.push({
      id: `step-${k}`,
      kind: "step",
      amount,
      date: addDays(today, k * 7),
    });
  }

  for (const pct of [25, 50, 75, 90]) {
    const raw = (goal.targetAmount * pct) / 100;
    if (raw <= goal.savedSoFar + 0.5) continue;
    const stepsNeeded = Math.max(1, Math.ceil((raw - goal.savedSoFar) / deposit));
    const snapped = roundPence(goal.savedSoFar + stepsNeeded * deposit);
    if (snapped >= goal.targetAmount) continue;
    if (items.some((item) => Math.abs(item.amount - snapped) < 0.5)) {
      const existing = items.find((item) => Math.abs(item.amount - snapped) < 0.5);
      if (existing && existing.kind === "step") existing.pct = pct;
      continue;
    }
    items.push({
      id: `mile-${pct}`,
      kind: "milestone",
      amount: snapped,
      pct,
      date: addDays(today, stepsNeeded * 7),
    });
  }

  const projection = projectGoal(goal, { today });
  items.push({
    id: "finish",
    kind: "finish",
    amount: goal.targetAmount,
    date: projection.etaDate ?? goal.targetDate,
  });

  return items.sort((a, b) => a.amount - b.amount);
}

export function firstStepWithinAWeek(goal: Goal, today: string): boolean {
  const first = buildCheckpoints(goal, today).find((item) => item.kind === "step");
  if (!first) return true;
  return daysBetween(today, first.date) <= 7;
}

function roundPence(n: number): number {
  return Math.round(n * 100) / 100;
}
