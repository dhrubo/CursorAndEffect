"use client";

import type { ReactNode } from "react";
import { CalculatorIcon, LoaderCircleIcon } from "lucide-react";
import type { AppUIMessage } from "@/lib/ai/tools";
import type { CheckIn } from "@/lib/checkin/build";
import type { WeekendRecoveryPlan } from "@/lib/coach/weekend";
import { formatDayMonth } from "@/lib/saver/dates";
import { useSaver } from "@/lib/saver/use-saver-state";
import type { Goal } from "@/lib/saver/schema";
import type { SavingsSearch } from "@/lib/finance/savings";
import { gbp, pct } from "@/lib/format";
import type { SpendingReview, SpendingSuggestion } from "@/lib/spending/insights";
import { AllocationView } from "@/components/plan/allocation-view";
import { DebtStrategySummary } from "@/components/plan/debt-view";
import { OverpayVsSaveView, RemortgageView } from "@/components/plan/mortgage-view";
import { Badge } from "@/components/ui/badge";

type Part = AppUIMessage["parts"][number];

const TOOL_LABELS: Record<string, string> = {
  "tool-allocate_next_amount": "Splitting your money across the priority ladder",
  "tool-compare_debt_strategies": "Comparing debt payoff strategies",
  "tool-compare_overpay_vs_save": "Comparing overpaying vs saving",
  "tool-find_savings_products": "Searching savings products",
  "tool-compare_remortgage_options": "Comparing remortgage deals",
  "tool-get_checkin": "Checking how you're doing",
  "tool-review_spending": "Reviewing six months of spending",
  "tool-suggest_spending_changes": "Working out what spending could free up",
  "tool-get_goal_status": "Checking the plan",
  "tool-simulate_spend": "Seeing what the spend does",
  "tool-suggest_swaps": "Looking at swaps",
  "tool-find_idle_money": "Looking for spare money",
  "tool-replan_goal": "Replanning",
  "tool-milestone_check": "Checking in",
  "tool-propose_goal": "Drafting a plan",
  "tool-plan_weekend_recovery": "Finding ways to save it back",
};

export function isToolPart(part: Part): boolean {
  return part.type in TOOL_LABELS;
}

export function ToolPart({ part }: { part: Part }) {
  if (!isToolPart(part) || !("state" in part)) return null;
  const label = TOOL_LABELS[part.type];

  if (part.state === "input-streaming" || part.state === "input-available") {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-dashed border-[#1a1a1a]/25 bg-white/30 px-3 py-2 text-xs text-[#1a1a1a]/70">
        <LoaderCircleIcon className="size-3.5 animate-spin" /> {label}...
      </div>
    );
  }
  if (part.state === "output-error") {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
        {label} did not come through: {part.errorText}
      </div>
    );
  }
  if (part.state !== "output-available") return null;

  switch (part.type) {
    case "tool-allocate_next_amount":
      return (
        <Shell title={`Plan for ${gbp(part.output.amount)}`}>
          <AllocationView plan={part.output} compact />
        </Shell>
      );
    case "tool-compare_debt_strategies":
      return (
        <Shell title="Avalanche vs snowball">
          {"error" in part.output ? <Muted>{part.output.error}</Muted> : <DebtStrategySummary comparison={part.output} />}
        </Shell>
      );
    case "tool-compare_overpay_vs_save":
      return (
        <Shell title="Overpay or save?">
          {"error" in part.output ? <Muted>{part.output.error}</Muted> : <OverpayVsSaveView result={part.output} />}
        </Shell>
      );
    case "tool-find_savings_products":
      return (
        <Shell title={`Savings for ${gbp(part.output.amount)}`}>
          <SavingsMatches search={part.output} />
        </Shell>
      );
    case "tool-compare_remortgage_options":
      return (
        <Shell title="Remortgage options">
          {"error" in part.output ? <Muted>{part.output.error}</Muted> : <RemortgageView result={part.output} limit={3} />}
        </Shell>
      );
    case "tool-get_checkin":
      return (
        <Shell title="How you're doing">
          <CheckInSummary checkin={part.output} />
        </Shell>
      );
    case "tool-review_spending":
      return (
        <Shell title="Spending review">
          <SpendingReviewCard review={part.output} />
        </Shell>
      );
    case "tool-suggest_spending_changes":
      return (
        <Shell title="Spending changes">
          <SpendingSuggestions suggestions={part.output.suggestions} />
        </Shell>
      );
    case "tool-get_goal_status":
      return (
        <Shell title={"error" in part.output ? "Plan" : part.output.name}>
          {"error" in part.output ? (
            <Muted>{part.output.error}</Muted>
          ) : (
            <p>
              {gbp(part.output.amountLeft)} still to go
              {part.output.etaDate ? ` · ${formatDayMonth(part.output.etaDate)}` : ""}.
            </p>
          )}
        </Shell>
      );
    case "tool-simulate_spend":
      return (
        <Shell title={"error" in part.output ? "Spend" : part.output.goalName}>
          {"error" in part.output ? (
            <Muted>{part.output.error}</Muted>
          ) : (
            <p>
              {gbp(part.output.amount)} moves it by {part.output.deltaDays} days
              {part.output.divertedEta ? ` · ${formatDayMonth(part.output.divertedEta)}` : ""}.
            </p>
          )}
        </Shell>
      );
    case "tool-suggest_swaps":
      return (
        <Shell title={part.output.goalName}>
          {part.output.swaps.map((swap) => (
            <p key={swap.category}>{swap.idea}</p>
          ))}
        </Shell>
      );
    case "tool-find_idle_money":
      return (
        <Shell title="Spare money">
          <p>{gbp(part.output.spareAboveBuffer)} above the buffer in the current account.</p>
          <p className="text-xs text-muted-foreground">ISA room {gbp(part.output.isaAllowanceLeft)}. Lifetime ISA room {gbp(part.output.lisaAllowanceLeft)}.</p>
        </Shell>
      );
    case "tool-replan_goal":
      return (
        <Shell title={"error" in part.output ? "Replan" : part.output.goalName}>
          {"error" in part.output ? (
            <Muted>{part.output.error}</Muted>
          ) : (
            <p>
              {gbp(part.output.weeklyAmount)} a week, arriving {formatDayMonth(part.output.targetDate)}.
            </p>
          )}
        </Shell>
      );
    case "tool-milestone_check":
      return (
        <Shell title={"error" in part.output ? "Check in" : `Hey ${part.output.name}`}>
          {"error" in part.output ? (
            <Muted>{part.output.error}</Muted>
          ) : (
            <div className="grid gap-1">
              <p>{part.output.goingWell}</p>
              <p>{part.output.focus}</p>
              <p>{part.output.next}</p>
            </div>
          )}
        </Shell>
      );
    case "tool-plan_weekend_recovery":
      return (
        <Shell title={"error" in part.output ? "Last weekend" : `Save back ${gbp(part.output.overspend.over)}`}>
          {"error" in part.output ? <Muted>{part.output.error}</Muted> : <WeekendRecovery plan={part.output} />}
        </Shell>
      );
    case "tool-propose_goal":
      return (
        <Shell title={part.output.name}>
          <p>
            {gbp(part.output.targetAmount)} · {part.output.whyItMatters}
          </p>
          <PlanDraftButton draft={part.output} />
        </Shell>
      );
    default:
      return null;
  }
}

