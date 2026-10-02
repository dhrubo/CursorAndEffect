// Fictional providers with illustrative rates. Not real offers.
export const RATES_AS_OF = "2026-10-01";
export const BANK_OF_ENGLAND_BASE_RATE = 3.5;

export type SavingsKind =
  | "easy_access"
  | "cash_isa"
  | "lisa"
  | "notice"
  | "fixed";

export type SavingsProduct = {
  id: string;
  provider: string;
  name: string;
  kind: SavingsKind;
  aer: number;
  isaWrapper: boolean;
  /** Days of notice or fixed-term length; 0 for instant access. */
  accessDays: number;
  minDeposit: number;
  notes: string;
};

export const SAVINGS_PRODUCTS: SavingsProduct[] = [
  {
    id: "northwind-easy",
    provider: "Northwind Bank",
    name: "Easy Saver",
    kind: "easy_access",
    aer: 4.1,
    isaWrapper: false,
    accessDays: 0,
    minDeposit: 1,
    notes: "Unlimited withdrawals. Variable rate.",
  },
  {
    id: "kestrel-instant",
    provider: "Kestrel Building Society",
    name: "Instant Access Saver",
    kind: "easy_access",
    aer: 4.35,
    isaWrapper: false,
    accessDays: 0,
    minDeposit: 100,
    notes: "3 penalty-free withdrawals a year, then rate drops to 1.5%.",
  },
  {
    id: "harbour-isa",
    provider: "Harbour Bank",
    name: "Flexible Cash ISA",
    kind: "cash_isa",
    aer: 4.05,
    isaWrapper: true,
    accessDays: 0,
    minDeposit: 1,
    notes: "Tax-free interest. Flexible: withdraw and replace in the same tax year.",
  },
  {
    id: "meridian-isa-fix",
    provider: "Meridian Mutual",
    name: "1-Year Fixed Cash ISA",
    kind: "cash_isa",
    aer: 4.2,
    isaWrapper: true,
    accessDays: 365,
    minDeposit: 500,
    notes: "Tax-free. Early access costs 90 days' interest.",
  },
  {
    id: "meridian-notice",
    provider: "Meridian Mutual",
    name: "95-Day Notice Account",
    kind: "notice",
    aer: 4.45,
    isaWrapper: false,
    accessDays: 95,
    minDeposit: 1000,
    notes: "Give 95 days' notice to withdraw.",
  },
  {
    id: "meridian-bond",
    provider: "Meridian Mutual",
    name: "1-Year Fixed Rate Bond",
    kind: "fixed",
    aer: 4.3,
    isaWrapper: false,
    accessDays: 365,
    minDeposit: 1000,
    notes: "No withdrawals until maturity.",
  },
  {
    id: "lark-lisa",
    provider: "Lark Money",
    name: "Cash Lifetime ISA",
    kind: "lisa",
    aer: 4.0,
    isaWrapper: true,
    accessDays: 0,
    minDeposit: 1,
    notes:
      "25% government bonus on up to £4,000 a year. For a first home up to £450k or age 60+. 25% charge on other withdrawals.",
  },
];

export type CurrentAccount = {
  id: string;
  provider: string;
  name: string;
  monthlyFee: number;
  switchBonus: number;
  switchConditions: string;
  overdraftApr: number;
};

export const CURRENT_ACCOUNTS: CurrentAccount[] = [
  {
    id: "northwind-everyday",
    provider: "Northwind Bank",
    name: "Everyday Account",
    monthlyFee: 0,
    switchBonus: 175,
    switchConditions: "Full switch via the Current Account Switch Service, pay in £1,000 and move 2 direct debits.",
    overdraftApr: 39.9,
  },
  {
    id: "lark-current",
    provider: "Lark Money",
    name: "Lark Current",
    monthlyFee: 0,
    switchBonus: 200,
    switchConditions: "Full switch via the Current Account Switch Service and log in to the app within 60 days.",
    overdraftApr: 35.0,
  },
  {
    id: "kestrel-plus",
    provider: "Kestrel Building Society",
    name: "Plus Account",
    monthlyFee: 3,
    switchBonus: 0,
    switchConditions: "No switching bonus.",
    overdraftApr: 19.9,
  },
];

export type MortgageProduct = {
  id: string;
  provider: string;
  name: string;
  type: "fixed" | "tracker";
  initialRatePct: number;
  initialPeriodMonths: number;
  fee: number;
  maxLtvPct: number;
  ercDuringDeal: boolean;
};

export const LENDER_STANDARD_VARIABLE_RATE = 7.24;

export const MORTGAGE_PRODUCTS: MortgageProduct[] = [
  {
    id: "northwind-2y",
    provider: "Northwind Bank",
    name: "2-Year Fix",
    type: "fixed",
    initialRatePct: 3.89,
    initialPeriodMonths: 24,
    fee: 999,
    maxLtvPct: 75,
    ercDuringDeal: true,
  },
  {
    id: "kestrel-2y-nofee",
    provider: "Kestrel Building Society",
    name: "2-Year Fix, No Fee",
    type: "fixed",
    initialRatePct: 4.19,
    initialPeriodMonths: 24,
    fee: 0,
    maxLtvPct: 85,
    ercDuringDeal: true,
  },
  {
    id: "northwind-5y",
    provider: "Northwind Bank",
    name: "5-Year Fix",
    type: "fixed",
    initialRatePct: 4.09,
    initialPeriodMonths: 60,
    fee: 999,
    maxLtvPct: 75,
    ercDuringDeal: true,
  },
  {
    id: "harbour-5y",
    provider: "Harbour Bank",
    name: "5-Year Fix, No Fee",
    type: "fixed",
    initialRatePct: 4.29,
    initialPeriodMonths: 60,
    fee: 0,
    maxLtvPct: 90,
    ercDuringDeal: true,
  },
  {
    id: "meridian-tracker",
    provider: "Meridian Mutual",
    name: "2-Year Tracker (base + 0.39%)",
    type: "tracker",
    initialRatePct: BANK_OF_ENGLAND_BASE_RATE + 0.39,
    initialPeriodMonths: 24,
    fee: 499,
    maxLtvPct: 80,
    ercDuringDeal: false,
  },
];
