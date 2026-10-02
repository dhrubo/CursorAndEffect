import { tool, type InferUITools, type UIDataTypes, type UIMessage } from "ai";
import { z } from "zod";
import { transactionsForProfile } from "@/data/transactions";
import { buildCheckIn } from "@/lib/checkin/build";
import { compareDebtStrategies, repayableDebts } from "@/lib/finance/debt";
import { buildPlan } from "@/lib/finance/ladder";
import { compareOverpayVsSave, remortgageOptions } from "@/lib/finance/mortgage";
import { findSavingsProducts, isaRoom, lisaEligibility, lisaRoom } from "@/lib/finance/savings";
import type { Goal as CheckInGoal } from "@/lib/goals/model";
import type { HistorySnapshot } from "@/lib/history";
import { reviewSpending, suggestSpendingChanges } from "@/lib/spending/insights";
import type { Profile } from "@/lib/profile";
import { categoryLabel, categoryTotals, classifyTypology } from "@/lib/coach/typology";
import { primaryGoal } from "@/lib/coach/rules";
import { planWeekendRecovery } from "@/lib/coach/weekend";
import { deriveProfile } from "@/lib/saver/derive-profile";
import type { Goal, SaverState } from "@/lib/saver/schema";
import { buildCheckpoints } from "@/lib/timeline/checkpoints";
import { divertImpact, projectGoal, replan } from "@/lib/timeline/eta";

export type ToolContext = {
  goals?: CheckInGoal[];
  history?: HistorySnapshot[];
  today?: Date;
};

const amount = z.number().min(0).max(10_000_000);

/**
 * Tools close over the validated profile, so the model only supplies scenario inputs
 * and can never misstate the user's own numbers.
 */
export function createTools(profile: Profile, context: ToolContext = {}) {
  return {
    allocate_next_amount: tool({
      description:
        "Split an amount of money across the UK priority ladder for this user: starter buffer, employer pension match, high-interest debt, emergency fund, Lifetime ISA, other debt, mortgage overpayment vs saving, and long-term saving. Use for any 'what should I do with £X' question, or what-ifs with a different amount.",
      inputSchema: z.object({
        amount: amount.describe("Amount in pounds to allocate"),
      }),
      execute: async (input) => buildPlan(profile, input.amount),
    }),

    compare_debt_strategies: tool({
      description:
        "Compare avalanche (highest APR first) and snowball (smallest balance first) for the user's debts: months to debt-free, total interest, payoff order, and 0% promo deadlines. Student loans are excluded automatically.",
      inputSchema: z.object({
        extraPerMonth: amount
          .optional()
          .describe("Extra pounds per month above minimum payments. Defaults to the user's monthly spare money."),
      }),
      execute: async (input) => {
        if (repayableDebts(profile.debts).length === 0) {
          return { error: "The user has no debts to compare (student loans are excluded)." } as const;
        }
        // Month-by-month timelines are only needed for the dashboard chart.
        return { ...compareDebtStrategies(profile, input), timelines: undefined };
      },
    }),

    compare_overpay_vs_save: tool({
      description:
        "Compare overpaying the mortgage with a lump sum against saving it in the best savings account after tax, over a horizon. Also shows the answer at the best remortgage rate if the user's deal ends within 6 months.",
      inputSchema: z.object({
        lumpSum: amount.describe("Lump sum in pounds"),
        horizonYears: z.number().min(1).max(30).optional().describe("Comparison period in years. Default 5."),
        mortgageRatePct: z
          .number()
          .min(0)
          .max(20)
          .optional()
          .describe("Optional what-if mortgage rate, e.g. 4.5. Omit to use the user's current rate."),
      }),
      execute: async (input) =>
        compareOverpayVsSave(profile, input) ??
        ({ error: "The user hasn't added a mortgage to their profile." } as const),
    }),

    find_savings_products: tool({
      description:
        "Find the best illustrative savings products for a goal and amount, with after-tax interest, ISA and Lifetime ISA allowances, and eligibility.",
      inputSchema: z.object({
        goal: z
          .enum(["emergency", "short_term", "house", "any"])
          .describe("emergency = instant access only; short_term = under 5 years; house = first home deposit"),
        amount: amount.describe("Amount in pounds to save"),
      }),
      execute: async (input) => findSavingsProducts(profile, input.goal, input.amount),
    }),

    compare_remortgage_options: tool({
      description:
        "Compare illustrative remortgage deals for the user's mortgage: monthly payment, fees, true monthly cost, and what happens if they drift onto the standard variable rate.",
      inputSchema: z.object({}),
      execute: async () =>
        remortgageOptions(profile) ??
        ({ error: "The user hasn't added a mortgage to their profile." } as const),
    }),

    get_checkin: tool({
      description:
        "How the user is actually doing: standing, what changed since the last saved month, wins, risks, milestones, and the single most useful next action. Call this first when they ask how they are doing. Every figure in the reply must come from this result or the profile.",
      inputSchema: z.object({}),
      execute: async () =>
        buildCheckIn({
          profile,
          goals: context.goals,
          history: context.history,
          today: context.today,
        }),
    }),

    review_spending: tool({
      description:
        "Review the six-month spending feed: monthly totals, category changes versus the previous month, recurring payments, and unused subscriptions. Call this when the user asks what changed in their spending.",
      inputSchema: z.object({}),
      execute: async () => reviewSpending(transactionsForProfile(profile)),
    }),

    suggest_spending_changes: tool({
      description:
        "Suggest up to three spending changes. Each one includes freeableMonthly and the effect on the priority ladder (spare cash, emergency fund timing, debt-free date, and where one month of the cut would go). Name what you noticed, ask if it matches their intent, then use progressLine rather than doing your own maths.",
      inputSchema: z.object({}),
      execute: async () => ({
        suggestions: suggestSpendingChanges(profile, transactionsForProfile(profile)),
      }),
    }),
  };
}

