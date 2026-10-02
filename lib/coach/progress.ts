import { transactionsForProfile } from "@/data/transactions";
import { buildCheckIn, type CheckIn } from "@/lib/checkin/build";
import { buildNudges, type Nudge } from "@/lib/checkin/nudges";
import { buildPlan } from "@/lib/finance/ladder";
import type { Milestone } from "@/lib/goals/milestones";
import type { Goal } from "@/lib/goals/model";
import type { HistorySnapshot } from "@/lib/history";
import type { Profile } from "@/lib/profile";
import { reviewSpending, suggestSpendingChanges } from "@/lib/spending/insights";
import type { Transaction } from "@/lib/spending/model";

export type CoachProgress = {
  checkin: CheckIn;
  milestones: Milestone[];
  nudges: Nudge[];
};

/** Shared Coach snapshot. Pages read this instead of recomputing check-in, milestones, or nudges. */
export function buildCoachProgress(input: {
  profile: Profile;
  goals?: Goal[];
  history?: HistorySnapshot[];
  transactions?: Transaction[];
  today?: Date;
}): CoachProgress {
  const transactions = input.transactions ?? transactionsForProfile(input.profile);
  const plan = buildPlan(input.profile);
  const suggestions = suggestSpendingChanges(input.profile, transactions);
  const checkin = buildCheckIn({
    profile: input.profile,
    goals: input.goals,
    history: input.history,
    transactions,
    today: input.today,
  });
  const nudges = buildNudges({
    plan,
    review: reviewSpending(transactions),
    suggestions,
  });
  return {
    checkin,
    milestones: checkin.milestones,
    nudges,
  };
}
