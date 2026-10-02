import { gbp, months } from "@/lib/format";
import { buildPlan, type Plan } from "@/lib/finance/ladder";
import { compareDebtStrategies, repayableDebts } from "@/lib/finance/debt";
import type { Profile } from "@/lib/profile";
import { daysBetween } from "@/lib/dates";
import {
  CATEGORY_LABELS,
  isDormantSubscription,
  isEssentialCategory,
  round2,
  type SpendingCategory,
  type SpendingMonth,
  type Transaction,
  groupMonths,
} from "./model";

export type CategoryDelta = {
  category: SpendingCategory;
  label: string;
  previous: number;
  current: number;
  delta: number;
  pctChange: number | null;
};

export type RecurringPayment = {
  merchant: string;
  category: SpendingCategory;
  typicalAmount: number;
  monthsSeen: number;
  cadence: "monthly";
  unused: boolean;
};

export type SpendingReview = {
  months: { month: string; total: number; essential: number; discretionary: number }[];
  latestMonth: string;
  previousMonth: string | null;
  categoryDeltas: CategoryDelta[];
  topMovers: CategoryDelta[];
  recurring: RecurringPayment[];
  unusedSubscriptions: RecurringPayment[];
  totalLatest: number;
  discretionaryLatest: number;
};

export type PlanEffect = {
  freeableMonthly: number;
  surplusBefore: number;
  surplusAfter: number;
  emergencyFundTargetBefore: number;
  emergencyFundTargetAfter: number;
  monthsToEmergencyBefore: number | null;
  monthsToEmergencyAfter: number | null;
  emergencyMonthsSooner: number | null;
  debtFreeMonthsBefore: number | null;
  debtFreeMonthsAfter: number | null;
  debtMonthsSooner: number | null;
  /** Where one month of the freed money lands on the priority ladder. */
  oneMonthDestination: string | null;
  oneMonthRule: string | null;
  progressLine: string;
};

export type SuggestionKind = "unused_subscription" | "trim_category";

export type SpendingSuggestion = {
  id: string;
  merchant?: string;
  category: SpendingCategory;
  kind: SuggestionKind;
  title: string;
  detail: string;
  freeableMonthly: number;
  planEffect: PlanEffect;
};

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function categoryAmount(month: SpendingMonth | undefined, category: SpendingCategory): number {
  return month?.byCategory.find((row) => row.category === category)?.amount ?? 0;
}

export function detectRecurring(transactions: Transaction[]): RecurringPayment[] {
  const byMerchant = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const list = byMerchant.get(tx.merchant) ?? [];
    list.push(tx);
    byMerchant.set(tx.merchant, list);
  }

  const found: RecurringPayment[] = [];
  for (const [merchant, list] of byMerchant) {
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
    const monthSet = new Set(sorted.map((tx) => tx.date.slice(0, 7)));
    if (sorted.length < 3 || monthSet.size < 3) continue;
    if (sorted.length > monthSet.size + 1) continue;

    const amounts = sorted.map((tx) => tx.amount);
    const typical = median(amounts);
    if (typical <= 0) continue;
    if (amounts.some((amount) => Math.abs(amount - typical) / typical > 0.15)) continue;

    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) gaps.push(daysBetween(sorted[i - 1].date, sorted[i].date));
    const gap = median(gaps);
    if (gap < 25 || gap > 40) continue;

    found.push({
      merchant,
      category: sorted[0].category,
      typicalAmount: round2(typical),
      monthsSeen: monthSet.size,
      cadence: "monthly",
      unused: sorted[0].category === "subscriptions" && isDormantSubscription(merchant),
    });
  }

  return found.sort((a, b) => b.typicalAmount - a.typicalAmount || a.merchant.localeCompare(b.merchant));
}

export function reviewSpending(transactions: Transaction[]): SpendingReview {
  const months = groupMonths(transactions);
  const latest = months.at(-1);
  const previous = months.length >= 2 ? months[months.length - 2] : undefined;
  const recurring = detectRecurring(transactions);
  const unusedSubscriptions = recurring.filter((row) => row.unused);

  const categoryDeltas: CategoryDelta[] = latest
    ? latest.byCategory
        .map((row) => row.category)
        .concat(
          (previous?.byCategory ?? [])
            .map((row) => row.category)
            .filter((category) => !latest.byCategory.some((row) => row.category === category)),
        )
        .map((category) => {
          const current = categoryAmount(latest, category);
          const prev = categoryAmount(previous, category);
          const delta = round2(current - prev);
          return {
            category,
            label: CATEGORY_LABELS[category],
            previous: prev,
            current,
            delta,
            pctChange: prev === 0 ? null : round2((delta / prev) * 100),
          };
        })
    : [];

  const topMovers = [...categoryDeltas].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 3);

  return {
    months: months.map((month) => ({
      month: month.month,
      total: month.total,
      essential: month.essential,
      discretionary: month.discretionary,
    })),
    latestMonth: latest?.month ?? "",
    previousMonth: previous?.month ?? null,
    categoryDeltas,
    topMovers,
    recurring,
    unusedSubscriptions,
    totalLatest: latest?.total ?? 0,
    discretionaryLatest: latest?.discretionary ?? 0,
  };
}

function monthsToCover(gap: number, monthly: number): number | null {
  if (gap <= 0) return 0;
  if (monthly <= 0) return null;
  return Math.ceil(gap / monthly);
}

