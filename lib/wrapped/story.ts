import { transactionsForProfile } from "@/data/transactions";
import { buildCheckIn } from "@/lib/checkin/build";
import { compareDebtStrategies, repayableDebts } from "@/lib/finance/debt";
import { gbp, months } from "@/lib/format";
import { nextMilestone, type Milestone } from "@/lib/goals/milestones";
import type { Goal } from "@/lib/goals/model";
import type { HistorySnapshot } from "@/lib/history";
import type { Profile } from "@/lib/profile";
import { reviewSpending } from "@/lib/spending/insights";
import { formatUkDate } from "@/lib/dates";

export type WrappedBeat = {
  id: "saved" | "best-month" | "shift" | "milestones" | "debt" | "next";
  kicker: string;
  title: string;
  figure: string;
  body: string;
};

export type WrappedStory = {
  beats: WrappedBeat[];
  share: {
    name: string;
    saved: string;
    best: string;
    shift: string;
    milestones: string;
    debt: string;
    next: string;
  };
};

export function buildWrappedStory(input: {
  profile: Profile;
  goals?: Goal[];
  history?: HistorySnapshot[];
  today?: Date;
}): WrappedStory {
  const today = input.today ?? new Date();
  const transactions = transactionsForProfile(input.profile);
  const checkin = buildCheckIn({
    profile: input.profile,
    goals: input.goals,
    history: input.history,
    transactions,
    today,
  });
  const review = reviewSpending(transactions);
  const milestones = checkin.milestones;
  const spent = review.months.reduce((sum, month) => sum + month.total, 0);
  const lightest = [...review.months].sort((a, b) => a.discretionary - b.discretionary)[0];
  const shift = review.topMovers[0];
  const crossed = milestones.filter((milestone) => milestone.pct >= 100);
  const upcoming = nextMilestone(milestones);
  const name = input.profile.name.trim() || "You";

  const savedBeat: WrappedBeat = {
    id: "saved",
    kicker: "Six months, one picture",
    title: `${gbp(checkin.figures.cashSavings)} in cash`,
    figure: gbp(checkin.figures.cashSavings),
    body: `Across ${review.months.length} months the feed shows ${gbp(spent)} going out. Spare cash after essentials and minimums is ${gbp(checkin.figures.monthlySurplus)} a month.`,
  };

  const bestBeat: WrappedBeat = {
    id: "best-month",
    kicker: "Best month",
    title: lightest ? `${formatMonth(lightest.month)} was the lightest` : "No months in the feed yet",
    figure: lightest ? gbp(lightest.discretionary) : gbp(0),
    body: lightest
      ? `Discretionary spending (eating out, subscriptions and shopping) was ${gbp(lightest.discretionary)} that month, the lowest of the six.`
      : "Add a household and the feed will pick a best month.",
  };

  const shiftBeat: WrappedBeat = {
    id: "shift",
    kicker: "Biggest category shift",
    title: shift ? `${shift.label} moved the most` : "Spending held steady",
    figure: shift ? `${shift.delta > 0 ? "+" : ""}${gbp(shift.delta)}` : gbp(0),
    body: shift
      ? `${shift.label} went from ${gbp(shift.previous)} to ${gbp(shift.current)} between ${review.previousMonth ?? "the earlier month"} and ${review.latestMonth}.`
      : "There isn't a category move large enough to call out.",
  };

  const milestoneBeat = milestoneBeatFor(crossed, upcoming);
  const debtBeat = debtBeatFor(input.profile, milestones);
  const nextBeat: WrappedBeat = {
    id: "next",
    kicker: "What is next",
    title: checkin.nextAction.title,
    figure: checkin.headline,
    body: `${checkin.nextAction.detail} This is guidance, not regulated advice.`,
  };

  const beats = [savedBeat, bestBeat, shiftBeat, milestoneBeat, debtBeat, nextBeat];
  return {
    beats,
    share: {
      name,
      saved: savedBeat.figure,
      best: bestBeat.title,
      shift: shiftBeat.title,
      milestones: milestoneBeat.figure,
      debt: debtBeat.figure,
      next: checkin.nextAction.title,
    },
  };
}

function milestoneBeatFor(crossed: Milestone[], upcoming: Milestone | undefined): WrappedBeat {
  if (crossed.length === 0) {
    return {
      id: "milestones",
      kicker: "Milestones",
      title: upcoming ? `${upcoming.label} is next` : "No markers yet",
      figure: upcoming ? `${upcoming.pct}%` : "0",
      body: upcoming
        ? `${gbp(upcoming.current)} of ${gbp(upcoming.target)} so far${upcoming.projectedDate ? `, around ${formatUkDate(upcoming.projectedDate)} at the current pace` : ""}.`
        : "Markers appear from the plan as soon as there is a profile.",
    };
  }
  return {
    id: "milestones",
    kicker: "Milestones crossed",
    title: crossed.length === 1 ? crossed[0].label : `${crossed.length} markers reached`,
    figure: String(crossed.length),
    body: crossed.map((milestone) => milestone.label).join(", ") + ".",
  };
}

function debtBeatFor(profile: Profile, milestones: Milestone[]): WrappedBeat {
  const debts = repayableDebts(profile.debts);
  if (debts.length === 0) {
    return {
      id: "debt",
      kicker: "Debt",
      title: "No repayable debts on the plan",
      figure: gbp(0),
      body: "Student loans are left out. There is nothing else to clear on this profile.",
    };
  }
  const comparison = compareDebtStrategies(profile);
  const chosen = comparison[comparison.recommended];
  const marker = milestones.find((milestone) => milestone.id === "debt-free");
  const strategy = comparison.recommended === "avalanche" ? "Avalanche" : "Snowball";
  return {
    id: "debt",
    kicker: "Debt progress",
    title: chosen.feasible ? `${months(chosen.months)} to debt-free` : "Debts need a higher payment",
    figure: gbp(comparison.totalDebt),
    body: chosen.feasible
      ? `${gbp(comparison.totalDebt)} left. ${strategy} is the calculated order and clears it in ${months(chosen.months)}${marker?.projectedDate ? `, around ${formatUkDate(marker.projectedDate)}` : ""}.`
      : "At the current spare cash, interest outpaces the repayments. Free debt advice is the next step.",
  };
}

function formatMonth(month: string): string {
  return formatUkDate(`${month}-01`).replace(/^\d+\s/, "");
}
