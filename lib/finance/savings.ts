import {
  RATES_AS_OF,
  SAVINGS_PRODUCTS,
  type SavingsKind,
  type SavingsProduct,
} from "@/data/products";
import type { Profile } from "@/lib/profile";
import { UK_RULES, afterTaxRate, marginalSavingsTaxRate } from "./tax";

export function bestProduct(
  kinds: SavingsKind[],
  { instantOnly = false }: { instantOnly?: boolean } = {},
): SavingsProduct {
  const candidates = SAVINGS_PRODUCTS.filter(
    (p) => kinds.includes(p.kind) && (!instantOnly || p.accessDays === 0),
  );
  if (candidates.length === 0) throw new Error(`No savings product for ${kinds.join(", ")}`);
  return candidates.reduce((best, p) => (p.aer > best.aer ? p : best));
}

export function isaRoom(profile: Profile): number {
  return Math.max(
    0,
    UK_RULES.isaAllowance - profile.isaContributedThisYear - profile.lisaContributedThisYear,
  );
}

export function lisaRoom(profile: Profile): number {
  return Math.max(0, UK_RULES.lisaAllowance - profile.lisaContributedThisYear);
}

export type LisaEligibility = { eligible: boolean; reason: string };

export function lisaEligibility(profile: Profile): LisaEligibility {
  if (!profile.firstTimeBuyer || !profile.buyingHome) {
    return { eligible: false, reason: "Only applies if you're saving for a first home." };
  }
  if (profile.age < UK_RULES.lisaMinAge || profile.age > UK_RULES.lisaMaxOpeningAge) {
    return { eligible: false, reason: "You can only open a Lifetime ISA aged 18 to 39." };
  }
  if (profile.targetHomePrice > UK_RULES.lisaMaxPropertyPrice) {
    return {
      eligible: false,
      reason: `Your target price is above the £${UK_RULES.lisaMaxPropertyPrice.toLocaleString("en-GB")} Lifetime ISA limit, so the bonus would be lost.`,
    };
  }
  return { eligible: true, reason: "You're 18 to 39 and saving for a first home." };
}

/** Tax rate on extra non-ISA interest, assuming existing cash earns the best easy-access rate. */
export function savingsTaxRate(profile: Profile, extraTaxableBalance = 0): number {
  const rate = bestProduct(["easy_access"], { instantOnly: true }).aer;
  const interest = ((profile.cashSavings + extraTaxableBalance) * rate) / 100;
  return marginalSavingsTaxRate(profile.grossAnnualIncome, interest);
}

export type CashHome = {
  product: SavingsProduct;
  effectiveRatePct: number;
  taxRate: number;
};

/** Best instant-access home for cash after tax, choosing between taxable easy-access and a flexible Cash ISA. */
export function bestHomeForCash(
  profile: Profile,
  {
    amount,
    isaRoomLeft = isaRoom(profile),
    extraTaxableBalance = 0,
  }: { amount: number; isaRoomLeft?: number; extraTaxableBalance?: number },
): CashHome {
  const easy = bestProduct(["easy_access"], { instantOnly: true });
  const taxRate = savingsTaxRate(profile, extraTaxableBalance + amount);
  const taxable: CashHome = {
    product: easy,
    effectiveRatePct: afterTaxRate(easy.aer, taxRate),
    taxRate,
  };
  if (isaRoomLeft < Math.max(1, amount)) return taxable;
  const isa = bestProduct(["cash_isa"], { instantOnly: true });
  const sheltered: CashHome = { product: isa, effectiveRatePct: isa.aer, taxRate: 0 };
  return sheltered.effectiveRatePct >= taxable.effectiveRatePct ? sheltered : taxable;
}

export type SavingsGoal = "emergency" | "short_term" | "house" | "any";

export type SavingsMatch = {
  product: SavingsProduct;
  eligible: boolean;
  effectiveRatePct: number;
  annualInterest: number;
  governmentBonus: number;
  note: string;
};

export type SavingsSearch = {
  goal: SavingsGoal;
  amount: number;
  ratesAsOf: string;
  taxRateOnInterest: number;
  isaAllowanceLeft: number;
  lisaAllowanceLeft: number;
  matches: SavingsMatch[];
};

function goalAllows(goal: SavingsGoal, p: SavingsProduct): boolean {
  switch (goal) {
    case "emergency":
      return p.accessDays === 0 && p.kind !== "lisa";
    case "short_term":
      return p.kind !== "lisa";
    case "house":
    case "any":
      return true;
  }
}

export function findSavingsProducts(
  profile: Profile,
  goal: SavingsGoal,
  amount: number,
): SavingsSearch {
  const isaLeft = isaRoom(profile);
  const lisaLeft = Math.min(lisaRoom(profile), isaLeft);
  const taxRate = savingsTaxRate(profile, amount);
  const lisa = lisaEligibility(profile);

  const matches = SAVINGS_PRODUCTS.filter((p) => goalAllows(goal, p)).map((p): SavingsMatch => {
    let eligible = amount >= p.minDeposit;
    let note = p.notes;
    let sheltered = amount;
    let bonus = 0;

    if (p.kind === "lisa") {
      eligible = eligible && lisa.eligible && lisaLeft > 0;
      if (!lisa.eligible) note = lisa.reason;
      sheltered = Math.min(amount, lisaLeft);
      bonus = sheltered * UK_RULES.lisaBonusRate;
    } else if (p.isaWrapper) {
      eligible = eligible && isaLeft > 0;
      sheltered = Math.min(amount, isaLeft);
      if (sheltered < amount) note = `Only £${Math.round(sheltered).toLocaleString("en-GB")} of ISA allowance left this tax year. ${note}`;
    }

    const effectiveRatePct = p.isaWrapper ? p.aer : afterTaxRate(p.aer, taxRate);
    const annualInterest = eligible ? (sheltered * effectiveRatePct) / 100 : 0;

    return {
      product: p,
      eligible,
      effectiveRatePct: round2(effectiveRatePct),
      annualInterest: Math.round(annualInterest),
      governmentBonus: eligible ? Math.round(bonus) : 0,
      note,
    };
  });

  matches.sort(
    (a, b) =>
      Number(b.eligible) - Number(a.eligible) ||
      b.annualInterest + b.governmentBonus - (a.annualInterest + a.governmentBonus),
  );

  return {
    goal,
    amount,
    ratesAsOf: RATES_AS_OF,
    taxRateOnInterest: taxRate,
    isaAllowanceLeft: isaLeft,
    lisaAllowanceLeft: lisaLeft,
    matches,
  };
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
