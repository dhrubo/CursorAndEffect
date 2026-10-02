import { PERSONAS } from "@/data/personas";
import { transactionsForProfile } from "@/data/transactions";
import { gbp } from "@/lib/format";
import { buildPlan, type Warning } from "@/lib/finance/ladder";
import { deriveMilestones, nextMilestone, type Milestone } from "@/lib/goals/milestones";
import type { Goal } from "@/lib/goals/model";
import { previousSnapshot, type HistorySnapshot } from "@/lib/history";
import type { Profile } from "@/lib/profile";
import { freeableMonthly, suggestSpendingChanges, type SpendingSuggestion } from "@/lib/spending/insights";
import type { Transaction } from "@/lib/spending/model";
import { monthKey } from "@/lib/dates";

export type CheckInStanding = "comfortable" | "steady" | "stretched";

export type CheckInChange = {
  id: string;
  label: string;
  detail: string;
  direction: "better" | "worse" | "same";
};

export type CheckInNote = {
  title: string;
  detail: string;
};

export type CheckInRisk = CheckInNote & { level: Warning["level"] };

export type CheckInAction = {
  title: string;
  detail: string;
  prompt: string;
};

export type CheckIn = {
  standing: CheckInStanding;
  headline: string;
  summary: string;
  changes: CheckInChange[];
  wins: CheckInNote[];
  risks: CheckInRisk[];
  nextAction: CheckInAction;
  milestones: Milestone[];
  figures: {
    monthlySurplus: number;
    cashSavings: number;
    emergencyFundTarget: number;
    starterBufferTarget: number;
    totalDebt: number;
    freeableMonthly: number;
  };
};

function standingFor(profile: Profile, plan: ReturnType<typeof buildPlan>): CheckInStanding {
  if (plan.stopped || plan.metrics.monthlySurplus < 0 || profile.missedPayments) return "stretched";
  const fundFull = plan.metrics.cashSavings >= plan.metrics.emergencyFundTarget;
  if (fundFull && plan.metrics.highInterestDebt === 0 && plan.metrics.monthlySurplus > 0) return "comfortable";
  return "steady";
}

function headlineFor(name: string, standing: CheckInStanding): string {
  const who = name.trim() || "You";
  if (standing === "comfortable") return `${who}, you're in a solid spot.`;
  if (standing === "stretched") return `${who}, money is tight right now.`;
  return `${who}, you're steady.`;
}

function changesSince(current: HistorySnapshot, previous: HistorySnapshot | undefined): CheckInChange[] {
  if (!previous) return [];
  const rows: CheckInChange[] = [];
  const cashDelta = Math.round(current.cashSavings - previous.cashSavings);
  if (cashDelta !== 0) {
    rows.push({
      id: "cash",
      label: "Cash savings",
      detail:
        cashDelta > 0
          ? `Cash is ${gbp(cashDelta)} higher than ${previous.month}.`
          : `Cash is ${gbp(-cashDelta)} lower than ${previous.month}.`,
      direction: cashDelta > 0 ? "better" : "worse",
    });
  }
  const debtDelta = Math.round(previous.totalDebt - current.totalDebt);
  if (debtDelta !== 0 || previous.totalDebt > 0) {
    rows.push({
      id: "debt",
      label: "Repayable debt",
      detail:
        debtDelta > 0
          ? `Repayable debt is ${gbp(debtDelta)} lower than ${previous.month}.`
          : debtDelta < 0
            ? `Repayable debt is ${gbp(-debtDelta)} higher than ${previous.month}.`
            : `Repayable debt is unchanged since ${previous.month}.`,
      direction: debtDelta > 0 ? "better" : debtDelta < 0 ? "worse" : "same",
    });
  }
  return rows;
}

function pickAction(input: {
  plan: ReturnType<typeof buildPlan>;
  profile: Profile;
  suggestions: SpendingSuggestion[];
}): CheckInAction {
  if (input.plan.stopped) {
    return {
      title: "Get free debt advice first",
      detail: "Essentials or repayments are ahead of income, so the plan stops before allocating spare money.",
      prompt: "I've missed payments and the budget doesn't cover essentials. Where should I start?",
    };
  }

  const urgent = input.plan.warnings.find((warning) => warning.level === "urgent");
  if (urgent) {
    return {
      title: urgent.title,
      detail: urgent.detail,
      prompt: `How should I handle this: ${urgent.title}?`,
    };
  }

  const top = input.suggestions[0];
  if (top && top.freeableMonthly >= 10) {
    return {
      title: top.title,
      detail: `${top.detail} ${top.planEffect.progressLine}`,
      prompt: "What spending could I cut?",
    };
  }

  const warning = input.plan.warnings[0];
  if (warning) {
    return {
      title: warning.title,
      detail: warning.detail,
      prompt: `How should I handle this: ${warning.title}?`,
    };
  }

  if (input.profile.employerMatchAvailable && !input.profile.gettingFullEmployerMatch) {
    return {
      title: "Take the full employer pension match",
      detail: "Matched contributions plus tax relief usually beat debt rates and savings rates.",
      prompt: "What should I do about the employer pension match?",
    };
  }

  const todo = input.plan.steps.find((step) => step.status === "todo" || step.status === "action");
  if (todo) {
    return {
      title: todo.title,
      detail: todo.detail,
      prompt: `What should I do with my next ${gbp(input.profile.nextAmount)}?`,
    };
  }

  return {
    title: "Keep the ladder topped up",
    detail: "The priority steps are covered. New spare cash can go to longer-term saving.",
    prompt: `What should I do with my next ${gbp(input.profile.nextAmount)}?`,
  };
}

