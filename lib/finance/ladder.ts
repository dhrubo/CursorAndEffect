import { CURRENT_ACCOUNTS, RATES_AS_OF } from "@/data/products";
import { gbp, pct } from "@/lib/format";
import { monthlySurplus, totalMinPayments, type Debt, type Profile } from "@/lib/profile";
import { aprAt, hasActivePromo, promoWarnings, repayableDebts } from "./debt";
import {
  bestHomeForCash,
  bestProduct,
  isaRoom,
  lisaEligibility,
  lisaRoom,
  round2,
  savingsTaxRate,
} from "./savings";
import { TAX_BAND_LABELS, UK_RULES, taxBand, taxFreeInterestAllowance } from "./tax";

export const HIGH_INTEREST_APR = 8;
export const STARTER_BUFFER_MIN = 1000;

export type RuleId =
  | "essentials"
  | "starter_buffer"
  | "employer_match"
  | "high_interest_debt"
  | "emergency_fund"
  | "lisa"
  | "medium_interest_debt"
  | "mortgage_vs_save"
  | "long_term";

export const RULE_TITLES: Record<RuleId, string> = {
  essentials: "Cover essentials and minimum payments",
  starter_buffer: "Starter cash buffer",
  employer_match: "Get your full employer pension match",
  high_interest_debt: "Clear high-interest debt",
  emergency_fund: "Build your emergency fund",
  lisa: "Lifetime ISA for a first home",
  medium_interest_debt: "Pay down debt that costs more than savings earn",
  mortgage_vs_save: "Mortgage overpayment vs saving",
  long_term: "Save and invest for the long term",
};

const RULE_ORDER = Object.keys(RULE_TITLES) as RuleId[];

export type StepStatus = "done" | "todo" | "action" | "skipped" | "blocked";

export type LadderStep = {
  ruleId: RuleId;
  order: number;
  title: string;
  status: StepStatus;
  detail: string;
  progressPct?: number;
  allocated: number;
};

export type Allocation = {
  ruleId: RuleId;
  title: string;
  destination: string;
  amount: number;
  reason: string;
};

export type Warning = { level: "info" | "warning" | "urgent"; title: string; detail: string };
export type QuickWin = {
  title: string;
  detail: string;
  value: number;
  valueKind: "yearly" | "one_off";
};
export type Signpost = { name: string; url: string; description: string };

export const DEBT_SIGNPOSTS: Signpost[] = [
  {
    name: "MoneyHelper",
    url: "https://www.moneyhelper.org.uk/en/money-troubles",
    description: "Free, impartial money guidance backed by the government.",
  },
  {
    name: "StepChange",
    url: "https://www.stepchange.org",
    description: "Free, confidential debt advice charity.",
  },
  {
    name: "National Debtline",
    url: "https://nationaldebtline.org",
    description: "Free debt advice by phone, webchat and online tools.",
  },
  {
    name: "Citizens Advice",
    url: "https://www.citizensadvice.org.uk/debt-and-money/",
    description: "Free help with debt, benefits and budgeting.",
  },
];

export type PlanMetrics = {
  monthlySurplus: number;
  monthlyOutgoings: number;
  cashSavings: number;
  starterBufferTarget: number;
  emergencyFundTarget: number;
  totalDebt: number;
  highInterestDebt: number;
  taxBand: string;
  savingsTaxRate: number;
  bestCashHome: string;
  bestCashRateAfterTaxPct: number;
  isaAllowanceLeft: number;
  lisaAllowanceLeft: number;
};

export type Plan = {
  amount: number;
  allocated: number;
  stopped: boolean;
  allocations: Allocation[];
  steps: LadderStep[];
  actions: string[];
  warnings: Warning[];
  quickWins: QuickWin[];
  signposts: Signpost[];
  metrics: PlanMetrics;
  ratesAsOf: string;
};

function effectiveApr(d: Debt): number {
  return aprAt(d, 0);
}

