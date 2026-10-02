// England, Wales and Northern Ireland rules. Scottish income tax bands differ.
export const TAX_YEAR = "2026/27";

export const UK_RULES = {
  personalAllowance: 12_570,
  personalAllowanceTaperStart: 100_000,
  basicRateLimit: 50_270,
  higherRateLimit: 125_140,
  startingRateForSavingsBand: 5_000,
  personalSavingsAllowance: { none: 1_000, basic: 1_000, higher: 500, additional: 0 },
  marginalRate: { none: 0, basic: 0.2, higher: 0.4, additional: 0.45 },
  isaAllowance: 20_000,
  lisaAllowance: 4_000,
  lisaBonusRate: 0.25,
  lisaMinAge: 18,
  lisaMaxOpeningAge: 39,
  lisaMaxPropertyPrice: 450_000,
  lisaWithdrawalCharge: 0.25,
  fscsLimit: 120_000,
} as const;

export type TaxBand = "none" | "basic" | "higher" | "additional";

export const TAX_BAND_LABELS: Record<TaxBand, string> = {
  none: "Non-taxpayer",
  basic: "Basic rate (20%)",
  higher: "Higher rate (40%)",
  additional: "Additional rate (45%)",
};

export function personalAllowance(grossIncome: number): number {
  const excess = Math.max(0, grossIncome - UK_RULES.personalAllowanceTaperStart);
  return Math.max(0, UK_RULES.personalAllowance - excess / 2);
}

export function taxBand(grossIncome: number): TaxBand {
  if (grossIncome <= personalAllowance(grossIncome)) return "none";
  if (grossIncome <= UK_RULES.basicRateLimit) return "basic";
  if (grossIncome <= UK_RULES.higherRateLimit) return "higher";
  return "additional";
}

/** Interest that can be earned tax-free outside an ISA: unused personal allowance + starting rate band + Personal Savings Allowance. */
export function taxFreeInterestAllowance(grossIncome: number): number {
  const band = taxBand(grossIncome);
  const pa = personalAllowance(grossIncome);
  const unusedAllowance = Math.max(0, pa - grossIncome);
  const startingRate = Math.max(
    0,
    UK_RULES.startingRateForSavingsBand - Math.max(0, grossIncome - pa),
  );
  return unusedAllowance + startingRate + UK_RULES.personalSavingsAllowance[band];
}

/**
 * Tax rate on the next £1 of non-ISA interest, given interest already earned this year.
 */
export function marginalSavingsTaxRate(
  grossIncome: number,
  existingAnnualInterest: number,
): number {
  if (existingAnnualInterest < taxFreeInterestAllowance(grossIncome)) return 0;
  return UK_RULES.marginalRate[taxBand(grossIncome)];
}

export function afterTaxRate(ratePct: number, taxRate: number): number {
  return ratePct * (1 - taxRate);
}