function sooner(before: number | null, after: number | null): number | null {
  if (before === null || after === null) return null;
  return before - after;
}

function progressLine(effect: Omit<PlanEffect, "progressLine">): string {
  if (effect.debtMonthsSooner !== null && effect.debtMonthsSooner > 0) {
    return `That would bring the debt-free date forward by ${months(effect.debtMonthsSooner)}.`;
  }
  if (effect.emergencyMonthsSooner !== null && effect.emergencyMonthsSooner > 0) {
    return `That would fill the emergency fund ${months(effect.emergencyMonthsSooner)} sooner.`;
  }
  if (effect.oneMonthDestination) {
    return `That would lift spare cash from ${gbp(effect.surplusBefore)} to ${gbp(effect.surplusAfter)} a month. One month of it (${gbp(effect.freeableMonthly)}) would go to ${effect.oneMonthDestination}.`;
  }
  return `That would lift spare cash from ${gbp(effect.surplusBefore)} to ${gbp(effect.surplusAfter)} a month.`;
}

function firstDestination(plan: Plan): { destination: string; rule: string } | null {
  const hit = plan.allocations.find((row) => row.amount > 0);
  if (!hit) return null;
  return { destination: hit.destination, rule: hit.ruleId };
}

/** Express a monthly cut as ladder progress by re-running `buildPlan`. */
export function planEffectOfCut(profile: Profile, freeableMonthly: number): PlanEffect {
  const cut = round2(Math.max(0, freeableMonthly));
  const before = buildPlan(profile);
  const afterProfile: Profile = {
    ...profile,
    essentialMonthlySpend: Math.max(0, round2(profile.essentialMonthlySpend - cut)),
  };
  const after = buildPlan(afterProfile);
  const routed = buildPlan(afterProfile, cut);
  const destination = firstDestination(routed);

  const gap = (plan: Plan) => Math.max(0, plan.metrics.emergencyFundTarget - plan.metrics.cashSavings);
  const monthsToEmergencyBefore = monthsToCover(gap(before), before.metrics.monthlySurplus);
  const monthsToEmergencyAfter = monthsToCover(gap(after), after.metrics.monthlySurplus);

  let debtFreeMonthsBefore: number | null = null;
  let debtFreeMonthsAfter: number | null = null;
  if (repayableDebts(profile.debts).length > 0) {
    const beforeDebt = compareDebtStrategies(profile);
    const afterDebt = compareDebtStrategies(afterProfile);
    debtFreeMonthsBefore = beforeDebt[beforeDebt.recommended].feasible
      ? beforeDebt[beforeDebt.recommended].months
      : null;
    debtFreeMonthsAfter = afterDebt[afterDebt.recommended].feasible
      ? afterDebt[afterDebt.recommended].months
      : null;
  }

  const partial = {
    freeableMonthly: cut,
    surplusBefore: before.metrics.monthlySurplus,
    surplusAfter: after.metrics.monthlySurplus,
    emergencyFundTargetBefore: before.metrics.emergencyFundTarget,
    emergencyFundTargetAfter: after.metrics.emergencyFundTarget,
    monthsToEmergencyBefore,
    monthsToEmergencyAfter,
    emergencyMonthsSooner: sooner(monthsToEmergencyBefore, monthsToEmergencyAfter),
    debtFreeMonthsBefore,
    debtFreeMonthsAfter,
    debtMonthsSooner: sooner(debtFreeMonthsBefore, debtFreeMonthsAfter),
    oneMonthDestination: destination?.destination ?? null,
    oneMonthRule: destination?.rule ?? null,
  };

  return { ...partial, progressLine: progressLine(partial) };
}

export function suggestSpendingChanges(profile: Profile, transactions: Transaction[]): SpendingSuggestion[] {
  const review = reviewSpending(transactions);
  const suggestions: SpendingSuggestion[] = [];

  for (const sub of review.unusedSubscriptions) {
    if (sub.typicalAmount < 5) continue;
    const planEffect = planEffectOfCut(profile, sub.typicalAmount);
    suggestions.push({
      id: `unused:${sub.merchant}`,
      merchant: sub.merchant,
      category: "subscriptions",
      kind: "unused_subscription",
      title: `Cancel ${sub.merchant}`,
      detail: `${sub.merchant} has taken about ${gbp(sub.typicalAmount)} every month for ${sub.monthsSeen} months, and it is marked as unused.`,
      freeableMonthly: sub.typicalAmount,
      planEffect,
    });
  }

  for (const mover of review.categoryDeltas) {
    if (isEssentialCategory(mover.category) || mover.delta < 5) continue;
    const planEffect = planEffectOfCut(profile, mover.delta);
    suggestions.push({
      id: `trim:${mover.category}`,
      category: mover.category,
      kind: "trim_category",
      title: `Bring ${mover.label.toLowerCase()} back down`,
      detail: `${mover.label} was ${gbp(mover.previous)} last month and ${gbp(mover.current)} in ${review.latestMonth}.`,
      freeableMonthly: mover.delta,
      planEffect,
    });
  }

  return suggestions
    .sort((a, b) => b.freeableMonthly - a.freeableMonthly)
    .slice(0, 3);
}

export function freeableMonthly(suggestions: SpendingSuggestion[]): number {
  return round2(suggestions.reduce((sum, suggestion) => sum + suggestion.freeableMonthly, 0));
}