export type AppTools = ReturnType<typeof createTools>;

function goalSnapshot(goal: Goal, today: string) {
  const projection = projectGoal(goal, { today });
  const next = buildCheckpoints(goal, today).find((item) => item.amount > goal.savedSoFar + 0.5);
  return {
    id: goal.id,
    name: goal.name,
    category: goal.category,
    isPrimary: goal.isPrimary,
    savedSoFar: goal.savedSoFar,
    targetAmount: goal.targetAmount,
    amountLeft: projection.amountLeft,
    etaDate: projection.etaDate,
    daysLeft: projection.daysLeft,
    targetDate: goal.targetDate,
    nextCheckpoint: next ? { amount: next.amount, date: next.date, kind: next.kind } : null,
  };
}

export function createSaverTools(state: SaverState) {
  const profile = deriveProfile(state);
  return {
    ...createTools(profile),

    get_goal_status: tool({
      description: "Distance left, arrival date and next checkpoint for one plan, or the primary plan if goalId is omitted.",
      inputSchema: z.object({ goalId: z.string().optional() }),
      execute: async ({ goalId }) => {
        const goal = (goalId ? state.goals.find((item) => item.id === goalId) : undefined) ?? primaryGoal(state);
        if (!goal) return { error: "No plan yet." } as const;
        return goalSnapshot(goal, state.today);
      },
    }),

    simulate_spend: tool({
      description: "Show how spending an amount today moves the arrival of a named plan. Use before commenting on any spend.",
      inputSchema: z.object({
        amount: amount.describe("Pounds they might spend"),
        goalId: z.string().optional(),
      }),
      execute: async ({ amount: spend, goalId }) => {
        const goal = (goalId ? state.goals.find((item) => item.id === goalId) : undefined) ?? primaryGoal(state);
        if (!goal) return { error: "No plan yet." } as const;
        const impact = divertImpact(goal, spend, { today: state.today });
        return { goalName: goal.name, amount: spend, ...impact };
      },
    }),

    suggest_swaps: tool({
      description: "Personal swaps from the user's own spending categories, framed as bringing a plan's date forward.",
      inputSchema: z.object({ category: z.string().optional() }),
      execute: async () => {
        const goal = primaryGoal(state);
        const top = categoryTotals(state.transactions).slice(0, 3);
        return {
          goalName: goal?.name ?? "your plan",
          swaps: top.map((row) => ({
            category: categoryLabel(row.category),
            recentSpend: row.amount,
            idea: `One quieter week of ${categoryLabel(row.category).toLowerCase()} can move ${goal?.name ?? "the plan"} forward.`,
          })),
        };
      },
    }),

    find_idle_money: tool({
      description: "Find cash sitting in the current account, and unused ISA or Lifetime ISA allowance for longer plans.",
      inputSchema: z.object({}),
      execute: async () => {
        const current = state.accounts.find((account) => account.kind === "current");
        const spare = Math.max(0, Math.round((current?.balance ?? 0) - 1000));
        const derived = deriveProfile(state);
        return {
          currentBalance: current?.balance ?? 0,
          spareAboveBuffer: spare,
          isaAllowanceLeft: isaRoom(derived),
          lisaAllowanceLeft: lisaRoom(derived),
          lisa: lisaEligibility(derived),
        };
      },
    }),

    replan_goal: tool({
      description: "After a missed save, either keep the arrival date (new weekly amount) or keep the amount (new arrival).",
      inputSchema: z.object({
        goalId: z.string().optional(),
        keep: z.enum(["date", "amount"]),
      }),
      execute: async ({ goalId, keep }) => {
        const goal = (goalId ? state.goals.find((item) => item.id === goalId) : undefined) ?? primaryGoal(state);
        if (!goal) return { error: "No plan yet." } as const;
        return { goalName: goal.name, ...replan(goal, state.today, keep) };
      },
    }),

    milestone_check: tool({
      description: "A warm check-in: one thing going well, one focus, and the next checkpoint. Use when they ask how they are doing.",
      inputSchema: z.object({}),
      execute: async () => {
        const goal = primaryGoal(state);
        if (!goal) return { error: "No plan yet." } as const;
        const snapshot = goalSnapshot(goal, state.today);
        const typology = classifyTypology(state.transactions);
        return {
          name: state.profile.name,
          goingWell: `${goal.name} has ${snapshot.amountLeft} still to go${snapshot.etaDate ? `, arriving ${snapshot.etaDate}` : ""}.`,
          focus: typology.line,
          next: snapshot.nextCheckpoint
            ? `The next step is ${snapshot.nextCheckpoint.amount} on ${snapshot.nextCheckpoint.date}.`
            : `${goal.name} is funded.`,
        };
      },
    }),

    plan_weekend_recovery: tool({
      description:
        "Two or three ways to save back last weekend's eating-out overspend over the next few weeks, from the person's own usual spending: trim eating out, swap weekend plans for cheaper ones, or ease off another category. Each option has perWeek, weeks, total, and daysWonBack on the primary plan.",
      inputSchema: z.object({}),
      execute: async () =>
        planWeekendRecovery(state) ?? ({ error: "Last weekend looked like a usual weekend, so there is nothing to win back." } as const),
    }),

    propose_goal: tool({
      description: "Draft a new plan the person can add. Do not claim it is already saved.",
      inputSchema: z.object({
        category: z.enum(["trip", "emergency", "family", "home", "car", "event", "learning", "other"]),
        name: z.string().min(1).max(40).optional(),
        targetAmount: amount.optional(),
        targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      }),
      execute: async (input) => ({
        draft: true as const,
        name: input.name ?? "New plan",
        category: input.category,
        horizon: input.category === "home" ? ("long" as const) : ("short" as const),
        targetAmount: input.targetAmount ?? 500,
        targetDate: input.targetDate ?? state.today,
        whyItMatters: "Something you actually want.",
      }),
    }),
  };
}

export type SaverTools = ReturnType<typeof createSaverTools>;
export type AppUIMessage = UIMessage<never, UIDataTypes, InferUITools<SaverTools>>;
