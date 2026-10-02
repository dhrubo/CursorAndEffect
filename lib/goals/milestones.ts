import { addMonths, isoDate, spokenDate } from "@/lib/dates";
import { gbp } from "@/lib/format";
import { compareDebtStrategies, repayableDebts } from "@/lib/finance/debt";
import type { Plan } from "@/lib/finance/ladder";
import { lisaEligibility } from "@/lib/finance/savings";
import { UK_RULES } from "@/lib/finance/tax";
import type { HistorySnapshot } from "@/lib/history";
import type { Profile } from "@/lib/profile";
import { round2 } from "@/lib/spending/model";
import type { Goal } from "./model";

export type Milestone = {
  id: string;
  label: string;
  current: number;
  target: number;
  pct: number;
  source: "ladder" | "goal";
  crossedAt?: string;
  projectedDate?: string;
};

function pctOf(current: number, target: number): number {
  if (target <= 0) return 100;
  return Math.min(100, Math.round((Math.max(0, current) / target) * 100));
}

function projectDate(current: number, target: number, monthly: number, todayIso: string): string | undefined {
  const gap = target - current;
  if (gap <= 0 || monthly <= 0) return undefined;
  return addMonths(todayIso, Math.ceil(gap / monthly));
}

function firstCrossed(
  history: HistorySnapshot[] | undefined,
  met: (snapshot: HistorySnapshot) => boolean,
  already: boolean,
  todayIso: string,
): string | undefined {
  if (!already) return undefined;
  const hit = history?.find(met);
  return hit?.recordedAt.slice(0, 10) ?? todayIso;
}

function moneyMilestone(input: {
  id: string;
  label: string;
  current: number;
  target: number;
  source: Milestone["source"];
  monthly: number;
  todayIso: string;
  crossedAt?: string;
}): Milestone {
  const current = round2(Math.max(0, input.current));
  const target = round2(Math.max(0, input.target));
  const pct = pctOf(current, target);
  const crossed = pct >= 100;
  return {
    id: input.id,
    label: input.label,
    current,
    target,
    pct,
    source: input.source,
    crossedAt: crossed ? input.crossedAt ?? input.todayIso : undefined,
    projectedDate: crossed ? undefined : projectDate(current, target, input.monthly, input.todayIso),
  };
}

export function deriveMilestones(input: {
  profile: Profile;
  plan: Plan;
  goals?: Goal[];
  history?: HistorySnapshot[];
  freeableMonthly?: number;
  today?: Date;
}): Milestone[] {
  const today = input.today ?? new Date();
  const todayIso = isoDate(today);
  const monthly = Math.max(0, input.plan.metrics.monthlySurplus + (input.freeableMonthly ?? 0));
  const metrics = input.plan.metrics;
  const milestones: Milestone[] = [];

  const bufferCrossed = metrics.cashSavings >= metrics.starterBufferTarget && metrics.starterBufferTarget > 0;
  milestones.push(
    moneyMilestone({
      id: "starter-buffer",
      label: "Starter buffer",
      current: metrics.cashSavings,
      target: metrics.starterBufferTarget,
      source: "ladder",
      monthly,
      todayIso,
      crossedAt: firstCrossed(
        input.history,
        (snapshot) => snapshot.cashSavings >= metrics.starterBufferTarget,
        bufferCrossed,
        todayIso,
      ),
    }),
  );

  const fundCrossed = metrics.cashSavings >= metrics.emergencyFundTarget && metrics.emergencyFundTarget > 0;
  milestones.push(
    moneyMilestone({
      id: "emergency-fund",
      label: "Emergency fund",
      current: metrics.cashSavings,
      target: metrics.emergencyFundTarget,
      source: "ladder",
      monthly,
      todayIso,
      crossedAt: firstCrossed(
        input.history,
        (snapshot) => snapshot.cashSavings >= metrics.emergencyFundTarget,
        fundCrossed,
        todayIso,
      ),
    }),
  );

  const lisa = lisaEligibility(input.profile);
  if (lisa.eligible || input.profile.lisaContributedThisYear > 0) {
    const lisaCrossed = input.profile.lisaContributedThisYear >= UK_RULES.lisaAllowance;
    milestones.push(
      moneyMilestone({
        id: "lisa-allowance",
        label: "Lifetime ISA allowance",
        current: input.profile.lisaContributedThisYear,
        target: UK_RULES.lisaAllowance,
        source: "ladder",
        monthly,
        todayIso,
        crossedAt: lisaCrossed ? todayIso : undefined,
      }),
    );
  }

  const repayable = repayableDebts(input.profile.debts);
  if (repayable.length > 0) {
    const comparison = compareDebtStrategies(input.profile, {
      extraPerMonth: Math.max(0, Math.round(input.plan.metrics.monthlySurplus + (input.freeableMonthly ?? 0))),
    });
    const chosen = comparison[comparison.recommended];
    const cleared = input.history?.length
      ? Math.max(0, input.history[0].totalDebt - metrics.totalDebt)
      : 0;
    const target = round2(metrics.totalDebt + cleared);
    const projected =
      chosen.feasible && metrics.totalDebt > 0 ? addMonths(todayIso, chosen.months) : undefined;
    const crossed = metrics.totalDebt <= 0;
    milestones.push({
      id: "debt-free",
      label: "Debt-free",
      current: crossed ? target : round2(cleared),
      target: target > 0 ? target : 1,
      pct: crossed ? 100 : pctOf(cleared, target),
      source: "ladder",
      crossedAt: crossed ? todayIso : undefined,
      projectedDate: crossed ? undefined : projected,
    });
  }

  if (input.profile.buyingHome && input.profile.targetHomePrice > 0) {
    const deposit = round2(input.profile.targetHomePrice * 0.1);
    const depositCrossed = metrics.cashSavings >= deposit;
    milestones.push(
      moneyMilestone({
        id: "house-deposit",
        label: "House deposit (10%)",
        current: metrics.cashSavings,
        target: deposit,
        source: "ladder",
        monthly,
        todayIso,
        crossedAt: firstCrossed(
          input.history,
          (snapshot) => snapshot.cashSavings >= deposit,
          depositCrossed,
          todayIso,
        ),
      }),
    );
  }

  for (const goal of input.goals ?? []) {
    const crossed = goal.saved >= goal.target;
    milestones.push(
      moneyMilestone({
        id: `goal:${goal.id}`,
        label: goal.name,
        current: goal.saved,
        target: goal.target,
        source: "goal",
        monthly,
        todayIso,
        crossedAt: crossed ? todayIso : undefined,
      }),
    );
  }

  return milestones;
}

export function nextMilestone(milestones: Milestone[]): Milestone | undefined {
  return milestones.find((milestone) => milestone.pct < 100);
}

export function amountLeft(milestone: Milestone): number {
  return Math.max(0, Math.round(milestone.target - milestone.current));
}

/** Distance left and a spoken date. Percent is never the headline. */
export function distanceLeftLine(milestone: Milestone): string {
  if (milestone.pct >= 100) {
    return milestone.crossedAt ? `Reached · ${spokenDate(milestone.crossedAt)}` : "Reached";
  }
  const left = `${gbp(amountLeft(milestone))} left`;
  return milestone.projectedDate ? `${left} · around ${spokenDate(milestone.projectedDate)}` : left;
}
