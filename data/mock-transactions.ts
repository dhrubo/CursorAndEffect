import { addDays } from "@/lib/saver/dates";
import type { Transaction, TxCategory } from "@/lib/saver/schema";

type Weight = { category: TxCategory; merchant: string; min: number; max: number; weight: number };

export function seededTransactions(options: {
  accountId: string;
  seed: number;
  today: string;
  salary: number;
  paydayDay: number;
  weights: Weight[];
  days?: number;
}): Transaction[] {
  const rand = mulberry32(options.seed);
  const days = options.days ?? 90;
  const txns: Transaction[] = [];
  const weightTotal = options.weights.reduce((sum, item) => sum + item.weight, 0);

  for (let ago = days; ago >= 1; ago -= 1) {
    const date = addDays(options.today, -ago);
    const day = Number(date.slice(-2));
    if (day === options.paydayDay) {
      txns.push({
        id: `salary-${date}`,
        accountId: options.accountId,
        date,
        merchant: "Salary",
        amount: options.salary,
        category: "income",
        recurring: true,
      });
    }
    const rolls = rand() > 0.45 ? 2 : 1;
    for (let n = 0; n < rolls; n += 1) {
      const pick = pickWeighted(options.weights, weightTotal, rand);
      const amount = Math.round(pick.min + rand() * (pick.max - pick.min));
      txns.push({
        id: `${pick.category}-${date}-${n}`,
        accountId: options.accountId,
        date,
        merchant: pick.merchant,
        amount: -amount,
        category: pick.category,
        recurring: pick.category === "bills" || pick.category === "subscriptions",
      });
    }
  }
  return txns;
}

export const SOCIAL_WEIGHTS: Weight[] = [
  { category: "nights_out", merchant: "The Old Crown", min: 28, max: 54, weight: 4 },
  { category: "eating_out", merchant: "Dishoom", min: 14, max: 32, weight: 3 },
  { category: "transport", merchant: "TfL", min: 3, max: 12, weight: 2 },
  { category: "groceries", merchant: "Tesco", min: 18, max: 45, weight: 2 },
  { category: "subscriptions", merchant: "Spotify", min: 11, max: 16, weight: 1 },
  { category: "shopping", merchant: "ASOS", min: 20, max: 40, weight: 1 },
  { category: "bills", merchant: "Rent", min: 700, max: 700, weight: 0.15 },
];

export const STEADY_WEIGHTS: Weight[] = [
  { category: "groceries", merchant: "Sainsbury's", min: 30, max: 70, weight: 4 },
  { category: "bills", merchant: "Energy", min: 80, max: 120, weight: 2 },
  { category: "transport", merchant: "TfL", min: 4, max: 10, weight: 2 },
  { category: "eating_out", merchant: "Itsu", min: 8, max: 16, weight: 1 },
  { category: "subscriptions", merchant: "Netflix", min: 11, max: 16, weight: 1 },
  { category: "shopping", merchant: "Boots", min: 8, max: 24, weight: 1 },
];

function pickWeighted(weights: Weight[], total: number, rand: () => number): Weight {
  let cursor = rand() * total;
  for (const item of weights) {
    cursor -= item.weight;
    if (cursor <= 0) return item;
  }
  return weights[weights.length - 1];
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