function Shell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="grid gap-3 rounded-2xl border border-[#1a1a1a]/20 bg-white/40 p-3 text-sm text-[#1a1a1a]">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">{title}</p>
        <Badge variant="secondary" className="gap-1 bg-white/50 text-[#1a1a1a]">
          <CalculatorIcon /> Calculated
        </Badge>
      </div>
      {children}
    </div>
  );
}

function PlanDraftButton({
  draft,
}: {
  draft: { name: string; category: Goal["category"]; horizon: Goal["horizon"]; targetAmount: number; targetDate: string; whyItMatters: string };
}) {
  const { state, save } = useSaver();
  if (!state) return null;
  return (
    <button
      type="button"
      className="mt-2 w-fit rounded-full bg-[#5cd719] px-3 py-2 text-sm text-white"
      onClick={() => {
        const id = `goal-${Date.now()}`;
        const potId = `pot-${id}`;
        const goal: Goal = {
          id,
          name: draft.name,
          category: draft.category,
          horizon: draft.horizon,
          targetAmount: draft.targetAmount,
          targetDate: draft.targetDate,
          savedSoFar: 0,
          potAccountId: potId,
          isPrimary: state.goals.length === 0,
          whyItMatters: draft.whyItMatters,
          autoSave: { amount: 20, cadence: "weekly", enabled: true },
          roundUps: false,
          checkpointsCelebrated: [],
        };
        save({
          ...state,
          goals: [...state.goals, goal].slice(0, 6),
          accounts: [
            ...state.accounts,
            { id: potId, provider: "Northwind", name: draft.name, balance: 0, aer: 4, kind: "easy_access", connected: true },
          ],
        });
      }}
    >
      Plan this goal
    </button>
  );
}

function Muted({ children }: { children: ReactNode }) {
  return <p className="text-muted-foreground">{children}</p>;
}

const GOAL_LABELS: Record<SavingsSearch["goal"], string> = {
  emergency: "Instant access only",
  short_term: "Goals under 5 years",
  house: "First home deposit",
  any: "All accounts",
};

const STANDING_LABEL: Record<CheckIn["standing"], string> = {
  comfortable: "Solid spot",
  steady: "Steady",
  stretched: "Tight month",
};

