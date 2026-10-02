import {
  LENDER_STANDARD_VARIABLE_RATE,
  MORTGAGE_PRODUCTS,
  RATES_AS_OF,
  type MortgageProduct,
} from "@/data/products";
import type { Profile } from "@/lib/profile";
import { bestHomeForCash, round2 } from "./savings";

export function monthlyPayment(balance: number, ratePct: number, years: number): number {
  const n = Math.round(years * 12);
  const r = ratePct / 100 / 12;
  if (balance <= 0 || n <= 0) return 0;
  if (r === 0) return balance / n;
  return (balance * r) / (1 - Math.pow(1 + r, -n));
}

function amortise(balance: number, ratePct: number, payment: number, maxMonths: number) {
  const r = ratePct / 100 / 12;
  let bal = balance;
  let interest = 0;
  let months = 0;
  while (bal > 0.005 && months < maxMonths) {
    const i = bal * r;
    interest += i;
    bal = bal + i - Math.min(payment, bal + i);
    months += 1;
  }
  return { interest, months, endBalance: Math.max(0, bal) };
}

export type OverpayScenario = {
  mortgageRatePct: number;
  overpayInterestSaved: number;
  saveInterestEarned: number;
  verdict: "overpay" | "save" | "close";
};

export type OverpayVsSave = {
  lumpSum: number;
  horizonYears: number;
  ratesAsOf: string;
  savingsProduct: string;
  savingsRateAfterTaxPct: number;
  allowanceRemaining: number;
  withinAllowance: boolean;
  termReductionMonths: number;
  current: OverpayScenario;
  afterDealEnds?: OverpayScenario & { assumption: string };
  notes: string[];
};

function scenario(
  balance: number,
  remainingYears: number,
  mortgageRatePct: number,
  lumpSum: number,
  savingsRatePct: number,
  horizonMonths: number,
): OverpayScenario & { termReductionMonths: number } {
  const payment = monthlyPayment(balance, mortgageRatePct, remainingYears);
  const base = amortise(balance, mortgageRatePct, payment, horizonMonths);
  const over = amortise(Math.max(0, balance - lumpSum), mortgageRatePct, payment, horizonMonths);
  const fullBase = amortise(balance, mortgageRatePct, payment, 1200);
  const fullOver = amortise(Math.max(0, balance - lumpSum), mortgageRatePct, payment, 1200);

  const overpayInterestSaved = base.interest - over.interest;
  const saveInterestEarned =
    lumpSum * (Math.pow(1 + savingsRatePct / 100 / 12, horizonMonths) - 1);
  const diff = overpayInterestSaved - saveInterestEarned;
  const closeThreshold = lumpSum * 0.001 * (horizonMonths / 12);

  return {
    mortgageRatePct,
    overpayInterestSaved: Math.round(overpayInterestSaved),
    saveInterestEarned: Math.round(saveInterestEarned),
    verdict: Math.abs(diff) <= closeThreshold ? "close" : diff > 0 ? "overpay" : "save",
    termReductionMonths: fullBase.months - fullOver.months,
  };
}

