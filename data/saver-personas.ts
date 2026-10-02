import { PERSONAS } from "@/data/personas";
import { SOCIAL_WEIGHTS, STEADY_WEIGHTS, seededTransactions } from "@/data/mock-transactions";
import { EMPTY_PROFILE, type Profile } from "@/lib/profile";
import type { Goal, SaverState } from "@/lib/saver/schema";

export const DEMO_TODAY = "2026-10-02";

export type SaverPersona = {
  id: string;
  tagline: string;
  highlights: string[];
  state: SaverState;
};

const jordynProfile: Profile = {
  ...EMPTY_PROFILE,
  name: "Jordyn",
  age: 24,
  grossAnnualIncome: 28000,
  netMonthlyIncome: 2100,
  essentialMonthlySpend: 1450,
  cashSavings: 1440,
  idleCurrentAccountCash: 820,
  lisaContributedThisYear: 400,
  employerMatchAvailable: true,
  gettingFullEmployerMatch: true,
  firstTimeBuyer: true,
  buyingHome: true,
  targetHomePrice: 250000,
  nextAmount: 200,
};

const jordanProfile: Profile = {
  ...EMPTY_PROFILE,
  name: "Jordan",
  age: 30,
  grossAnnualIncome: 42000,
  netMonthlyIncome: 2700,
  essentialMonthlySpend: 1900,
  cashSavings: 2200,
  idleCurrentAccountCash: 640,
  emergencyFundMonths: 3,
  employerMatchAvailable: true,
  gettingFullEmployerMatch: true,
  firstTimeBuyer: false,
  buyingHome: false,
  nextAmount: 300,
};

export const SAVER_PERSONAS: SaverPersona[] = [
  {
    id: "jordyn",
    tagline: "Jordyn, 24. Early career, saving for Bali and a first home.",
    highlights: ["Near-term trip", "Emergency fund", "Lifetime ISA"],
    state: {
      version: 2,
      today: DEMO_TODAY,
      profile: jordynProfile,
      preferences: {
        interests: ["travel", "friends", "food"],
        lifeStage: "early_career",
        paydayDay: 25,
        alertThresholdDays: 3,
        connections: { bank: true, email: true, social: false },
        autosaveMissed: false,
        signals: ["A flight price for Bali is sitting in your inbox."],
      },
      accounts: [
        { id: "jor-current", provider: "Hearth", name: "Current account", balance: 820, kind: "current", connected: true },
        { id: "jor-bali", provider: "Hearth", name: "Bali pot", balance: 1160, aer: 4.1, kind: "easy_access", connected: true },
        { id: "jor-emergency", provider: "Northwind", name: "Emergency fund", balance: 280, aer: 4.5, kind: "easy_access", connected: true },
        { id: "jor-lisa", provider: "Northwind", name: "Lifetime ISA", balance: 400, aer: 4, kind: "lisa", connected: true },
      ],
      goals: [
        goal({
          id: "bali",
          name: "Bali with friends",
          category: "trip",
          horizon: "short",
          targetAmount: 1800,
          targetDate: "2027-01-16",
          savedSoFar: 1160,
          potAccountId: "jor-bali",
          isPrimary: true,
          whyItMatters: "A week away with the people I actually like.",
          autoSave: { amount: 45, cadence: "weekly", enabled: true },
        }),
        goal({
          id: "emergency",
          name: "Emergency fund",
          category: "emergency",
          horizon: "medium",
          targetAmount: 1000,
          targetDate: "2027-04-01",
          savedSoFar: 280,
          potAccountId: "jor-emergency",
          isPrimary: false,
          whyItMatters: "A month of rent if work goes quiet.",
          autoSave: { amount: 20, cadence: "weekly", enabled: true },
        }),
        goal({
          id: "home",
          name: "First home",
          category: "home",
          horizon: "long",
          targetAmount: 15000,
          targetDate: "2030-06-01",
          savedSoFar: 400,
          potAccountId: "jor-lisa",
          isPrimary: false,
          whyItMatters: "Somewhere that is ours, not soon, but real.",
          autoSave: { amount: 50, cadence: "payday", enabled: true },
        }),
      ],
      transactions: seededTransactions({
        accountId: "jor-current",
        seed: 24,
        today: DEMO_TODAY,
        salary: 2100,
        paydayDay: 25,
        weights: SOCIAL_WEIGHTS,
      }),
      coachEvents: [],
    },
  },
  {
    id: "jordan",
    tagline: "Jordan, 30. Planning a family in the next couple of years.",
    highlights: ["Baby's first year", "Leave top-up", "A newer car"],
    state: {
      version: 2,
      today: DEMO_TODAY,
      profile: jordanProfile,
      preferences: {
        interests: ["family", "home"],
        lifeStage: "family",
        paydayDay: 28,
        alertThresholdDays: 3,
        connections: { bank: true, email: false, social: false },
        autosaveMissed: false,
        signals: [],
      },
      accounts: [
        { id: "jor2-current", provider: "Hearth", name: "Joint current", balance: 640, kind: "current", connected: true },
        { id: "jor2-baby", provider: "Northwind", name: "Baby pot", balance: 800, aer: 4.2, kind: "easy_access", connected: true },
        { id: "jor2-leave", provider: "Northwind", name: "Leave top-up", balance: 1400, aer: 4.2, kind: "easy_access", connected: true },
        { id: "jor2-car", provider: "Hearth", name: "Car pot", balance: 500, aer: 3.8, kind: "cash_isa", connected: true },
      ],
      goals: [
        goal({
          id: "baby",
          name: "Baby's first year",
          category: "family",
          horizon: "medium",
          targetAmount: 6000,
          targetDate: "2028-06-01",
          savedSoFar: 800,
          potAccountId: "jor2-baby",
          isPrimary: true,
          whyItMatters: "Time off that does not turn into debt.",
          autoSave: { amount: 60, cadence: "weekly", enabled: true },
        }),
        goal({
          id: "leave",
          name: "Parental leave top-up",
          category: "family",
          horizon: "medium",
          targetAmount: 4000,
          targetDate: "2028-03-01",
          savedSoFar: 1400,
          potAccountId: "jor2-leave",
          isPrimary: false,
          autoSave: { amount: 40, cadence: "weekly", enabled: true },
        }),
        goal({
          id: "car",
          name: "A safer car",
          category: "car",
          horizon: "medium",
          targetAmount: 3000,
          targetDate: "2027-09-01",
          savedSoFar: 500,
          potAccountId: "jor2-car",
          isPrimary: false,
          autoSave: { amount: 25, cadence: "weekly", enabled: true },
        }),
      ],
      transactions: seededTransactions({
        accountId: "jor2-current",
        seed: 30,
        today: DEMO_TODAY,
        salary: 2700,
        paydayDay: 28,
        weights: STEADY_WEIGHTS,
      }),
      coachEvents: [],
    },
  },
];

