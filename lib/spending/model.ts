import { z } from "zod";

export const SPENDING_CATEGORIES = [
  "groceries",
  "transport",
  "eating_out",
  "subscriptions",
  "shopping",
  "bills",
  "health",
] as const;

export type SpendingCategory = (typeof SPENDING_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<SpendingCategory, string> = {
  groceries: "Groceries",
  transport: "Transport",
  eating_out: "Eating out",
  subscriptions: "Subscriptions",
  shopping: "Shopping",
  bills: "Bills",
  health: "Health",
};

/** Rent, food, travel and health stay on the essential side of the split. */
export const ESSENTIAL_CATEGORIES = ["groceries", "transport", "bills", "health"] as const satisfies readonly SpendingCategory[];

export const DISCRETIONARY_CATEGORIES = ["eating_out", "subscriptions", "shopping"] as const satisfies readonly SpendingCategory[];

/**
 * Subscriptions the seeded feed keeps billing even though nothing else in the
 * month suggests they are used. Insights treats these as cancellable.
 */
export const DORMANT_SUBSCRIPTION_MERCHANTS = ["ShelfBox", "ClassPass", "Newsstand"] as const;

const dormant = new Set<string>(DORMANT_SUBSCRIPTION_MERCHANTS);

export function isEssentialCategory(category: SpendingCategory): boolean {
  return (ESSENTIAL_CATEGORIES as readonly SpendingCategory[]).includes(category);
}

export function isDormantSubscription(merchant: string): boolean {
  return dormant.has(merchant);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const TransactionSchema = z.object({
  id: z.string().min(1),
  personaId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  merchant: z.string().min(1),
  category: z.enum(SPENDING_CATEGORIES),
  amount: z.number().positive(),
});

export type Transaction = z.infer<typeof TransactionSchema>;

export const CategoryTotalSchema = z.object({
  category: z.enum(SPENDING_CATEGORIES),
  amount: z.number().min(0),
  essential: z.boolean(),
});

export type CategoryTotal = z.infer<typeof CategoryTotalSchema>;

export const SpendingMonthSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  transactions: z.array(TransactionSchema),
  total: z.number().min(0),
  essential: z.number().min(0),
  discretionary: z.number().min(0),
  byCategory: z.array(CategoryTotalSchema),
});

export type SpendingMonth = z.infer<typeof SpendingMonthSchema>;

export function summariseMonth(month: string, transactions: Transaction[]): SpendingMonth {
  const inMonth = transactions.filter((t) => t.date.startsWith(month));
  const byCategory = SPENDING_CATEGORIES.map((category) => {
    const amount = round2(
      inMonth.filter((t) => t.category === category).reduce((sum, t) => sum + t.amount, 0),
    );
    return { category, amount, essential: isEssentialCategory(category) };
  }).filter((row) => row.amount > 0);

  const essential = round2(byCategory.filter((r) => r.essential).reduce((sum, r) => sum + r.amount, 0));
  const discretionary = round2(byCategory.filter((r) => !r.essential).reduce((sum, r) => sum + r.amount, 0));

  return {
    month,
    transactions: inMonth,
    total: round2(essential + discretionary),
    essential,
    discretionary,
    byCategory,
  };
}

export function groupMonths(transactions: Transaction[]): SpendingMonth[] {
  const months = [...new Set(transactions.map((t) => t.date.slice(0, 7)))].sort();
  return months.map((month) => summariseMonth(month, transactions));
}