export function buildCheckIn(input: {
  profile: Profile;
  goals?: Goal[];
  history?: HistorySnapshot[];
  transactions?: Transaction[];
  today?: Date;
}): CheckIn {
  const today = input.today ?? new Date();
  const transactions = input.transactions ?? transactionsForProfile(input.profile);
  const plan = buildPlan(input.profile);
  const suggestions = suggestSpendingChanges(input.profile, transactions);
  const freed = freeableMonthly(suggestions);
  const milestones = deriveMilestones({
    profile: input.profile,
    plan,
    goals: input.goals,
    history: input.history,
    freeableMonthly: freed,
    today,
  });
  const standing = standingFor(input.profile, plan);
  const name = input.profile.name.trim();
  const currentSnapshot = {
    month: monthKey(today),
    recordedAt: today.toISOString(),
    cashSavings: input.profile.cashSavings,
    monthlySurplus: plan.metrics.monthlySurplus,
    totalDebt: plan.metrics.totalDebt,
    essentialMonthlySpend: input.profile.essentialMonthlySpend,
    starterBufferTarget: plan.metrics.starterBufferTarget,
    emergencyFundTarget: plan.metrics.emergencyFundTarget,
    lisaContributedThisYear: input.profile.lisaContributedThisYear,
  };
  const previous = previousSnapshot(input.history ?? [], currentSnapshot.month);
  const changes = changesSince(currentSnapshot, previous);

  const wins: CheckInNote[] = [];
  const cashUp = changes.find((change) => change.id === "cash" && change.direction === "better");
  if (cashUp) wins.push({ title: "You saved more than last month", detail: cashUp.detail });
  const debtDown = changes.find((change) => change.id === "debt" && change.direction === "better");
  if (debtDown) wins.push({ title: "Debt is moving the right way", detail: debtDown.detail });
  if (plan.metrics.monthlySurplus > 0 && !plan.stopped) {
    wins.push({
      title: "Bills and minimum repayments are covered",
      detail: `There is ${gbp(plan.metrics.monthlySurplus)} a month left after essentials and minimum repayments.`,
    });
  }
  for (const milestone of milestones.filter((item) => item.pct >= 100).slice(0, 2)) {
    wins.push({ title: `${milestone.label} is reached`, detail: `${gbp(milestone.current)} of ${gbp(milestone.target)}.` });
  }
  if (wins.length === 0) {
    wins.push({
      title: "You've put numbers in one place",
      detail: "That is enough to see the next step, even if the month itself is tight.",
    });
  }

  const risks: CheckInRisk[] = plan.warnings.map((warning) => ({
    title: warning.title,
    detail: warning.detail,
    level: warning.level,
  }));
  if (input.profile.employerMatchAvailable && !input.profile.gettingFullEmployerMatch) {
    risks.push({
      title: "Employer pension match not fully taken",
      detail: "Raising the contribution to the matched level is usually worth more than any savings rate.",
      level: "warning",
    });
  }

  const upcoming = nextMilestone(milestones);
  const summaryBits = [headlineFor(name, standing).replace(/\.$/, "")];
  if (cashUp) summaryBits.push("cash is up on last month");
  if (upcoming && upcoming.pct < 100) summaryBits.push(`the next marker is ${upcoming.label}`);
  const summary =
    summaryBits.length > 1 ? `${summaryBits[0]}, and ${summaryBits.slice(1).join(", ")}.` : headlineFor(name, standing);

  return {
    standing,
    headline: headlineFor(name, standing),
    summary,
    changes,
    wins,
    risks,
    nextAction: pickAction({ plan, profile: input.profile, suggestions }),
    milestones,
    figures: {
      monthlySurplus: plan.metrics.monthlySurplus,
      cashSavings: plan.metrics.cashSavings,
      emergencyFundTarget: plan.metrics.emergencyFundTarget,
      starterBufferTarget: plan.metrics.starterBufferTarget,
      totalDebt: plan.metrics.totalDebt,
      freeableMonthly: freed,
    },
  };
}

export function personaProfile(id: string): Profile {
  const persona = PERSONAS.find((item) => item.id === id);
  if (!persona) throw new Error(`Unknown persona ${id}`);
  return persona.profile;
}
