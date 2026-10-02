import { z } from "zod";

export const GOAL_KINDS = ["savings", "purchase", "buffer", "other"] as const;
export type GoalKind = (typeof GOAL_KINDS)[number];

export const GOAL_KIND_LABELS: Record<GoalKind, string> = {
  savings: "Savings goal",
  purchase: "Something to buy",
  buffer: "Extra cash buffer",
  other: "Other",
};

const money = z.number().min(0).max(100_000_000);

export const GoalSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(60),
  target: money.refine((n) => n > 0, "Enter a target above £0"),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a target date"),
  saved: money,
  kind: z.enum(GOAL_KINDS),
});

export type Goal = z.infer<typeof GoalSchema>;

export const GoalFileSchema = z.object({
  profileName: z.string(),
  goals: z.array(GoalSchema),
});

export type GoalFile = z.infer<typeof GoalFileSchema>;
