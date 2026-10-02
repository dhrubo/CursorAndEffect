import { daysBetween } from "@/lib/saver/dates";
import { totalMinPayments } from "@/lib/profile";
import type { SaverState, Transaction } from "@/lib/saver/schema";
import { monthlyAutoSave } from "./eta";

const DISCRETIONARY = new Set<Transaction["category"]>([
  "eating_out",
  "nights_out",
  "shopping",
  "transport",
  "subscriptions",
  "other",
]);

export type PayCycle = {
  income: number;
  committed: number;
  spent: number;
  leftForGoals: number;
  since: string;
};

export function lastPayday(today: string, paydayDay: number): string {
  const [year, month, day] = today.split("-").map(Number);
  const inMonth = Math.min(paydayDay, day);
  if (day >= paydayDay) {
    return iso(year, month, inMonth);
  }
  const previous = new Date(Date.UTC(year, month - 2, 1));
  const y = previous.getUTCFullYear();
  const m = previous.getUTCMonth() + 1;
  return iso(y, m, Math.min(paydayDay, daysInMonth(y, m)));
}

export function payCycleStack(state: SaverState): PayCycle {
  const since = lastPayday(state.today, state.preferences.paydayDay);
  const currentIds = new Set(state.accounts.filter((a) => a.kind === "current").map((a) => a.id));
  const inCycle = state.transactions.filter(
    (txn) => currentIds.has(txn.accountId) && txn.date >= since && txn.date <= state.today,
  );
  const income = sum(inCycle.filter((txn) => txn.category === "income"));
  const billSpend = Math.abs(sum(inCycle.filter((txn) => txn.category === "bills" || txn.category === "groceries")));
  const autoSave = state.goals.reduce((total, goal) => total + monthlyAutoSave(goal), 0);
  const debt = totalMinPayments(state.profile);
  const committed = billSpend + autoSave + debt;
  const spent = Math.abs(sum(inCycle.filter((txn) => DISCRETIONARY.has(txn.category))));
  const baseIncome = income > 0 ? income : state.profile.netMonthlyIncome;
  return {
    income: roundPence(baseIncome),
    committed: roundPence(committed),
    spent: roundPence(spent),
    leftForGoals: roundPence(baseIncome - committed - spent),
    since,
  };
}

export function isDiscretionary(category: Transaction["category"]): boolean {
  return DISCRETIONARY.has(category);
}

export function daysIntoCycle(state: SaverState): number {
  return daysBetween(lastPayday(state.today, state.preferences.paydayDay), state.today);
}

function sum(txns: Transaction[]): number {
  return txns.reduce((total, txn) => total + txn.amount, 0);
}

function iso(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function roundPence(n: number): number {
  return Math.round(n * 100) / 100;
}
