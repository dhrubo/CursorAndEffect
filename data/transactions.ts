import { PERSONAS } from "@/data/personas";
import type { Profile } from "@/lib/profile";
import {
  DORMANT_SUBSCRIPTION_MERCHANTS,
  round2,
  type SpendingCategory,
  type Transaction,
} from "@/lib/spending/model";

/** Six complete months. Fixed so demos and tests do not drift with the clock. */
export const FEED_MONTHS = ["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"] as const;

export const FEED_SEED = 629749;

export type Cadence = "monthly" | "weekly" | "occasional";

type MerchantSpec = {
  merchant: string;
  category: SpendingCategory;
  amount: number;
  cadence: Cadence;
  day?: number;
  /** Half-width of the random swing, as a fraction of amount. 0 keeps the charge exact. */
  spread?: number;
  /** Applied only in the latest month, after jitter, so a category can be a top mover. */
  lastMonthFactor?: number;
};

const SPECS: Record<string, MerchantSpec[]> = {
  sam: [
    { merchant: "Landlord", category: "bills", amount: 950, cadence: "monthly", day: 1 },
    { merchant: "Octopus Energy", category: "bills", amount: 82, cadence: "monthly", day: 8, spread: 0.04 },
    { merchant: "Thames Water", category: "bills", amount: 34, cadence: "monthly", day: 12 },
    { merchant: "Tesco", category: "groceries", amount: 48, cadence: "weekly", spread: 0.12 },
    { merchant: "TfL", category: "transport", amount: 42, cadence: "weekly", spread: 0.08 },
    { merchant: "Boots", category: "health", amount: 16, cadence: "occasional", spread: 0.2 },
    { merchant: "Pret", category: "eating_out", amount: 9.5, cadence: "occasional", spread: 0.15 },
    { merchant: "Netflix", category: "subscriptions", amount: 12.99, cadence: "monthly", day: 4 },
    { merchant: "Spotify", category: "subscriptions", amount: 11.99, cadence: "monthly", day: 6 },
    { merchant: "ShelfBox", category: "subscriptions", amount: 14.99, cadence: "monthly", day: 15 },
    { merchant: "Uniqlo", category: "shopping", amount: 36, cadence: "occasional", spread: 0.25, lastMonthFactor: 1.8 },
  ],
  priya: [
    { merchant: "Landlord", category: "bills", amount: 1100, cadence: "monthly", day: 1 },
    { merchant: "Octopus Energy", category: "bills", amount: 96, cadence: "monthly", day: 9, spread: 0.05 },
    { merchant: "Thames Water", category: "bills", amount: 38, cadence: "monthly", day: 14 },
    { merchant: "Sainsbury's", category: "groceries", amount: 58, cadence: "weekly", spread: 0.1 },
    { merchant: "TfL", category: "transport", amount: 38, cadence: "weekly", spread: 0.06 },
    { merchant: "Boots", category: "health", amount: 14, cadence: "occasional", spread: 0.15 },
    { merchant: "Deliveroo", category: "eating_out", amount: 22, cadence: "occasional", spread: 0.12, lastMonthFactor: 1.85 },
    { merchant: "Dishoom", category: "eating_out", amount: 28, cadence: "occasional", spread: 0.1 },
    { merchant: "Netflix", category: "subscriptions", amount: 12.99, cadence: "monthly", day: 3 },
    { merchant: "Spotify", category: "subscriptions", amount: 11.99, cadence: "monthly", day: 11 },
    { merchant: "ClassPass", category: "subscriptions", amount: 29, cadence: "monthly", day: 18 },
    { merchant: "ASOS", category: "shopping", amount: 40, cadence: "occasional", spread: 0.3 },
  ],
  mark: [
    { merchant: "Mortgage payment", category: "bills", amount: 980, cadence: "monthly", day: 1 },
    { merchant: "Council tax", category: "bills", amount: 180, cadence: "monthly", day: 5 },
    { merchant: "British Gas", category: "bills", amount: 140, cadence: "monthly", day: 10, spread: 0.06 },
    { merchant: "Waitrose", category: "groceries", amount: 72, cadence: "weekly", spread: 0.08 },
    { merchant: "Shell", category: "transport", amount: 55, cadence: "occasional", spread: 0.1 },
    { merchant: "Trainline", category: "transport", amount: 48, cadence: "monthly", day: 2, spread: 0.05 },
    { merchant: "Pharmacy", category: "health", amount: 18, cadence: "occasional", spread: 0.2 },
    { merchant: "The Crown", category: "eating_out", amount: 32, cadence: "occasional", spread: 0.15 },
    { merchant: "Netflix", category: "subscriptions", amount: 18.99, cadence: "monthly", day: 7 },
    { merchant: "iCloud", category: "subscriptions", amount: 8.99, cadence: "monthly", day: 16 },
    { merchant: "Newsstand", category: "subscriptions", amount: 9.99, cadence: "monthly", day: 20 },
    { merchant: "John Lewis", category: "shopping", amount: 45, cadence: "occasional", spread: 0.2 },
  ],
};

