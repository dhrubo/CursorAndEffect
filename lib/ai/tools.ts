import { tool, type InferUITools, type UIDataTypes, type UIMessage } from "ai";
import { z } from "zod";
import { transactionsForProfile } from "@/data/transactions";
import { buildCheckIn } from "@/lib/checkin/build";
import { compareDebtStrategies, repayableDebts } from "@/lib/finance/debt";
import { buildPlan } from "@/lib/finance/ladder";
import { compareOverpayVsSave, remortgageOptions } from "@/lib/finance/mortgage";
import { findSavingsProducts } from "@/lib/finance/savings";
import type { Goal } from "@/lib/goals/model";
import type { HistorySnapshot } from "@/lib/history";
import { reviewSpending, suggestSpendingChanges } from "@/lib/spending/insights";
import type { Profile } from "@/lib/profile";

export type ToolContext = {
  goals?: Goal[];
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
export type AppUIMessage = UIMessage<never, UIDataTypes, InferUITools<AppTools>>;
