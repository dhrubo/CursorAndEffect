import { SAVER_PERSONAS, DEMO_TODAY } from "@/data/saver-personas";
import { daysBetween } from "@/lib/saver/dates";
import type { Goal, PlanEvent } from "@/lib/saver/schema";

export type ExtractedGoal = {
  id: string;
  name: string;
  category: Goal["category"];
  horizon: Goal["horizon"];
  targetAmount: number;
  savedSoFar: number;
  targetDate: string;
  whyItMatters: string;
  autoSave: Goal["autoSave"];
};

export type Extraction = {
  name: string;
  goals: ExtractedGoal[];
  events: PlanEvent[];
  thin: boolean;
};

type CatalogItem = {
  id: string;
  name: string;
  category: Goal["category"];
  patterns: RegExp[];
  targetAmount: number;
  savedSoFar: number;
  targetDate: string;
  whyItMatters: string;
  autoSave: Goal["autoSave"];
};

const CATALOG: CatalogItem[] = [
  {
    id: "wedding",
    name: "Wedding",
    category: "event",
    patterns: [/\b(wedding|married|marriage)\b/i],
    targetAmount: 20000,
    savedSoFar: 8000,
    targetDate: "2028-08-01",
    whyItMatters: "A day with the people who matter, without starting in debt.",
    autoSave: { amount: 125, cadence: "weekly", enabled: true },
  },
  {
    id: "home",
    name: "House deposit",
    category: "home",
    patterns: [/\b(house|home|mortgage|deposit)\b/i],
    targetAmount: 75000,
    savedSoFar: 30000,
    targetDate: "2029-06-01",
    whyItMatters: "Somewhere that is ours.",
    autoSave: { amount: 200, cadence: "payday", enabled: true },
  },
  {
    id: "travel",
    name: "Travel",
    category: "trip",
    patterns: [/\b(travel|holiday|trip|bali|flight)\b/i],
    targetAmount: 6000,
    savedSoFar: 3000,
    targetDate: "2027-09-01",
    whyItMatters: "Time away that is already paid for.",
    autoSave: { amount: 60, cadence: "weekly", enabled: true },
  },
  {
    id: "family",
    name: "Starting a family",
    category: "family",
    patterns: [/\b(family|baby|babies|child|children)\b/i],
    targetAmount: 12000,
    savedSoFar: 2500,
    targetDate: "2028-06-01",
    whyItMatters: "Time off that does not turn into debt.",
    autoSave: { amount: 50, cadence: "weekly", enabled: true },
  },
  {
    id: "emergency",
    name: "Emergency savings",
    category: "emergency",
    patterns: [/\bemergency\b/i],
    targetAmount: 5000,
    savedSoFar: 1000,
    targetDate: "2027-06-01",
    whyItMatters: "A cushion so a surprise does not become credit.",
    autoSave: { amount: 40, cadence: "weekly", enabled: true },
  },
  {
    id: "debt",
    name: "Pay off debt",
    category: "other",
    patterns: [/\bdebt\b|\bpay(?:ing)? off\b/i],
    targetAmount: 4000,
    savedSoFar: 500,
    targetDate: "2027-12-01",
    whyItMatters: "Interest that stops compounding.",
    autoSave: { amount: 40, cadence: "weekly", enabled: true },
  },
  {
    id: "invest",
    name: "Investing",
    category: "other",
    patterns: [/\binvest/i],
    targetAmount: 10000,
    savedSoFar: 2000,
    targetDate: "2030-01-01",
    whyItMatters: "Money working past the next year.",
    autoSave: { amount: 100, cadence: "payday", enabled: true },
  },
  {
    id: "career",
    name: "Career change",
    category: "learning",
    patterns: [/\bcareer\b|\bcourse\b/i],
    targetAmount: 3000,
    savedSoFar: 400,
    targetDate: "2027-09-01",
    whyItMatters: "Room to change direction.",
    autoSave: { amount: 30, cadence: "weekly", enabled: true },
  },
  {
    id: "retire",
    name: "Retirement",
    category: "other",
    patterns: [/\bretir/i],
    targetAmount: 50000,
    savedSoFar: 8000,
    targetDate: "2046-01-01",
    whyItMatters: "A later life that is already started.",
    autoSave: { amount: 150, cadence: "payday", enabled: true },
  },
];

const MONTHS: Record<string, string> = {
  jan: "01",
  january: "01",
  feb: "02",
  february: "02",
  mar: "03",
  march: "03",
  apr: "04",
  april: "04",
  may: "05",
  jun: "06",
  june: "06",
  jul: "07",
  july: "07",
  aug: "08",
  august: "08",
  sep: "09",
  sept: "09",
  september: "09",
  oct: "10",
  october: "10",
  nov: "11",
  november: "11",
  dec: "12",
  december: "12",
};

const NAME_STOP = new Set(["hoping", "going", "trying", "looking", "planning", "saving", "not", "really", "just"]);

const EVENT_NAME: Partial<Record<Goal["category"], string>> = {
  home: "House deposit target",
  trip: "Holiday payment",
  event: "Wedding deposit",
  family: "Family costs",
  car: "Car purchase",
  emergency: "Emergency fund target",
  learning: "Course payment",
  other: "Planned cost",
};