const GENERIC: MerchantSpec[] = [
  { merchant: "Rent or mortgage", category: "bills", amount: 900, cadence: "monthly", day: 1 },
  { merchant: "Energy", category: "bills", amount: 90, cadence: "monthly", day: 8, spread: 0.05 },
  { merchant: "Supermarket", category: "groceries", amount: 50, cadence: "weekly", spread: 0.1 },
  { merchant: "Travel", category: "transport", amount: 30, cadence: "weekly", spread: 0.08 },
  { merchant: "Chemist", category: "health", amount: 12, cadence: "occasional", spread: 0.15 },
  { merchant: "Takeaway", category: "eating_out", amount: 18, cadence: "occasional", spread: 0.2, lastMonthFactor: 1.5 },
  { merchant: "Netflix", category: "subscriptions", amount: 12.99, cadence: "monthly", day: 4 },
  { merchant: "ShelfBox", category: "subscriptions", amount: 14.99, cadence: "monthly", day: 15 },
  { merchant: "Shops", category: "shopping", amount: 30, cadence: "occasional", spread: 0.25 },
];

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(personaId: string): number {
  let hash = FEED_SEED;
  for (const char of personaId) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
}

function scaleSpecs(specs: MerchantSpec[], essentialMonthlySpend: number): MerchantSpec[] {
  const scale = essentialMonthlySpend > 0 ? essentialMonthlySpend / 1500 : 1;
  return specs.map((spec) =>
    spec.category === "bills" || spec.category === "groceries" || spec.category === "transport"
      ? { ...spec, amount: round2(spec.amount * scale) }
      : spec,
  );
}

function occurrences(spec: MerchantSpec): { day: number }[] {
  if (spec.cadence === "monthly") return [{ day: spec.day ?? 1 }];
  if (spec.cadence === "weekly") return [2, 9, 16, 23].map((day) => ({ day }));
  return [6, 20].map((day) => ({ day }));
}

export function generateTransactions(personaId: string, specs: MerchantSpec[] = SPECS[personaId] ?? GENERIC): Transaction[] {
  const rand = mulberry32(hashSeed(personaId));
  const latest = FEED_MONTHS[FEED_MONTHS.length - 1];
  const transactions: Transaction[] = [];
  let sequence = 0;

  for (const month of FEED_MONTHS) {
    for (const spec of specs) {
      for (const occurrence of occurrences(spec)) {
        const noise = rand();
        const spread = spec.spread ?? 0;
        let amount = spread === 0 ? spec.amount : round2(spec.amount * (1 + (noise - 0.5) * 2 * spread));
        if (month === latest && spec.lastMonthFactor) amount = round2(amount * spec.lastMonthFactor);
        const day = String(Math.min(28, Math.max(1, occurrence.day))).padStart(2, "0");
        transactions.push({
          id: `${personaId}-${month}-${sequence++}`,
          personaId,
          date: `${month}-${day}`,
          merchant: spec.merchant,
          category: spec.category,
          amount,
        });
      }
    }
  }

  return transactions;
}

const CACHE = new Map<string, Transaction[]>();

export function transactionsForPersona(personaId: string): Transaction[] {
  const cached = CACHE.get(personaId);
  if (cached) return cached;
  const generated = generateTransactions(personaId);
  CACHE.set(personaId, generated);
  return generated;
}

export function transactionsForProfile(profile: Profile): Transaction[] {
  const persona = PERSONAS.find(
    (item) => item.id === profile.name.toLowerCase() || item.profile.name === profile.name,
  );
  if (persona) return transactionsForPersona(persona.id);
  const cacheKey = `custom:${profile.name}:${profile.essentialMonthlySpend}`;
  const cached = CACHE.get(cacheKey);
  if (cached) return cached;
  const generated = generateTransactions(cacheKey, scaleSpecs(GENERIC, profile.essentialMonthlySpend));
  CACHE.set(cacheKey, generated);
  return generated;
}

export function feedIncludesDormantSubscription(transactions: Transaction[]): boolean {
  return transactions.some((tx) => (DORMANT_SUBSCRIPTION_MERCHANTS as readonly string[]).includes(tx.merchant));
}