export function compareOverpayVsSave(
  profile: Profile,
  {
    lumpSum,
    horizonYears = 5,
    mortgageRatePct,
  }: { lumpSum: number; horizonYears?: number; mortgageRatePct?: number },
): OverpayVsSave | null {
  const m = profile.mortgage;
  if (!m) return null;

  const amount = Math.max(0, Math.min(lumpSum, m.balance));
  const home = bestHomeForCash(profile, { amount });
  const horizonMonths = Math.round(horizonYears * 12);
  const allowanceRemaining = Math.max(
    0,
    Math.floor((m.balance * m.overpaymentAllowancePct) / 100 - m.overpaidThisYear),
  );

  const { termReductionMonths, ...current } = scenario(
    m.balance,
    m.remainingYears,
    mortgageRatePct ?? m.ratePct,
    amount,
    home.effectiveRatePct,
    horizonMonths,
  );

  const notes: string[] = [];
  let afterDealEnds: OverpayVsSave["afterDealEnds"];
  if (mortgageRatePct === undefined && m.fixEndsInMonths <= 6) {
    const bestDeal = remortgageOptions(profile)?.options[0];
    if (bestDeal) {
      const s = scenario(
        m.balance,
        m.remainingYears,
        bestDeal.product.initialRatePct,
        amount,
        home.effectiveRatePct,
        horizonMonths,
      );
      afterDealEnds = {
        mortgageRatePct: s.mortgageRatePct,
        overpayInterestSaved: s.overpayInterestSaved,
        saveInterestEarned: s.saveInterestEarned,
        verdict: s.verdict,
        assumption: `If you remortgage to ${bestDeal.product.provider} ${bestDeal.product.name} at ${bestDeal.product.initialRatePct}%.`,
      };
      notes.push(
        `Your current deal ends in ${m.fixEndsInMonths} month${m.fixEndsInMonths === 1 ? "" : "s"}. Lump-sum overpayments are often free of charges when a deal ends, so you could save now and decide then.`,
      );
    }
  }
  if (amount > allowanceRemaining) {
    notes.push(
      `£${amount.toLocaleString("en-GB")} is above your £${allowanceRemaining.toLocaleString("en-GB")} penalty-free overpayment allowance. Check for early repayment charges.`,
    );
  }
  notes.push("Overpayments can't usually be taken back out, so keep your emergency fund in cash first.");
  notes.push("Assumes rates stay the same over the period. Savings rates are variable.");

  return {
    lumpSum: amount,
    horizonYears,
    ratesAsOf: RATES_AS_OF,
    savingsProduct: `${home.product.provider} ${home.product.name}`,
    savingsRateAfterTaxPct: round2(home.effectiveRatePct),
    allowanceRemaining,
    withinAllowance: amount <= allowanceRemaining,
    termReductionMonths,
    current,
    afterDealEnds,
    notes,
  };
}

export type RemortgageOption = {
  product: MortgageProduct;
  monthlyPayment: number;
  /** Interest plus fee over the deal period, spread per month. Comparable across 2- and 5-year deals. */
  effectiveMonthlyCost: number;
  monthlySavingVsSvr: number;
};

export type RemortgageComparison = {
  ratesAsOf: string;
  balance: number;
  ltvPct: number;
  fixEndsInMonths: number;
  currentRatePct: number;
  currentMonthlyPayment: number;
  svrPct: number;
  svrMonthlyPayment: number;
  options: RemortgageOption[];
  notes: string[];
};

export function remortgageOptions(profile: Profile): RemortgageComparison | null {
  const m = profile.mortgage;
  if (!m || m.propertyValue <= 0) return null;

  const ltvPct = (m.balance / m.propertyValue) * 100;
  const svrPayment = monthlyPayment(m.balance, LENDER_STANDARD_VARIABLE_RATE, m.remainingYears);

  const options = MORTGAGE_PRODUCTS.filter((p) => p.maxLtvPct >= ltvPct)
    .map((product): RemortgageOption => {
      const payment = monthlyPayment(m.balance, product.initialRatePct, m.remainingYears);
      const { interest } = amortise(
        m.balance,
        product.initialRatePct,
        payment,
        product.initialPeriodMonths,
      );
      return {
        product,
        monthlyPayment: Math.round(payment),
        effectiveMonthlyCost: Math.round((interest + product.fee) / product.initialPeriodMonths),
        monthlySavingVsSvr: Math.round(svrPayment - payment),
      };
    })
    .sort((a, b) => a.effectiveMonthlyCost - b.effectiveMonthlyCost);

  const notes = [
    "You can usually lock in a new deal up to 6 months before your current one ends.",
    "Fees can be added to the loan, but you then pay interest on them.",
  ];
  if (m.fixEndsInMonths === 0) {
    notes.unshift("You're on the standard variable rate now, so switching could save money straight away.");
  }

  return {
    ratesAsOf: RATES_AS_OF,
    balance: m.balance,
    ltvPct: round2(ltvPct),
    fixEndsInMonths: m.fixEndsInMonths,
    currentRatePct: m.ratePct,
    currentMonthlyPayment: Math.round(monthlyPayment(m.balance, m.ratePct, m.remainingYears)),
    svrPct: LENDER_STANDARD_VARIABLE_RATE,
    svrMonthlyPayment: Math.round(svrPayment),
    options,
    notes,
  };
}
