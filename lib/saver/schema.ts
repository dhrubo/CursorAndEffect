import { z } from "zod";
import { ProfileSchema } from "@/lib/profile";

const money = z.number().min(0).max(100_000_000);
const percent = z.number().min(0).max(100);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const GOAL_CATEGORIES = [
  "trip",
  "emergency",
  "family",
  "home",
  "car",
  "event",
  "learning",
  "other",
] as const;

export const GoalSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(40),
  category: z.enum(GOAL_CATEGORIES),
  horizon: z.enum(["short", "medium", "long"]),
  targetAmount: money,
  targetDate: isoDate,
  savedSoFar: money,
  potAccountId: z.string(),
  isPrimary: z.boolean(),
  image: z.string().optional(),
  whyItMatters: z.string().max(140).optional(),
  autoSave: z.object({
    amount: money,
    cadence: z.enum(["weekly", "payday"]),
    enabled: z.boolean(),
  }),
  roundUps: z.boolean(),
  checkpointsCelebrated: z.array(z.number()).max(8),
});

export const AccountSchema = z.object({
  id: z.string(),
  provider: z.string(),
  name: z.string(),
  balance: money,
  aer: percent.optional(),
  kind: z.enum(["current", "easy_access", "cash_isa", "lisa", "stocks_isa", "pension"]),
  connected: z.boolean(),
});

export const TX_CATEGORIES = [
  "income",
  "bills",
  "groceries",
  "transport",
  "eating_out",
  "nights_out",
  "shopping",
  "subscriptions",
  "goal_transfer",
  "other",
] as const;

export const TransactionSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  date: isoDate,
  merchant: z.string(),
  amount: z.number().min(-1_000_000).max(1_000_000),
  category: z.enum(TX_CATEGORIES),
  recurring: z.boolean(),
});

export const PreferencesSchema = z.object({
  interests: z.array(z.string()).max(12),
  lifeStage: z.enum(["studying", "early_career", "settling", "family"]),
  paydayDay: z.number().int().min(1).max(28),
  alertThresholdDays: z.number().int().min(1).max(30),
  connections: z.object({
    bank: z.boolean(),
    email: z.boolean(),
    social: z.boolean(),
  }),
  autosaveMissed: z.boolean(),
  signals: z.array(z.string()).max(8),
});

export const PlanEventSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(80),
  date: isoDate,
  cost: money,
  goalId: z.string().optional(),
});

export const CoachEventSchema = z.object({
  id: z.string(),
  kind: z.enum(["spend", "idle", "replan", "protect"]),
  severity: z.enum(["protect", "small", "big", "emergency"]),
  goalId: z.string(),
  amount: z.number(),
  deltaDays: z.number(),
  merchant: z.string().optional(),
  status: z.enum(["new", "kept", "spent", "moved", "dismissed"]),
  createdAt: isoDate,
  transactionId: z.string().optional(),
});

export const SaverStateSchema = z.object({
  version: z.literal(2),
  today: isoDate,
  profile: ProfileSchema,
  goals: z.array(GoalSchema).max(6),
  accounts: z.array(AccountSchema).max(12),
  transactions: z.array(TransactionSchema).max(400),
  preferences: PreferencesSchema,
  coachEvents: z.array(CoachEventSchema).max(40),
  planEvents: z.array(PlanEventSchema).max(20).optional(),
});

export type Goal = z.infer<typeof GoalSchema>;
export type Account = z.infer<typeof AccountSchema>;
export type Transaction = z.infer<typeof TransactionSchema>;
export type TxCategory = (typeof TX_CATEGORIES)[number];
export type Preferences = z.infer<typeof PreferencesSchema>;
export type CoachEvent = z.infer<typeof CoachEventSchema>;
export type PlanEvent = z.infer<typeof PlanEventSchema>;
export type SaverState = z.infer<typeof SaverStateSchema>;

export function parseSaverState(value: unknown): SaverState | null {
  const result = SaverStateSchema.safeParse(value);
  return result.success ? result.data : null;
}
