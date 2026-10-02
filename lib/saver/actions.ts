import { addDays } from "@/lib/saver/dates";
import { evaluateCoach } from "@/lib/coach/rules";
import { replan } from "@/lib/timeline/eta";
import type { CoachEvent, Goal, SaverState, Transaction } from "./schema";

export type DemoAction =
  | "night-out"
  | "coffee"
  | "payday"
  | "skip-save"
  | "forward-week"
  | "jump-75"
  | "idle-cash";

export function withFreshCoach(state: SaverState): SaverState {
  const fresh = evaluateCoach(state);
  if (fresh.length === 0) return state;
  return { ...state, coachEvents: [...fresh, ...state.coachEvents].slice(0, 40) };
}

export function applyDemoAction(state: SaverState, action: DemoAction): SaverState {
  switch (action) {
    case "night-out":
      return withFreshCoach(addSpend(state, 46, "The Old Crown", "nights_out"));
    case "coffee":
      return withFreshCoach(addSpend(state, 3.4, "Monmouth", "eating_out"));
    case "payday":
      return withFreshCoach(applyPayday(state));
    case "skip-save":
      return withFreshCoach({
        ...state,
        preferences: { ...state.preferences, autosaveMissed: true },
      });
    case "forward-week":
      return withFreshCoach(forwardWeek(state));
    case "jump-75":
      return jumpPrimary(state, 0.75);
    case "idle-cash":
      return withFreshCoach(addToCurrent(state, 600));
    default:
      return state;
  }
}

export function applyCoachChoice(
  state: SaverState,
  eventId: string,
  choice: CoachEvent["status"] | "replan-date" | "replan-amount" | "move-twenty",
): SaverState {
  const event = state.coachEvents.find((item) => item.id === eventId);
  if (!event) return state;
  const goal = state.goals.find((item) => item.id === event.goalId);

  if (choice === "kept" && event.transactionId) {
    return mark(removeTransaction(state, event.transactionId), eventId, "kept");
  }
  if (choice === "spent") return mark(state, eventId, "spent");
  if (choice === "dismissed") return mark(state, eventId, "dismissed");
  if ((choice === "moved" || choice === "move-twenty") && goal) {
    const moved = Math.min(20, event.kind === "idle" ? event.amount : event.amount);
    return mark(moveToGoal(state, goal, choice === "move-twenty" ? 20 : moved), eventId, "moved");
  }
  if (choice === "replan-date" && goal) {
    const next = replan(goal, state.today, "amount");
    return mark(updateGoal(clearMiss(state), goal.id, { targetDate: next.targetDate }), eventId, "moved");
  }
  if (choice === "replan-amount" && goal) {
    const next = replan(goal, state.today, "date");
    return mark(
      updateGoal(clearMiss(state), goal.id, { autoSave: { ...goal.autoSave, amount: next.weeklyAmount, cadence: "weekly", enabled: true } }),
      eventId,
      "kept",
    );
  }
  return state;
}

export function moveToGoal(state: SaverState, goal: Goal, amount: number): SaverState {
  const moved = Math.max(0, Math.round(amount));
  if (moved <= 0) return state;
  const current = state.accounts.find((account) => account.kind === "current");
  return {
    ...state,
    goals: state.goals.map((item) =>
      item.id === goal.id ? { ...item, savedSoFar: roundPence(item.savedSoFar + moved) } : item,
    ),
    accounts: state.accounts.map((account) => {
      if (account.id === goal.potAccountId) return { ...account, balance: roundPence(account.balance + moved) };
      if (current && account.id === current.id) return { ...account, balance: Math.max(0, roundPence(account.balance - moved)) };
      return account;
    }),
  };
}

export function celebrateCheckpoint(state: SaverState, goalId: string, pct: number): SaverState {
  return {
    ...state,
    goals: state.goals.map((goal) =>
      goal.id === goalId && !goal.checkpointsCelebrated.includes(pct)
        ? { ...goal, checkpointsCelebrated: [...goal.checkpointsCelebrated, pct] }
        : goal,
    ),
  };
}

