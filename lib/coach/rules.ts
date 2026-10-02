import { divertImpact, projectGoal } from "@/lib/timeline/eta";
import { isDiscretionary, payCycleStack } from "@/lib/timeline/budget";
import type { CoachEvent, Goal, SaverState } from "@/lib/saver/schema";

export function primaryGoal(state: SaverState): Goal | undefined {
  return state.goals.find((goal) => goal.isPrimary) ?? state.goals[0];
}

export function evaluateCoach(state: SaverState): CoachEvent[] {
  const goal = primaryGoal(state);
  if (!goal) return [];
  const fresh: CoachEvent[] = [];
  const known = new Set(state.coachEvents.map((event) => event.id));

  const spend = newestMeaningfulSpend(state, goal);
  if (spend && !known.has(spend.id) && !slipAlreadyToday(state)) fresh.push(spend);

  const idle = idleEvent(state, goal);
  if (idle && !known.has(idle.id)) fresh.push(idle);

  const missed = replanEvent(state, goal);
  if (missed && !known.has(missed.id)) fresh.push(missed);

  return fresh;
}

function newestMeaningfulSpend(state: SaverState, goal: Goal): CoachEvent | null {
  const currentIds = new Set(state.accounts.filter((account) => account.kind === "current").map((account) => account.id));
  const candidates = state.transactions
    .filter(
      (txn) =>
        txn.date === state.today &&
        txn.amount < 0 &&
        currentIds.has(txn.accountId) &&
        isDiscretionary(txn.category),
    )
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
  const txn = candidates[0];
  if (!txn) return null;

  const impact = divertImpact(goal, Math.abs(txn.amount), { today: state.today });
  const daysLeft = projectGoal(goal, { today: state.today }).daysLeft ?? 0;
  const threshold = Math.max(state.preferences.alertThresholdDays, Math.ceil(daysLeft * 0.02));
  if (impact.deltaDays < threshold) return null;

  const essentials = state.profile.essentialMonthlySpend;
  const current = state.accounts.find((account) => account.kind === "current");
  const emergency =
    (current?.balance ?? 0) < essentials / 4 ||
    (goal.category === "emergency" && goal.savedSoFar - Math.abs(txn.amount) < 0);

  let severity: CoachEvent["severity"] = "small";
  if (emergency) severity = "emergency";
  else if (impact.deltaDays > 7 || (daysLeft > 0 && impact.deltaDays > daysLeft * 0.1)) severity = "big";
  else if (impact.deltaDays < 3) return null;

  return {
    id: `spend-${txn.id}`,
    kind: "spend",
    severity,
    goalId: goal.id,
    amount: Math.abs(txn.amount),
    deltaDays: impact.deltaDays,
    merchant: txn.merchant,
    status: "new",
    createdAt: state.today,
    transactionId: txn.id,
  };
}

function idleEvent(state: SaverState, goal: Goal): CoachEvent | null {
  const current = state.accounts.find((account) => account.kind === "current");
  if (!current) return null;
  const cushion = 1000;
  const spare = current.balance - cushion;
  if (spare < 150) return null;
  return {
    id: `idle-${state.today}`,
    kind: "idle",
    severity: "protect",
    goalId: goal.id,
    amount: Math.round(spare),
    deltaDays: 0,
    status: "new",
    createdAt: state.today,
  };
}

function replanEvent(state: SaverState, goal: Goal): CoachEvent | null {
  if (!state.preferences.autosaveMissed) return null;
  return {
    id: `replan-${state.today}`,
    kind: "replan",
    severity: "small",
    goalId: goal.id,
    amount: goal.autoSave.amount,
    deltaDays: 7,
    status: "new",
    createdAt: state.today,
  };
}

function slipAlreadyToday(state: SaverState): boolean {
  return state.coachEvents.some(
    (event) =>
      event.createdAt === state.today &&
      event.kind === "spend" &&
      (event.severity === "small" || event.severity === "big" || event.severity === "emergency"),
  );
}

export function openCoachEvents(state: SaverState): CoachEvent[] {
  return state.coachEvents.filter((event) => event.status === "new").slice(0, 3);
}

export function spareSentence(state: SaverState): number {
  return payCycleStack(state).leftForGoals;
}