export function buildPlan(profile: Profile, amount: number = profile.nextAmount): Plan {
  const total = Math.max(0, Math.round(amount));
  let remaining = total;
  let cash = profile.cashSavings;
  let taxableAdded = 0;
  let isaLeft = isaRoom(profile);

  const allocations: Allocation[] = [];
  const steps = new Map<RuleId, Omit<LadderStep, "order" | "title" | "allocated">>();
  const actions: string[] = [];
  const warnings: Warning[] = [];

  const surplus = monthlySurplus(profile);
  const outgoings = profile.essentialMonthlySpend + totalMinPayments(profile);
  const starterTarget = Math.max(STARTER_BUFFER_MIN, outgoings);
  const efTarget = Math.round(profile.emergencyFundMonths * outgoings);
  const debts = repayableDebts(profile.debts).map((d) => ({ ...d }));

  const allocate = (ruleId: RuleId, destination: string, value: number, reason: string) => {
    const amt = Math.min(remaining, Math.ceil(value));
    if (amt <= 0) return 0;
    remaining -= amt;
    allocations.push({ ruleId, title: RULE_TITLES[ruleId], destination, amount: amt, reason });
    return amt;
  };

  const depositCash = (ruleId: RuleId, need: number, reason: string) => {
    const want = Math.min(remaining, Math.ceil(need));
    if (want <= 0) return 0;
    const home = bestHomeForCash(profile, {
      amount: want,
      isaRoomLeft: isaLeft,
      extraTaxableBalance: taxableAdded,
    });
    const got = allocate(
      ruleId,
      `${home.product.provider} ${home.product.name} (${pct(home.product.aer)} AER${home.product.isaWrapper ? ", tax-free" : ""})`,
      want,
      reason,
    );
    cash += got;
    if (home.product.isaWrapper) isaLeft -= got;
    else taxableAdded += got;
    return got;
  };

  const bestCashRate = () =>
    bestHomeForCash(profile, {
      amount: Math.max(1, remaining),
      isaRoomLeft: isaLeft,
      extraTaxableBalance: taxableAdded,
    }).effectiveRatePct;

  // 1. Essentials and minimum payments
  const crisis = surplus < 0 || profile.missedPayments;
  steps.set("essentials", {
    ruleId: "essentials",
    status: crisis ? "blocked" : "done",
    detail: crisis
      ? surplus < 0
        ? `Your essentials and minimum repayments are ${gbp(-surplus)} a month more than your income.`
        : "You've told us you've missed payments recently."
      : `${gbp(surplus)} a month left after essentials and ${gbp(totalMinPayments(profile))} of minimum repayments.`,
  });

  if (crisis) {
    warnings.push({
      level: "urgent",
      title: "Get free debt advice first",
      detail:
        "When bills or repayments are being missed, the priority is protecting your home, energy and council tax payments. Free, confidential debt advice can help you deal with lenders. Avoid paid debt-management companies.",
    });
    for (const id of RULE_ORDER.slice(1)) {
      steps.set(id, { ruleId: id, status: "blocked", detail: "Sort out essentials and arrears first." });
    }
  } else {
    // 2. Starter buffer
    const bufferNeed = Math.max(0, starterTarget - cash);
    depositCash(
      "starter_buffer",
      bufferNeed,
      `A small cash cushion stops surprise bills going on a credit card. Target: ${gbp(starterTarget)}.`,
    );
    steps.set("starter_buffer", {
      ruleId: "starter_buffer",
      status: bufferNeed === 0 ? "done" : "todo",
      detail:
        bufferNeed === 0
          ? `You have ${gbp(profile.cashSavings)} in cash, above the ${gbp(starterTarget)} starter target.`
          : `${gbp(profile.cashSavings)} of ${gbp(starterTarget)} (the greater of £1,000 or one month of outgoings).`,
      progressPct: pctOf(profile.cashSavings, starterTarget),
    });

    // 3. Employer pension match
    if (!profile.employerMatchAvailable) {
      steps.set("employer_match", {
        ruleId: "employer_match",
        status: "skipped",
        detail: "No employer match available.",
      });
    } else if (profile.gettingFullEmployerMatch) {
      steps.set("employer_match", {
        ruleId: "employer_match",
        status: "done",
        detail: "You're already getting the full match.",
      });
    } else {
      steps.set("employer_match", {
        ruleId: "employer_match",
        status: "action",
        detail: "Raise your workplace pension contribution to the level your employer fully matches.",
      });
      actions.push(
        "Raise your workplace pension contribution to get the full employer match. Matched contributions plus tax relief usually beat any debt or savings rate. Ask HR or check your pension portal.",
      );
    }

    // 4. High-interest debt
    const highDebts = debts
      .filter((d) => effectiveApr(d) >= HIGH_INTEREST_APR)
      .sort((a, b) => effectiveApr(b) - effectiveApr(a));
    const highTotal = highDebts.reduce((s, d) => s + d.balance, 0);
    for (const d of highDebts) {
      const paid = allocate(
        "high_interest_debt",
        `Pay off ${d.name}`,
        d.balance,
        `${pct(effectiveApr(d), 1)} APR costs about ${gbp((d.balance * effectiveApr(d)) / 100)} a year. Paying it off is a guaranteed, tax-free return at that rate.`,
      );
      d.balance -= paid;
    }
    steps.set("high_interest_debt", {
      ruleId: "high_interest_debt",
      status: highDebts.length === 0 ? "done" : "todo",
      detail:
        highDebts.length === 0
          ? `No debts at ${HIGH_INTEREST_APR}% APR or more${debts.some(hasActivePromo) ? " right now (0% deals are tracked separately)" : ""}.`
          : `${gbp(highTotal)} across ${highDebts.length} debt${highDebts.length === 1 ? "" : "s"}, highest rate first.`,
    });

    // 5. Emergency fund
    const efNeed = Math.max(0, efTarget - cash);
    depositCash(
      "emergency_fund",
      efNeed,
      `${profile.emergencyFundMonths} months of essentials and repayments (${gbp(efTarget)}) covers job loss or big repairs without borrowing.`,
    );
    steps.set("emergency_fund", {
      ruleId: "emergency_fund",
      status: profile.cashSavings >= efTarget ? "done" : "todo",
      detail: `${gbp(profile.cashSavings)} of ${gbp(efTarget)} (${profile.emergencyFundMonths} months).`,
      progressPct: pctOf(profile.cashSavings, efTarget),
    });

    // 6. Lifetime ISA
    const lisa = lisaEligibility(profile);
    const lisaSpace = Math.min(lisaRoom(profile), isaLeft);
    if (!lisa.eligible) {
      steps.set("lisa", { ruleId: "lisa", status: "skipped", detail: lisa.reason });
    } else {
      const product = bestProduct(["lisa"]);
      const got = allocate(
        "lisa",
        `${product.provider} ${product.name} (${pct(product.aer)} AER + 25% bonus)`,
        lisaSpace,
        `The government adds 25%, so this earns a ${gbp(Math.min(remaining, lisaSpace) * UK_RULES.lisaBonusRate)} bonus. Only for a first home up to ${gbp(UK_RULES.lisaMaxPropertyPrice)}, or the money is locked until 60 with a 25% withdrawal charge.`,
      );
      isaLeft -= got;
      steps.set("lisa", {
        ruleId: "lisa",
        status: lisaSpace === 0 ? "done" : "todo",
        detail:
          lisaSpace === 0
            ? "You've used this year's £4,000 Lifetime ISA allowance."
            : `${gbp(profile.lisaContributedThisYear)} of ${gbp(UK_RULES.lisaAllowance)} used this tax year.`,
        progressPct: pctOf(profile.lisaContributedThisYear, UK_RULES.lisaAllowance),
      });
    }

    // 7. Medium-interest debt
    const savingsRate = bestCashRate();
    const mediumDebts = debts
      .filter(
        (d) =>
          d.balance > 0 &&
          !hasActivePromo(d) &&
          effectiveApr(d) < HIGH_INTEREST_APR &&
          effectiveApr(d) > savingsRate,
      )
      .sort((a, b) => effectiveApr(b) - effectiveApr(a));
    for (const d of mediumDebts) {
      const paid = allocate(
        "medium_interest_debt",
        `Overpay ${d.name}`,
        d.balance,
        `${pct(effectiveApr(d), 1)} APR is more than the ${pct(savingsRate)} you'd earn saving after tax. Check for early repayment fees first.`,
      );
      d.balance -= paid;
    }
    const hasStudentLoan = profile.debts.some((d) => d.type === "student_loan");
    steps.set("medium_interest_debt", {
      ruleId: "medium_interest_debt",
      status: mediumDebts.length === 0 ? "done" : "todo",
      detail:
        (mediumDebts.length === 0
          ? `No other debts cost more than the ${pct(savingsRate)} savings can earn after tax.`
          : `${mediumDebts.map((d) => `${d.name} (${pct(effectiveApr(d), 1)})`).join(", ")} cost more than savings earn (${pct(savingsRate)}).`) +
        (hasStudentLoan
          ? " Student loans are left alone: repayments depend on income and the balance is written off after a set period."
          : ""),
    });

    // 8. Mortgage overpayment vs saving
    const m = profile.mortgage;
    if (!m) {
      steps.set("mortgage_vs_save", {
        ruleId: "mortgage_vs_save",
        status: "skipped",
        detail: "No mortgage.",
      });
    } else {
      const rate = bestCashRate();
      const allowance = Math.max(
        0,
        Math.floor((m.balance * m.overpaymentAllowancePct) / 100 - m.overpaidThisYear),
      );
      if (m.ratePct > rate) {
        allocate(
          "mortgage_vs_save",
          "Overpay your mortgage",
          allowance,
          `Your mortgage costs ${pct(m.ratePct)} and the best savings rate after tax is ${pct(rate)}. Staying within your ${gbp(allowance)} yearly allowance avoids early repayment charges.`,
        );
      }
      steps.set("mortgage_vs_save", {
        ruleId: "mortgage_vs_save",
        status: m.ratePct > rate ? "todo" : "skipped",
        detail:
          m.ratePct > rate
            ? `Overpaying wins: mortgage ${pct(m.ratePct)} vs savings ${pct(rate)} after tax.`
            : `Saving wins for now: savings earn ${pct(rate)} after tax vs your ${pct(m.ratePct)} mortgage.`,
      });
      if (m.fixEndsInMonths <= 6) {
        warnings.push({
          level: "warning",
          title:
            m.fixEndsInMonths === 0
              ? "You're on your lender's standard variable rate"
              : `Your mortgage deal ends in ${m.fixEndsInMonths} month${m.fixEndsInMonths === 1 ? "" : "s"}`,
          detail:
            "You can usually lock in a new deal up to 6 months early. The overpay-vs-save answer may change at your new rate, so compare options now.",
        });
      }
    }

    // 9. Long-term saving
    if (remaining > 0) {
      const home = bestHomeForCash(profile, {
        amount: remaining,
        isaRoomLeft: isaLeft,
        extraTaxableBalance: taxableAdded,
      });
      const got = allocate(
        "long_term",
        home.product.isaWrapper
          ? `${home.product.provider} ${home.product.name} (${pct(home.product.aer)}, tax-free), or a Stocks & Shares ISA for goals 5+ years away`
          : `${home.product.provider} ${home.product.name} (${pct(home.product.aer)} AER), or a pension top-up`,
        remaining,
        "Your priorities are covered. Keep money you need within 5 years in cash; for longer goals consider a Stocks & Shares ISA or a pension top-up (with tax relief). We don't recommend specific investments.",
      );
      if (home.product.isaWrapper) isaLeft -= got;
    }
    steps.set("long_term", {
      ruleId: "long_term",
      status: "todo",
      detail: "Pension top-ups, ISAs and investing for goals more than 5 years away.",
    });
  }

  const allocatedByRule = new Map<RuleId, number>();
  for (const a of allocations) {
    allocatedByRule.set(a.ruleId, (allocatedByRule.get(a.ruleId) ?? 0) + a.amount);
  }

  for (const w of promoWarnings(profile.debts)) {
    warnings.push({
      level: w.monthsLeft <= 6 ? "warning" : "info",
      title: `0% deal on ${w.debtName} ends in ${w.monthsLeft} month${w.monthsLeft === 1 ? "" : "s"}`,
      detail: `It then jumps to ${pct(w.revertApr, 1)} APR. Pay about ${gbp(w.monthlyToClear)} a month to clear it in time, or look at another balance transfer before it ends.`,
    });
  }

  const home = bestHomeForCash(profile, { amount: Math.max(1, total) });
  const highInterestDebt = repayableDebts(profile.debts)
    .filter((d) => effectiveApr(d) >= HIGH_INTEREST_APR)
    .reduce((s, d) => s + d.balance, 0);

  return {
    amount: total,
    allocated: total - remaining,
    stopped: crisis,
    allocations,
    steps: RULE_ORDER.map((id, i) => ({
      order: i + 1,
      title: RULE_TITLES[id],
      allocated: allocatedByRule.get(id) ?? 0,
      ...steps.get(id)!,
    })),
    actions,
    warnings,
    quickWins: quickWins(profile),
    signposts: crisis || highInterestDebt > profile.netMonthlyIncome * 3 ? DEBT_SIGNPOSTS : [],
    metrics: {
      monthlySurplus: Math.round(surplus),
      monthlyOutgoings: Math.round(outgoings),
      cashSavings: profile.cashSavings,
      starterBufferTarget: starterTarget,
      emergencyFundTarget: efTarget,
      totalDebt: Math.round(repayableDebts(profile.debts).reduce((s, d) => s + d.balance, 0)),
      highInterestDebt: Math.round(highInterestDebt),
      taxBand: TAX_BAND_LABELS[taxBand(profile.grossAnnualIncome)],
      savingsTaxRate: savingsTaxRate(profile),
      bestCashHome: `${home.product.provider} ${home.product.name}`,
      bestCashRateAfterTaxPct: round2(home.effectiveRatePct),
      isaAllowanceLeft: isaRoom(profile),
      lisaAllowanceLeft: lisaRoom(profile),
    },
    ratesAsOf: RATES_AS_OF,
  };
}

