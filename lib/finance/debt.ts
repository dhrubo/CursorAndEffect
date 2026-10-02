import { monthlySurplus, type Debt, type Profile } from "@/lib/profile";

export type Strategy = "avalanche" | "snowball";

const MAX_MONTHS = 600;

/** APR that applies in a given month from now, accounting for 0% promotional periods. */
export function aprAt(debt: Debt, month: number): number {
  if (debt.promoMonthsLeft === undefined) return debt.apr;
  return month < debt.promoMonthsLeft ? debt.apr : (debt.revertApr ?? debt.apr);
}

export function hasActivePromo(debt: Debt): boolean {
  return debt.promoMonthsLeft !== undefined && debt.promoMonthsLeft > 0;
}

/** Student loans are income-contingent and written off, so they are never prioritised. */
export function repayableDebts(debts: Debt[]): Debt[] {
  return debts.filter((d) => d.type !== "student_loan" && d.balance > 0);
}

export type PayoffResult = {
  strategy: Strategy;
  feasible: boolean;
  months: number;
  totalInterest: number;
  totalPaid: number;
  payoffOrder: { id: string; name: string; month: number }[];
  timeline: { month: number; balance: number }[];
};

export function simulatePayoff(
  debts: Debt[],
  monthlyBudget: number,
  strategy: Strategy,
): PayoffResult {
  const active = repayableDebts(debts);
  const balances = new Map(active.map((d) => [d.id, d.balance]));
  const startTotal = active.reduce((s, d) => s + d.balance, 0);
  const timeline = [{ month: 0, balance: Math.round(startTotal) }];
  const payoffOrder: PayoffResult["payoffOrder"] = [];
  let totalInterest = 0;
  let totalPaid = 0;
  let month = 0;

  while (month < MAX_MONTHS && [...balances.values()].some((b) => b > 0.005)) {
    for (const d of active) {
      const bal = balances.get(d.id)!;
      if (bal <= 0) continue;
      const interest = (bal * aprAt(d, month)) / 100 / 12;
      totalInterest += interest;
      balances.set(d.id, bal + interest);
    }

    let available = monthlyBudget;
    for (const d of active) {
      const bal = balances.get(d.id)!;
      const pay = Math.min(d.minPayment, bal, available);
      balances.set(d.id, bal - pay);
      available -= pay;
      totalPaid += pay;
    }

    const order = active
      .filter((d) => balances.get(d.id)! > 0)
      .sort((a, b) =>
        strategy === "avalanche"
          ? aprAt(b, month) - aprAt(a, month) || balances.get(a.id)! - balances.get(b.id)!
          : balances.get(a.id)! - balances.get(b.id)! || aprAt(b, month) - aprAt(a, month),
      );
    for (const d of order) {
      if (available <= 0) break;
      const bal = balances.get(d.id)!;
      const pay = Math.min(bal, available);
      balances.set(d.id, bal - pay);
      available -= pay;
      totalPaid += pay;
    }

    month += 1;
    for (const d of active) {
      if (balances.get(d.id)! <= 0.005 && !payoffOrder.some((p) => p.id === d.id)) {
        balances.set(d.id, 0);
        payoffOrder.push({ id: d.id, name: d.name, month });
      }
    }
    const total = [...balances.values()].reduce((s, b) => s + b, 0);
    timeline.push({ month, balance: Math.round(total) });
  }

  const feasible = [...balances.values()].every((b) => b <= 0.005);
  return {
    strategy,
    feasible,
    months: feasible ? month : MAX_MONTHS,
    totalInterest: Math.round(totalInterest),
    totalPaid: Math.round(totalPaid),
    payoffOrder,
    timeline,
  };
}

export type PromoWarning = {
  debtName: string;
  monthsLeft: number;
  revertApr: number;
  monthlyToClear: number;
};

export function promoWarnings(debts: Debt[]): PromoWarning[] {
  return repayableDebts(debts)
    .filter(hasActivePromo)
    .map((d) => ({
      debtName: d.name,
      monthsLeft: d.promoMonthsLeft!,
      revertApr: d.revertApr ?? d.apr,
      monthlyToClear: Math.ceil(d.balance / d.promoMonthsLeft!),
    }));
}

export type DebtComparison = {
  monthlyBudget: number;
  minimumPayments: number;
  extraPerMonth: number;
  totalDebt: number;
  avalanche: Omit<PayoffResult, "timeline">;
  snowball: Omit<PayoffResult, "timeline">;
  interestSavedWithAvalanche: number;
  monthsDifference: number;
  recommended: Strategy;
  excludedDebts: string[];
  promoWarnings: PromoWarning[];
  note?: string;
};

export function compareDebtStrategies(
  profile: Profile,
  options: { extraPerMonth?: number } = {},
): DebtComparison & { timelines: Record<Strategy, PayoffResult["timeline"]> } {
  const debts = repayableDebts(profile.debts);
  const minimumPayments = debts.reduce((s, d) => s + d.minPayment, 0);
  const extraPerMonth = Math.max(0, Math.round(options.extraPerMonth ?? monthlySurplus(profile)));
  const monthlyBudget = minimumPayments + extraPerMonth;

  const { timeline: avalancheTimeline, ...avalanche } = simulatePayoff(debts, monthlyBudget, "avalanche");
  const { timeline: snowballTimeline, ...snowball } = simulatePayoff(debts, monthlyBudget, "snowball");

  const interestSavedWithAvalanche = snowball.totalInterest - avalanche.totalInterest;
  // Snowball's quick wins are worth considering when the cost difference is small.
  const recommended: Strategy = interestSavedWithAvalanche > 50 ? "avalanche" : "snowball";

  return {
    monthlyBudget,
    minimumPayments,
    extraPerMonth,
    totalDebt: Math.round(debts.reduce((s, d) => s + d.balance, 0)),
    avalanche,
    snowball,
    interestSavedWithAvalanche,
    monthsDifference: snowball.months - avalanche.months,
    recommended,
    excludedDebts: profile.debts.filter((d) => d.type === "student_loan").map((d) => d.name),
    promoWarnings: promoWarnings(profile.debts),
    note: !avalanche.feasible
      ? "At this budget the debts never clear because interest outpaces repayments. Free debt advice can help."
      : undefined,
    timelines: { avalanche: avalancheTimeline, snowball: snowballTimeline },
  };
}