function addSpend(state: SaverState, amount: number, merchant: string, category: Transaction["category"]): SaverState {
  const current = state.accounts.find((account) => account.kind === "current");
  if (!current) return state;
  const txn: Transaction = {
    id: `txn-${state.today}-${merchant}-${amount}`,
    accountId: current.id,
    date: state.today,
    merchant,
    amount: -Math.abs(amount),
    category,
    recurring: false,
  };
  return {
    ...state,
    transactions: [txn, ...state.transactions].slice(0, 400),
    accounts: state.accounts.map((account) =>
      account.id === current.id ? { ...account, balance: Math.max(0, roundPence(account.balance - Math.abs(amount))) } : account,
    ),
  };
}

function addToCurrent(state: SaverState, amount: number): SaverState {
  const current = state.accounts.find((account) => account.kind === "current");
  if (!current) return state;
  return {
    ...state,
    accounts: state.accounts.map((account) =>
      account.id === current.id ? { ...account, balance: roundPence(account.balance + amount) } : account,
    ),
  };
}

function applyPayday(state: SaverState): SaverState {
  const current = state.accounts.find((account) => account.kind === "current");
  if (!current) return state;
  const salary: Transaction = {
    id: `salary-${state.today}`,
    accountId: current.id,
    date: state.today,
    merchant: "Salary",
    amount: state.profile.netMonthlyIncome,
    category: "income",
    recurring: true,
  };
  let next: SaverState = {
    ...state,
    preferences: { ...state.preferences, autosaveMissed: false },
    transactions: [salary, ...state.transactions].slice(0, 400),
    accounts: state.accounts.map((account) =>
      account.id === current.id ? { ...account, balance: roundPence(account.balance + state.profile.netMonthlyIncome) } : account,
    ),
  };
  for (const goal of next.goals) {
    if (!goal.autoSave.enabled) continue;
    const amount = goal.autoSave.cadence === "payday" ? goal.autoSave.amount : goal.autoSave.amount * 4;
    next = moveToGoal(next, goal, amount);
  }
  return next;
}

function forwardWeek(state: SaverState): SaverState {
  let next: SaverState = { ...state, today: addDays(state.today, 7) };
  if (!next.preferences.autosaveMissed) {
    for (const goal of next.goals) {
      if (goal.autoSave.enabled && goal.autoSave.cadence === "weekly") {
        next = moveToGoal(next, goal, goal.autoSave.amount);
      }
    }
  }
  return next;
}

function jumpPrimary(state: SaverState, fraction: number): SaverState {
  const goal = state.goals.find((item) => item.isPrimary) ?? state.goals[0];
  if (!goal) return state;
  const target = roundPence(goal.targetAmount * fraction);
  const delta = target - goal.savedSoFar;
  if (delta <= 0) return { ...state, goals: state.goals.map((item) => (item.id === goal.id ? { ...item, savedSoFar: target } : item)) };
  return moveToGoal(state, goal, delta);
}

function removeTransaction(state: SaverState, transactionId: string): SaverState {
  const txn = state.transactions.find((item) => item.id === transactionId);
  if (!txn) return state;
  return {
    ...state,
    transactions: state.transactions.filter((item) => item.id !== transactionId),
    accounts: state.accounts.map((account) =>
      account.id === txn.accountId ? { ...account, balance: roundPence(account.balance - txn.amount) } : account,
    ),
  };
}

function updateGoal(state: SaverState, goalId: string, patch: Partial<Goal>): SaverState {
  return { ...state, goals: state.goals.map((goal) => (goal.id === goalId ? { ...goal, ...patch } : goal)) };
}

function clearMiss(state: SaverState): SaverState {
  return { ...state, preferences: { ...state.preferences, autosaveMissed: false } };
}

function mark(state: SaverState, eventId: string, status: CoachEvent["status"]): SaverState {
  return {
    ...state,
    coachEvents: state.coachEvents.map((event) => (event.id === eventId ? { ...event, status } : event)),
  };
}

function roundPence(n: number): number {
  return Math.round(n * 100) / 100;
}
