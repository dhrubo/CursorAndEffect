import { addDays, daysBetween } from "@/lib/saver/dates";
import type { Goal } from "@/lib/saver/schema";

export type Projection = {
  etaDate: string | null;
  daysLeft: number | null;
  amountLeft: number;
  dailyRate: number;
  series: { date: string; saved: number }[];
};

export function monthlyAutoSave(goal: Goal): number {
  if (!goal.autoSave.enabled || goal.autoSave.amount <= 0) return 0;
  if (goal.autoSave.cadence === "weekly") return (goal.autoSave.amount * 52) / 12;
  return goal.autoSave.amount;
}

export function projectGoal(
  goal: Goal,
  { today, topUpsPerMonth = 0 }: { today: string; topUpsPerMonth?: number },
): Projection {
  const amountLeft = Math.max(0, roundPence(goal.targetAmount - goal.savedSoFar));
  const monthly = monthlyAutoSave(goal) + Math.max(0, topUpsPerMonth);
  const dailyRate = (monthly * 12) / 365;
  const daysLeft = amountLeft <= 0 ? 0 : dailyRate <= 0 ? null : Math.ceil(amountLeft / dailyRate);
  const etaDate = daysLeft == null ? null : addDays(today, daysLeft);
  const series: Projection["series"] = [{ date: today, saved: goal.savedSoFar }];
  if (daysLeft != null && daysLeft > 0) {
    const steps = Math.min(8, Math.max(2, Math.ceil(daysLeft / 14)));
    for (let i = 1; i <= steps; i += 1) {
      const day = Math.round((daysLeft * i) / steps);
      const saved = Math.min(goal.targetAmount, goal.savedSoFar + dailyRate * day);
      series.push({ date: addDays(today, day), saved: roundPence(saved) });
    }
  }
  return { etaDate, daysLeft, amountLeft, dailyRate, series };
}

export type DivertImpact = {
  onTrackEta: string | null;
  divertedEta: string | null;
  deltaDays: number;
  amountLeft: number;
};

export function divertImpact(
  goal: Goal,
  amount: number,
  options: { today: string; topUpsPerMonth?: number },
): DivertImpact {
  const base = projectGoal(goal, options);
  const spend = Math.max(0, amount);
  if (base.dailyRate <= 0 || base.daysLeft == null) {
    return { onTrackEta: base.etaDate, divertedEta: null, deltaDays: 0, amountLeft: base.amountLeft };
  }
  const deltaDays = spend <= 0 ? 0 : Math.ceil(spend / base.dailyRate);
  return {
    onTrackEta: base.etaDate,
    divertedEta: base.etaDate ? addDays(base.etaDate, deltaDays) : null,
    deltaDays,
    amountLeft: base.amountLeft,
  };
}

export function replan(
  goal: Goal,
  today: string,
  keep: "date" | "amount",
): { weeklyAmount: number; targetDate: string } {
  const projected = projectGoal(goal, { today });
  if (keep === "amount") {
    return {
      weeklyAmount: goal.autoSave.amount,
      targetDate: projected.etaDate ?? goal.targetDate,
    };
  }
  const days = Math.max(7, daysBetween(today, goal.targetDate));
  const weekly = Math.max(1, Math.ceil(projected.amountLeft / (days / 7)));
  return { weeklyAmount: weekly, targetDate: goal.targetDate };
}

function roundPence(n: number): number {
  return Math.round(n * 100) / 100;
}
