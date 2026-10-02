import { z } from "zod";

export const DEBT_TYPES = [
  "credit_card",
  "overdraft",
  "personal_loan",
  "car_finance",
  "bnpl",
  "student_loan",
  "other",
] as const;

export type DebtType = (typeof DEBT_TYPES)[number];

export const DEBT_TYPE_LABELS: Record<DebtType, string> = {
  credit_card: "Credit card",
  overdraft: "Overdraft",
  personal_loan: "Personal loan",
  car_finance: "Car finance",
  bnpl: "Buy now pay later",
  student_loan: "Student loan",
  other: "Other",
};

const money = z.number().min(0).max(100_000_000);
const percent = z.number().min(0).max(100);

export const DebtSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  type: z.enum(DEBT_TYPES),
  balance: money,
  /** Annual percentage rate, e.g. 24.9 */
  apr: percent,
  minPayment: money,
  /** Months left on a 0% / promotional rate. Omit if there is no promo. */
  promoMonthsLeft: z.number().int().min(0).max(120).optional(),
  /** APR the debt reverts to when the promo ends. */
  revertApr: percent.optional(),
});

export const MortgageSchema = z.object({
  balance: money,
  ratePct: percent,
  remainingYears: z.number().min(1).max(40),
  propertyValue: money,
  /** Months until the current fixed / tracker deal ends. 0 = already on the lender's standard variable rate. */
  fixEndsInMonths: z.number().int().min(0).max(120),
  /** Overpayment allowed each year without an early repayment charge, as % of balance. */
  overpaymentAllowancePct: percent,
  overpaidThisYear: money,
});

export const ProfileSchema = z.object({
  name: z.string().max(60),
  age: z.number().int().min(16).max(100),
  grossAnnualIncome: money,
  netMonthlyIncome: money,
  /** Rent or mortgage payment, bills, food, travel. Excludes debt repayments. */
  essentialMonthlySpend: money,
  missedPayments: z.boolean(),

  /** Easy-access cash savings outside ISAs. */
  cashSavings: money,
  /** Spare cash sitting in a current account earning nothing. */
  idleCurrentAccountCash: money,
  currentAccountMonthlyFee: money,
  isaContributedThisYear: money,
  lisaContributedThisYear: money,
  emergencyFundMonths: z.number().min(3).max(6),

  employerMatchAvailable: z.boolean(),
  gettingFullEmployerMatch: z.boolean(),

  firstTimeBuyer: z.boolean(),
  buyingHome: z.boolean(),
  targetHomePrice: money,

  debts: z.array(DebtSchema).max(20),
  mortgage: MortgageSchema.optional(),

  /** Default amount for the "what should I do with my next £X?" question. */
  nextAmount: money,
});

export type Debt = z.infer<typeof DebtSchema>;
export type Mortgage = z.infer<typeof MortgageSchema>;
export type Profile = z.infer<typeof ProfileSchema>;

export const EMPTY_PROFILE: Profile = {
  name: "",
  age: 30,
  grossAnnualIncome: 35000,
  netMonthlyIncome: 2350,
  essentialMonthlySpend: 1500,
  missedPayments: false,
  cashSavings: 0,
  idleCurrentAccountCash: 0,
  currentAccountMonthlyFee: 0,
  isaContributedThisYear: 0,
  lisaContributedThisYear: 0,
  emergencyFundMonths: 3,
  employerMatchAvailable: true,
  gettingFullEmployerMatch: true,
  firstTimeBuyer: false,
  buyingHome: false,
  targetHomePrice: 0,
  debts: [],
  mortgage: undefined,
  nextAmount: 500,
};

export function totalMinPayments(profile: Profile): number {
  return profile.debts
    .filter((d) => d.balance > 0)
    .reduce((sum, d) => sum + Math.min(d.minPayment, d.balance), 0);
}

export function monthlySurplus(profile: Profile): number {
  return (
    profile.netMonthlyIncome -
    profile.essentialMonthlySpend -
    totalMinPayments(profile)
  );
}

export function parseProfile(value: unknown): Profile | null {
  const result = ProfileSchema.safeParse(value);
  return result.success ? result.data : null;
}
