import { daysBetween } from "@/lib/saver/dates";
import { monthlySurplus, totalMinPayments } from "@/lib/profile";
import { projectGoal } from "@/lib/timeline/eta";
import type { Account, Goal, PlanEvent, SaverState } from "@/lib/saver/schema";

export type GoalStatus = "On track" | "Needs attention" | "Ahead of plan";

export type Position = {
  cash: number;
  savings: number;
  investments: number;
  pension: number;
  debts: number;
  income: number;
  spending: number;
  surplus: number;
  netWorth: number;
  savingsAndInvestments: number;
};

const SOON_DAYS = 122;
const LARGE_COST = 400;

export function goalStatus(goal: Goal, today: string): GoalStatus {
  if (goal.savedSoFar >= goal.targetAmount) return "Ahead of plan";
  const projection = projectGoal(goal, { today });
  if (!projection.etaDate) return "Needs attention";
  const delta = daysBetween(goal.targetDate, projection.etaDate);
  if (delta < -30) return "Ahead of plan";
  if (delta > 30) return "Needs attention";
  return "On track";
}

export function financialPosition(state: SaverState): Position {
  const cash = sumKind(state.accounts, ["current"]);
  const savings = sumKind(state.accounts, ["easy_access", "cash_isa", "lisa"]);
  const investments = sumKind(state.accounts, ["stocks_isa"]);
  const pension = sumKind(state.accounts, ["pension"]);
  const debts =
    state.profile.debts.reduce((total, debt) => total + debt.balance, 0) + (state.profile.mortgage?.balance ?? 0);
  const income = state.profile.netMonthlyIncome;
  const spending = state.profile.essentialMonthlySpend + totalMinPayments(state.profile);
  const surplus = monthlySurplus(state.profile);
  const savingsAndInvestments = savings + investments;
  return {
    cash,
    savings,
    investments,
    pension,
    debts,
    income,
    spending,
    surplus,
    netWorth: cash + savings + investments + pension - debts,
    savingsAndInvestments,
  };
}

export function planInsights(state: SaverState): string[] {
  const notes: string[] = [];
  const ranked = [...state.goals].sort((a, b) => Number(b.category === "home") - Number(a.category === "home"));
  const behind = ranked.find((goal) => goalStatus(goal, state.today) === "Needs attention");
  const steady = state.goals.find((goal) => goalStatus(goal, state.today) === "On track");
  if (behind) notes.push(`Your ${behind.name} is currently slightly behind your target.`);
  const soon = upcomingEvents(state).filter(
    (event) => event.cost >= LARGE_COST && daysBetween(state.today, event.date) >= 0 && daysBetween(state.today, event.date) <= SOON_DAYS,
  );
  if (soon.length >= 3) {
    notes.push(`You have ${soon.length} large expenses occurring within four months.`);
  }
  if (behind) {
    notes.push(`Increasing your monthly contribution by £200 would improve your ${behind.name} trajectory.`);
  }
  if (steady) notes.push(`Your ${steady.name} is currently on track.`);
  return notes.slice(0, 4);
}

export function upcomingEvents(state: SaverState): PlanEvent[] {
  return [...(state.planEvents ?? [])].sort((a, b) => a.date.localeCompare(b.date));
}

export function onTrackCount(state: SaverState): number {
  return state.goals.filter((goal) => goalStatus(goal, state.today) !== "Needs attention").length;
}

function sumKind(accounts: Account[], kinds: Account["kind"][]): number {
  return accounts.filter((account) => kinds.includes(account.kind)).reduce((total, account) => total + account.balance, 0);
}