export function eventsFromGoals(goals: Pick<Goal, "id" | "name" | "category" | "targetAmount" | "targetDate">[]): PlanEvent[] {
  return goals.map((goal) => ({
    id: `event-${goal.id}`,
    name: goal.category === "event" ? "Wedding deposit" : (EVENT_NAME[goal.category] ?? `${goal.name} target`),
    date: goal.targetDate,
    cost: goal.category === "event" ? Math.round(goal.targetAmount * 0.25) : goal.targetAmount,
    goalId: goal.id,
  }));
}

export function extractGoals(transcript: string, today = DEMO_TODAY): Extraction {
  const heardName = readName(transcript);
  const matched = matchGoals(transcript, today);
  if (matched.length < 2) {
    const demo = SAVER_PERSONAS[0].state;
    const goals = demo.goals.map(toExtracted);
    return {
      name: heardName ?? demo.profile.name,
      goals,
      events: eventsFromGoals(goals),
      thin: true,
    };
  }
  return {
    name: heardName ?? "Alex",
    goals: matched,
    events: eventsFromGoals(matched),
    thin: false,
  };
}

export function coachFollowUp(transcript: string): string {
  const extraction = extractGoals(transcript);
  const turns = transcript.split("\n").map((line) => line.trim()).filter(Boolean).length;
  if (/\b(that'?s (it|everything|all)|nothing else|i'?m done|no more|that is everything)\b/i.test(transcript)) {
    return "I have enough to sketch this. Let's check I heard you right.";
  }
  if (extraction.goals.length === 0 || extraction.thin) {
    return "Tell me another plan that sits beside that one. A date or a rough cost helps, but a name for it is enough.";
  }
  if (turns >= 3) {
    return "That's a clear set of plans. Add anything else, or say that's everything.";
  }
  const latest = extraction.goals[extraction.goals.length - 1];
  return `${latest.name} is on the list. What else are you aiming toward in that same stretch of time?`;
}

function matchGoals(transcript: string, today: string): ExtractedGoal[] {
  const found = new Map<string, string[]>();
  for (const sentence of sentences(transcript)) {
    const item = CATALOG.find((entry) => entry.patterns.some((pattern) => pattern.test(sentence)));
    if (!item) continue;
    const bucket = found.get(item.id) ?? [];
    bucket.push(sentence);
    found.set(item.id, bucket);
  }
  const goals: ExtractedGoal[] = [];
  for (const item of CATALOG) {
    const lines = found.get(item.id);
    if (!lines) continue;
    const text = lines.join(" ");
    const amounts = readAmounts(text);
    const targetAmount = amounts.target ?? item.targetAmount;
    const savedSoFar = Math.min(amounts.saved ?? item.savedSoFar, targetAmount);
    const targetDate = readDate(text) ?? item.targetDate;
    goals.push({
      id: item.id,
      name: item.name,
      category: item.category,
      horizon: horizonFor(today, targetDate),
      targetAmount,
      savedSoFar,
      targetDate,
      whyItMatters: item.whyItMatters,
      autoSave: item.autoSave,
    });
  }
  return goals;
}

function toExtracted(goal: Goal): ExtractedGoal {
  return {
    id: goal.id,
    name: goal.name,
    category: goal.category,
    horizon: goal.horizon,
    targetAmount: goal.targetAmount,
    savedSoFar: goal.savedSoFar,
    targetDate: goal.targetDate,
    whyItMatters: goal.whyItMatters ?? "",
    autoSave: goal.autoSave,
  };
}

function sentences(transcript: string): string[] {
  return transcript
    .split(/[\n.!?]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function readName(transcript: string): string | null {
  const match = transcript.match(/\b(?:i'm|i am|my name is|this is)\s+([A-Za-z][a-z]{1,20})\b/);
  if (!match) return null;
  const word = match[1].toLowerCase();
  if (NAME_STOP.has(word)) return null;
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function readDate(text: string): string | null {
  const match = text.match(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{4})\b/i,
  );
  if (!match) return null;
  const month = MONTHS[match[1].toLowerCase()];
  if (!month) return null;
  return `${match[2]}-${month}-01`;
}

function readAmounts(text: string): { saved?: number; target?: number } {
  const pair = text.match(/£?\s*(\d[\d,]*)\s*(k)?\s*(?:saved\s*)?(?:of|towards|toward)\s*£?\s*(\d[\d,]*)\s*(k)?/i);
  if (pair) {
    const first = money(pair[1], pair[2]);
    const second = money(pair[3], pair[4]);
    return { saved: Math.min(first, second), target: Math.max(first, second) };
  }
  const singles: number[] = [];
  const pattern = /£\s*(\d[\d,]*)\s*(k)?/gi;
  let found = pattern.exec(text);
  while (found) {
    singles.push(money(found[1], found[2]));
    found = pattern.exec(text);
  }
  if (singles.length >= 2) {
    const sorted = [...singles].sort((a, b) => a - b);
    return { saved: sorted[0], target: sorted[sorted.length - 1] };
  }
  if (singles.length === 1) return { target: singles[0] };
  return {};
}

function money(raw: string, suffix?: string): number {
  const value = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(value)) return 0;
  return suffix ? value * 1000 : value;
}

function horizonFor(today: string, date: string): Goal["horizon"] {
  const days = daysBetween(today, date);
  if (days < 370) return "short";
  if (days < 370 * 3) return "medium";
  return "long";
}