function CheckInSummary({ checkin }: { checkin: CheckIn }) {
  const win = checkin.wins[0];
  const risk = checkin.risks[0];
  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2">
        <Badge>{STANDING_LABEL[checkin.standing]}</Badge>
        <p className="font-medium">{checkin.headline}</p>
      </div>
      {win && (
        <p>
          <span className="font-medium">One thing going well. </span>
          {win.title}. {win.detail}
        </p>
      )}
      {risk && (
        <p>
          <span className="font-medium">One thing to watch. </span>
          {risk.title}
        </p>
      )}
      <p className="text-muted-foreground">{checkin.nextAction.title}</p>
    </div>
  );
}

function WeekendRecovery({ plan }: { plan: WeekendRecoveryPlan }) {
  const { overspend } = plan;
  return (
    <div className="grid gap-2">
      <p className="text-xs text-muted-foreground">
        {formatDayMonth(overspend.start)} to {formatDayMonth(overspend.end)}: {gbp(overspend.spent)} eating out, against about{" "}
        {gbp(overspend.typical)} on a usual weekend.
      </p>
      {plan.options.map((option) => (
        <div key={option.id} className="rounded-xl border border-[#1a1a1a]/15 p-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-medium">{option.title}</p>
            <p className="shrink-0 tabular-nums">{gbp(option.perWeek)} / week</p>
          </div>
          <p className="text-xs text-muted-foreground">{option.detail}</p>
          <ul className="mt-1 list-disc pl-4 text-xs text-muted-foreground">
            {option.ideas.map((idea) => (
              <li key={idea}>{idea}</li>
            ))}
          </ul>
          <p className="mt-1 text-xs">
            {gbp(option.total)} over {option.weeks} {option.weeks === 1 ? "week" : "weeks"}
            {option.coversOverspend ? ", the whole weekend back" : ""}. Brings {overspend.goalName} {option.daysWonBack} days closer.
          </p>
        </div>
      ))}
    </div>
  );
}

function SpendingReviewCard({ review }: { review: SpendingReview }) {
  return (
    <div className="grid gap-2">
      <p className="text-xs text-muted-foreground">
        Latest month {review.latestMonth || "n/a"}
        {review.previousMonth ? ` compared with ${review.previousMonth}` : ""}. Spent {gbp(review.totalLatest)}, of which{" "}
        {gbp(review.discretionaryLatest)} was discretionary.
      </p>
      {review.topMovers.length === 0 && <Muted>No category movement to show yet.</Muted>}
      {review.topMovers.map((mover) => (
        <div key={mover.category} className="flex items-baseline justify-between gap-2">
          <p>{mover.label}</p>
          <p className="tabular-nums text-muted-foreground">
            {mover.delta > 0 ? "+" : ""}
            {gbp(mover.delta)}
          </p>
        </div>
      ))}
      {review.unusedSubscriptions.length > 0 && (
        <p>
          Unused {review.unusedSubscriptions.length === 1 ? "subscription" : "subscriptions"}:{" "}
          {review.unusedSubscriptions.map((row) => `${row.merchant} (${gbp(row.typicalAmount)} a month)`).join(", ")}.
        </p>
      )}
    </div>
  );
}

function SpendingSuggestions({ suggestions }: { suggestions: SpendingSuggestion[] }) {
  if (suggestions.length === 0) return <Muted>No clear cut stood out in the feed.</Muted>;
  return (
    <div className="grid gap-2">
      {suggestions.map((suggestion) => (
        <div key={suggestion.id} className="rounded-xl border border-[#1a1a1a]/15 p-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-medium">{suggestion.title}</p>
            <p className="shrink-0 tabular-nums">{gbp(suggestion.freeableMonthly)} / month</p>
          </div>
          <p className="text-xs text-muted-foreground">{suggestion.detail}</p>
          <p className="mt-1 text-xs">{suggestion.planEffect.progressLine}</p>
        </div>
      ))}
    </div>
  );
}

function SavingsMatches({ search }: { search: SavingsSearch }) {
  const top = search.matches.filter((m) => m.eligible).slice(0, 4);
  return (
    <div className="grid gap-2">
      <p className="text-xs text-muted-foreground">
        {GOAL_LABELS[search.goal]}. Tax on interest: {Math.round(search.taxRateOnInterest * 100)}%. ISA allowance left:{" "}
        {gbp(search.isaAllowanceLeft)}.
      </p>
      {top.length === 0 && <Muted>No eligible products for this amount.</Muted>}
      {top.map((m, i) => (
        <div key={m.product.id} className={`rounded-lg border p-2.5 ${i === 0 ? "border-primary bg-primary/5" : ""}`}>
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-medium">
              {m.product.provider} {m.product.name}
            </p>
            <p className="shrink-0 font-semibold tabular-nums">{pct(m.product.aer)} AER</p>
          </div>
          <p className="text-xs text-muted-foreground">
            ~{gbp(m.annualInterest)} a year after tax ({pct(m.effectiveRatePct)})
            {m.governmentBonus > 0 && ` + ${gbp(m.governmentBonus)} government bonus`}
          </p>
          <p className="text-xs text-muted-foreground">{m.note}</p>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">Illustrative rates as of {search.ratesAsOf}. Fictional providers.</p>
    </div>
  );
}
