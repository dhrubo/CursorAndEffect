import { DEMO_TODAY, SAVER_PERSONAS } from "@/data/saver-personas";
import type { Debt } from "@/lib/profile";
import type { Account, PlanEvent, SaverState } from "@/lib/saver/schema";
import { eventsFromGoals, extractGoals, type Extraction } from "./extract-goals";

export type Connections = {
  banking: boolean;
  investments: boolean;
  other: boolean;
};

export const CREDIT_CARD: Debt = {
  id: "credit-card",
  name: "Credit card",
  type: "credit_card",
  balance: 1180,
  apr: 19.9,
  minPayment: 45,
};

export const CALENDAR_EVENTS: PlanEvent[] = [
  { id: "car-insurance", name: "Car insurance renewal", date: "2026-12-01", cost: 540 },
  { id: "home-insurance", name: "Home insurance renewal", date: "2027-01-12", cost: 420 },
  { id: "flight-balance", name: "Flight balance", date: "2027-01-20", cost: 900 },
];

const EXTRA_INVESTMENTS: Account[] = [
  { id: "invest", provider: "Hearth", name: "Investment account", balance: 2100, kind: "stocks_isa", connected: true },
  { id: "pension", provider: "Northwind", name: "Workplace pension", balance: 6400, kind: "pension", connected: true },
];

const RICH_INVESTMENTS: Account[] = [
  { id: "isa", provider: "Northwind", name: "Cash ISA", balance: 8400, aer: 4.1, kind: "cash_isa", connected: true },
  { id: "invest", provider: "Hearth", name: "Investment account", balance: 6200, kind: "stocks_isa", connected: true },
  { id: "pension", provider: "Northwind", name: "Workplace pension", balance: 18400, kind: "pension", connected: true },
];

export function buildPlanState(input: {
  transcript: string;
  connections: Connections;
  today?: string;
}): SaverState {
  const today = input.today ?? DEMO_TODAY;
  const extraction = extractGoals(input.transcript, today);
  return extraction.thin ? fromDemo(extraction, input.connections) : fromConversation(extraction, input.connections, today);
}

export function sourceFindings(transcript: string, source: keyof Connections): string[] {
  if (source === "other") {
    return [
      "Email: a renewal quote is waiting in your inbox.",
      ...CALENDAR_EVENTS.map((event) => `Calendar: ${event.name}`),
    ];
  }
  const state = buildPlanState({
    transcript,
    connections: { banking: source === "banking", investments: source === "investments", other: false },
  });
  const kinds = source === "banking" ? ["current", "easy_access"] : ["cash_isa", "lisa", "stocks_isa", "pension"];
  const lines = state.accounts
    .filter((account) => kinds.includes(account.kind))
    .map((account) => `${account.name} · £${account.balance.toLocaleString("en-GB")}`);
  if (source === "banking") {
    for (const debt of state.profile.debts) lines.push(`${debt.name} · £${debt.balance.toLocaleString("en-GB")}`);
  }
  return lines;
}

function fromDemo(extraction: Extraction, connections: Connections): SaverState {
  const state = structuredClone(SAVER_PERSONAS[0].state);
  state.profile = {
    ...state.profile,
    name: extraction.name,
    debts: connections.banking ? [CREDIT_CARD] : state.profile.debts,
  };
  if (connections.investments) {
    for (const account of EXTRA_INVESTMENTS) {
      if (!state.accounts.some((item) => item.id === account.id)) state.accounts.push(account);
    }
  }
  state.preferences = {
    ...state.preferences,
    connections: {
      bank: connections.banking,
      email: connections.other,
      social: false,
    },
    signals: connections.other
      ? ["A renewal quote is sitting in your inbox."]
      : state.preferences.signals,
  };
  state.planEvents = withCalendar(eventsFromGoals(state.goals), connections.other);
  return state;
}

function fromConversation(extraction: Extraction, connections: Connections, today: string): SaverState {
  const demo = SAVER_PERSONAS[0].state;
  const home = extraction.goals.find((goal) => goal.category === "home");
  const accounts: Account[] = [];
  const saved = extraction.goals.reduce((total, goal) => total + goal.savedSoFar, 0);
  const debt = connections.banking ? CREDIT_CARD.balance : 0;
  if (connections.banking) {
    accounts.push({
      id: "current",
      provider: "Hearth",
      name: "Current account",
      balance: Math.max(0, 3000 - saved + debt),
      kind: "current",
      connected: true,
    });
    for (const goal of extraction.goals) {
      accounts.push({
        id: `pot-${goal.id}`,
        provider: "Northwind",
        name: goal.name,
        balance: goal.savedSoFar,
        aer: 4.1,
        kind: "easy_access",
        connected: true,
      });
    }
  }
  if (connections.investments) accounts.push(...RICH_INVESTMENTS);
  return {
    version: 2,
    today,
    profile: {
      ...demo.profile,
      name: extraction.name,
      age: 29,
      grossAnnualIncome: 64000,
      netMonthlyIncome: 4200,
      essentialMonthlySpend: 2400,
      cashSavings: extraction.goals.reduce((total, goal) => total + goal.savedSoFar, 0),
      idleCurrentAccountCash: connections.banking ? Math.max(0, 3000 - saved + debt) : 0,
      debts: connections.banking ? [CREDIT_CARD] : [],
      buyingHome: Boolean(home),
      firstTimeBuyer: Boolean(home),
      targetHomePrice: home ? 350000 : 0,
      nextAmount: 200,
    },
    goals: extraction.goals.map((goal, index) => ({
      id: goal.id,
      name: goal.name,
      category: goal.category,
      horizon: goal.horizon,
      targetAmount: goal.targetAmount,
      targetDate: goal.targetDate,
      savedSoFar: goal.savedSoFar,
      potAccountId: `pot-${goal.id}`,
      isPrimary: index === 0,
      whyItMatters: goal.whyItMatters,
      autoSave: goal.autoSave,
      roundUps: false,
      checkpointsCelebrated: [],
    })),
    accounts,
    transactions: [],
    preferences: {
      ...demo.preferences,
      connections: { bank: connections.banking, email: connections.other, social: false },
      signals: connections.other ? ["A renewal quote is sitting in your inbox."] : [],
    },
    coachEvents: [],
    planEvents: withCalendar(extraction.events, connections.other),
  };
}

function withCalendar(events: PlanEvent[], includeCalendar: boolean): PlanEvent[] {
  const combined = includeCalendar ? [...events, ...CALENDAR_EVENTS] : events;
  return combined.sort((a, b) => a.date.localeCompare(b.date));
}
