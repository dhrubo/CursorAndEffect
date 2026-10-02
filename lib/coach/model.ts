import { bestProduct } from "@/lib/finance/savings";

export const COACH_TODAY = "2026-10-02";

const BANNED = [/\bfailed\b/i, /\bbad\b/i, /\bimpulsive\b/i, /\bregret\b/i, /\bdon't\b/i, /\bshould have\b/i];

export type Spend = {
  id: string;
  label: string;
  amount: number;
};

export type Week = {
  name: string;
  today: string;
  goalName: string;
  targetAmount: number;
  savedSoFar: number;
  weeklyAutoSave: number;
  /** Money left for plans this pay cycle, after essentials and the auto-save. */
  leftForPlans: number;
  spends: Spend[];
  idleCash: number;
  /** Extra spend already moved back to the goal. */
  recovered: number;
};

export type Suggestion = {
  id: string;
  lane: "save" | "utilise";
  title: string;
  detail: string;
  amount: number;
  days: number;
};

export type CoachLane = {
  title: string;
  body: string;
  active: boolean;
  suggestions: Suggestion[];
};

export type CoachView = {
  name: string;
  goalName: string;
  amountLeft: number;
  onTrackDate: string;
  divertedDate: string;
  soonerDate: string;
  extraAmount: number;
  leftoverAmount: number;
  idleCash: number;
  delayDays: number;
  soonerDays: number;
  nextCheckpoint: number;
  monitor: CoachLane;
  save: CoachLane;
  utilise: CoachLane;
};

export function dailyRate(weeklyAutoSave: number): number {
  return (weeklyAutoSave * 52) / 365;
}

export function daysFor(weeklyAutoSave: number, amount: number): number {
  if (amount <= 0 || weeklyAutoSave <= 0) return 0;
  return Math.ceil(amount / dailyRate(weeklyAutoSave));
}

export function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function formatDay(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

export function gbpExact(amount: number): string {
  const pence = Math.round(amount * 100) % 100 !== 0;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: pence ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function bannedWord(text: string): string | null {
  for (const pattern of BANNED) {
    const match = text.match(pattern);
    if (match) return match[0];
  }
  return null;
}

export function baseWeek(name = "Alex"): Week {
  return {
    name,
    today: COACH_TODAY,
    goalName: "Bali",
    targetAmount: 1800,
    savedSoFar: 1450,
    weeklyAutoSave: 45,
    leftForPlans: 80,
    spends: [],
    idleCash: 0,
    recovered: 0,
  };
}

export function nightOutWeek(name = "Alex"): Week {
  return {
    ...baseWeek(name),
    spends: [{ id: "night", label: "Night out", amount: 46 }],
  };
}

export function coffeeWeek(name = "Alex"): Week {
  return {
    ...baseWeek(name),
    spends: [{ id: "coffee", label: "Coffee", amount: 3.4 }],
  };
}

export function quietWeek(name = "Alex"): Week {
  return baseWeek(name);
}

export function idleCashWeek(name = "Alex"): Week {
  return { ...baseWeek(name), idleCash: 600 };
}

function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function spendPhrase(spends: Spend[]): string {
  if (spends.length === 0) return "";
  const bits = spends.map((spend) => `${gbpExact(spend.amount)} on a ${spend.label.toLowerCase()}`);
  if (bits.length === 1) return bits[0];
  return `${bits.slice(0, -1).join(", ")} and ${bits[bits.length - 1]}`;
}

function potRate(): string {
  const product = bestProduct(["easy_access"], { instantOnly: true });
  return `${product.aer}%`;
}

export function buildCoach(week: Week): CoachView {
  const spent = week.spends.reduce((sum, spend) => sum + spend.amount, 0);
  const extraAmount = roundMoney(Math.max(0, spent - week.recovered));
  const leftoverAmount = roundMoney(Math.max(0, week.leftForPlans - spent));
  const amountLeft = roundMoney(Math.max(0, week.targetAmount - week.savedSoFar));
  const onTrackDays = daysFor(week.weeklyAutoSave, amountLeft);
  const delayDays = daysFor(week.weeklyAutoSave, extraAmount);
  const soonerDays = daysFor(week.weeklyAutoSave, leftoverAmount);
  const onTrackDate = addDays(week.today, onTrackDays);
  const divertedDate = addDays(onTrackDate, delayDays);
  const soonerDate = addDays(onTrackDate, -soonerDays);
  const onTrackLabel = formatDay(onTrackDate);
  const divertedLabel = formatDay(divertedDate);
  const soonerLabel = formatDay(soonerDate);
  const phrase = spendPhrase(week.spends);

  const monitor: CoachLane = {
    title: "Pro-active monitor",
    active: extraAmount > 0,
    suggestions: [],
    body:
      extraAmount > 0
        ? `Coach sees you have spent an extra bit of money. ${phrase} puts ${week.goalName} on ${divertedLabel} instead of ${onTrackLabel}.`
        : `Nothing extra so far. ${week.goalName} is still on ${onTrackLabel}. ${gbpExact(week.weeklyAutoSave)} gets you to the next checkpoint.`,
  };

  const saveSuggestions = saveOptions(week, extraAmount, onTrackLabel);
  const save: CoachLane = {
    title: "If you have spent more money I suggest ways to save it",
    active: extraAmount > 0,
    suggestions: saveSuggestions,
    body:
      extraAmount > 0
        ? `That extra ${gbpExact(extraAmount)} can come back to ${week.goalName}. A small swap, or moving some of it now, pulls ${divertedLabel} back toward ${onTrackLabel}.`
        : "No extra spend to unwind this week.",
  };

  const utiliseSuggestions = utiliseOptions(week, leftoverAmount, soonerDays, soonerLabel);
  const utilise: CoachLane = {
    title: "If you have any left I show ways we can utilise it",
    active: leftoverAmount > 0 || week.idleCash > 0,
    suggestions: utiliseSuggestions,
    body:
      leftoverAmount > 0
        ? `${gbpExact(leftoverAmount)} is still left for your plans. Move it to ${week.goalName} and arrive ${dayWord(soonerDays)} earlier, on ${soonerLabel}.`
        : week.idleCash > 0
          ? `${gbpExact(week.idleCash)} is sitting in your current account. It can work for ${week.goalName} instead.`
          : "Nothing left in this pay cycle to move.",
  };

  return {
    name: week.name,
    goalName: week.goalName,
    amountLeft,
    onTrackDate,
    divertedDate,
    soonerDate,
    extraAmount,
    leftoverAmount,
    idleCash: week.idleCash,
    delayDays,
    soonerDays,
    nextCheckpoint: week.weeklyAutoSave,
    monitor,
    save,
    utilise,
  };
}

function dayWord(days: number): string {
  return days === 1 ? "1 day" : `${days} days`;
}

function saveOptions(week: Week, extraAmount: number, onTrackLabel: string): Suggestion[] {
  if (extraAmount <= 0) return [];
  const candidates = [
    {
      id: "put-toward",
      title: `Put ${gbpExact(Math.min(20, extraAmount))} to ${week.goalName}`,
      amount: Math.min(20, extraAmount),
      detail: `Straight into the pot, back toward ${onTrackLabel}.`,
    },
    {
      id: "cook-in",
      title: "Cook in on Saturday",
      amount: 15,
      detail: "A cook-in instead of a takeaway, and the difference goes to the plan.",
    },
    {
      id: "skip-ride",
      title: "Skip one ride home",
      amount: 9,
      detail: "One less ride home. The fare stays with the plan.",
    },
  ];

  return candidates
    .filter((item) => item.amount > 0 && item.amount <= extraAmount + 0.001)
    .map((item) => {
      const days = daysFor(week.weeklyAutoSave, item.amount);
      return {
        id: item.id,
        lane: "save" as const,
        title: item.title,
        detail: `${item.detail} That is ${dayWord(days)} closer.`,
        amount: roundMoney(item.amount),
        days,
      };
    });
}

function utiliseOptions(
  week: Week,
  leftoverAmount: number,
  soonerDays: number,
  soonerLabel: string,
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  if (leftoverAmount >= 1) {
    suggestions.push({
      id: "move-leftover",
      lane: "utilise",
      title: `Move ${gbpExact(leftoverAmount)} to ${week.goalName}`,
      detail: `Arrives ${dayWord(soonerDays)} earlier, on ${soonerLabel}.`,
      amount: leftoverAmount,
      days: soonerDays,
    });
  }
  if (week.idleCash >= 50) {
    const days = daysFor(week.weeklyAutoSave, week.idleCash);
    suggestions.push({
      id: "move-idle",
      lane: "utilise",
      title: `Move ${gbpExact(week.idleCash)} from your current account`,
      detail: `It earns nothing there. An illustrative easy-access pot pays ${potRate()}, and ${week.goalName} moves ${dayWord(days)} earlier.`,
      amount: week.idleCash,
      days,
    });
  }
  return suggestions;
}

export function coachCopy(view: CoachView): string[] {
  return [
    view.monitor.title,
    view.monitor.body,
    view.save.title,
    view.save.body,
    view.utilise.title,
    view.utilise.body,
    ...view.save.suggestions.flatMap((item) => [item.title, item.detail]),
    ...view.utilise.suggestions.flatMap((item) => [item.title, item.detail]),
  ];
}

export function applySuggestion(week: Week, id: string): Week {
  const view = buildCoach(week);
  const suggestion = [...view.save.suggestions, ...view.utilise.suggestions].find((item) => item.id === id);
  if (!suggestion) return week;
  if (suggestion.lane === "save") {
    return {
      ...week,
      savedSoFar: roundMoney(week.savedSoFar + suggestion.amount),
      recovered: roundMoney(week.recovered + suggestion.amount),
    };
  }
  if (suggestion.id === "move-idle") {
    return {
      ...week,
      savedSoFar: roundMoney(week.savedSoFar + week.idleCash),
      idleCash: 0,
    };
  }
  return {
    ...week,
    savedSoFar: roundMoney(week.savedSoFar + suggestion.amount),
    leftForPlans: roundMoney(week.leftForPlans - suggestion.amount),
  };
}
