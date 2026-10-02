import type { Transaction, TxCategory } from "@/lib/saver/schema";

export type Typology = {
  id: "social" | "experience" | "steady" | "subscriptions" | "weekend";
  name: string;
  line: string;
};

const NAMES: Record<Typology["id"], { name: string; line: string }> = {
  social: {
    name: "Social Connector",
    line: "Your money goes on people. That is a strength we can point at a plan.",
  },
  experience: {
    name: "Experience Seeker",
    line: "You spend on doing things. A named plan keeps the next one within reach.",
  },
  steady: {
    name: "Steady Builder",
    line: "The everyday stuff is already handled. Small automatic saves will stack quietly.",
  },
  subscriptions: {
    name: "Subscription Curator",
    line: "A few regular payments add up. Trimming one frees a real step on your plan.",
  },
  weekend: {
    name: "Weekend Warrior",
    line: "Weekends are when it happens. We can plan for them instead of being surprised.",
  },
};

export function classifyTypology(transactions: Transaction[]): Typology {
  const spend = transactions.filter((txn) => txn.amount < 0);
  const totals = new Map<TxCategory, number>();
  for (const txn of spend) {
    totals.set(txn.category, (totals.get(txn.category) ?? 0) + Math.abs(txn.amount));
  }
  const bucket = (categories: TxCategory[]) =>
    categories.reduce((sum, category) => sum + (totals.get(category) ?? 0), 0);

  const weekend = spend
    .filter((txn) => txn.category === "nights_out" || txn.category === "eating_out")
    .filter((txn) => {
      const day = new Date(`${txn.date}T00:00:00Z`).getUTCDay();
      return day === 0 || day === 5 || day === 6;
    })
    .reduce((sum, txn) => sum + Math.abs(txn.amount), 0);

  const scores: { id: Typology["id"]; score: number }[] = [
    { id: "social", score: bucket(["nights_out", "eating_out"]) },
    { id: "experience", score: bucket(["shopping", "transport"]) },
    { id: "steady", score: bucket(["groceries", "bills"]) },
    { id: "subscriptions", score: bucket(["subscriptions"]) },
    { id: "weekend", score: weekend },
  ];
  scores.sort((a, b) => b.score - a.score);
  const winner = scores[0]?.score ? scores[0].id : "steady";
  return { id: winner, ...NAMES[winner] };
}

export function categoryTotals(transactions: Transaction[]): { category: TxCategory; amount: number }[] {
  const totals = new Map<TxCategory, number>();
  for (const txn of transactions) {
    if (txn.amount >= 0 || txn.category === "income" || txn.category === "goal_transfer") continue;
    totals.set(txn.category, (totals.get(txn.category) ?? 0) + Math.abs(txn.amount));
  }
  return [...totals.entries()]
    .map(([category, amount]) => ({ category, amount: Math.round(amount) }))
    .sort((a, b) => b.amount - a.amount);
}

const CATEGORY_LABELS: Record<TxCategory, string> = {
  income: "Income",
  bills: "Bills",
  groceries: "Groceries",
  transport: "Getting around",
  eating_out: "Eating out",
  nights_out: "Nights out",
  shopping: "Shopping",
  subscriptions: "Subscriptions",
  goal_transfer: "Plans",
  other: "Other",
};

export function categoryLabel(category: TxCategory): string {
  return CATEGORY_LABELS[category];
}