export function quickWins(profile: Profile): QuickWin[] {
  const wins: QuickWin[] = [];
  const bestSwitch = CURRENT_ACCOUNTS.filter((a) => a.monthlyFee === 0).reduce((best, a) =>
    a.switchBonus > best.switchBonus ? a : best,
  );
  const overdrafts = profile.debts.filter((d) => d.type === "overdraft" && d.balance > 0);

  if (profile.currentAccountMonthlyFee > 0) {
    wins.push({
      title: "Stop paying for your current account",
      detail: `You pay ${gbp(profile.currentAccountMonthlyFee * 12)} a year in fees. ${bestSwitch.provider} ${bestSwitch.name} is fee-free and pays a one-off ${gbp(bestSwitch.switchBonus)} to switch. ${bestSwitch.switchConditions}`,
      value: Math.round(profile.currentAccountMonthlyFee * 12),
      valueKind: "yearly",
    });
  } else if (bestSwitch.switchBonus > 0) {
    wins.push({
      title: `Collect a ${gbp(bestSwitch.switchBonus)} switching bonus`,
      detail: `${bestSwitch.provider} ${bestSwitch.name}: ${bestSwitch.switchConditions}${overdrafts.length ? " Switching may involve a credit check, and your overdraft may not move with you." : ""}`,
      value: bestSwitch.switchBonus,
      valueKind: "one_off",
    });
  }

  const cheapestOverdraft = CURRENT_ACCOUNTS.reduce((best, a) =>
    a.overdraftApr < best.overdraftApr ? a : best,
  );
  for (const od of overdrafts) {
    if (od.apr > cheapestOverdraft.overdraftApr + 5) {
      wins.push({
        title: `Your ${od.name.toLowerCase()} costs about ${gbp((od.balance * od.apr) / 100)} a year`,
        detail: `${cheapestOverdraft.provider} ${cheapestOverdraft.name} charges ${pct(cheapestOverdraft.overdraftApr, 1)} instead of ${pct(od.apr, 1)}, subject to approval. Clearing it is step 4 of your plan.`,
        value: Math.round((od.balance * (od.apr - cheapestOverdraft.overdraftApr)) / 100),
        valueKind: "yearly",
      });
    }
  }

  if (profile.idleCurrentAccountCash > 0) {
    const easy = bestProduct(["easy_access"], { instantOnly: true });
    wins.push({
      title: `Move ${gbp(profile.idleCurrentAccountCash)} out of your current account`,
      detail: `It earns nothing there. In ${easy.provider} ${easy.name} (${pct(easy.aer)} AER) it would earn about ${gbp((profile.idleCurrentAccountCash * easy.aer) / 100)} a year.`,
      value: Math.round((profile.idleCurrentAccountCash * easy.aer) / 100),
      valueKind: "yearly",
    });
  }

  const easy = bestProduct(["easy_access"], { instantOnly: true });
  const taxableInterest = (profile.cashSavings * easy.aer) / 100;
  const allowance = taxFreeInterestAllowance(profile.grossAnnualIncome);
  const band = taxBand(profile.grossAnnualIncome);
  const taxDue = Math.max(0, taxableInterest - allowance) * UK_RULES.marginalRate[band];
  if (taxDue >= 10 && isaRoom(profile) > 0) {
    wins.push({
      title: `Shelter your savings from about ${gbp(taxDue)} a year in tax`,
      detail: `Interest on ${gbp(profile.cashSavings)} is above your ${gbp(allowance)} tax-free savings allowance. Moving some into a Cash ISA (up to ${gbp(isaRoom(profile))} this tax year) keeps that interest tax-free.`,
      value: Math.round(taxDue),
      valueKind: "yearly",
    });
  }

  return wins;
}

function pctOf(value: number, target: number): number {
  if (target <= 0) return 100;
  return Math.min(100, Math.round((value / target) * 100));
}