export function goalsForLegacyProfile(profile: Profile, today: string): { goals: Goal[]; accounts: SaverState["accounts"] } {
  const emergencyTarget = Math.max(500, profile.essentialMonthlySpend * profile.emergencyFundMonths);
  const accounts: SaverState["accounts"] = [
    {
      id: "legacy-current",
      provider: "Hearth",
      name: "Current account",
      balance: profile.idleCurrentAccountCash,
      kind: "current",
      connected: true,
    },
    {
      id: "legacy-cash",
      provider: "Northwind",
      name: "Savings",
      balance: profile.cashSavings,
      aer: 4,
      kind: "easy_access",
      connected: true,
    },
  ];
  const goals: Goal[] = [
    goal({
      id: "legacy-emergency",
      name: "Emergency fund",
      category: "emergency",
      horizon: "medium",
      targetAmount: emergencyTarget,
      targetDate: "2027-06-01",
      savedSoFar: Math.min(profile.cashSavings, emergencyTarget),
      potAccountId: "legacy-cash",
      isPrimary: !profile.buyingHome,
      whyItMatters: "A cushion so a surprise does not become credit.",
      autoSave: { amount: 40, cadence: "weekly", enabled: true },
    }),
  ];
  if (profile.buyingHome) {
    accounts.push({
      id: "legacy-lisa",
      provider: "Northwind",
      name: "Lifetime ISA",
      balance: profile.lisaContributedThisYear,
      kind: "lisa",
      connected: true,
    });
    goals.unshift(
      goal({
        id: "legacy-home",
        name: "Home deposit",
        category: "home",
        horizon: "long",
        targetAmount: Math.max(5000, profile.targetHomePrice * 0.05),
        targetDate: "2029-01-01",
        savedSoFar: profile.lisaContributedThisYear,
        potAccountId: "legacy-lisa",
        isPrimary: true,
        autoSave: { amount: 50, cadence: "payday", enabled: true },
      }),
    );
  }
  goals.forEach((item) => {
    item.targetDate = item.targetDate || today;
  });
  return { goals, accounts };
}

function goal(input: Omit<Goal, "roundUps" | "checkpointsCelebrated" | "image"> & { image?: string }): Goal {
  return { roundUps: false, checkpointsCelebrated: [], image: undefined, ...input };
}

export const LEGACY_PERSONA_IDS = PERSONAS.map((persona) => persona.id);
