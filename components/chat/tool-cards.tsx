"use client";

import type { ReactNode } from "react";
import { CalculatorIcon, LoaderCircleIcon } from "lucide-react";
import type { AppUIMessage } from "@/lib/ai/tools";
import { formatDayMonth } from "@/lib/saver/dates";
import { useSaver } from "@/lib/saver/use-saver-state";
import type { Goal } from "@/lib/saver/schema";
import type { SavingsSearch } from "@/lib/finance/savings";
import { gbp, pct } from "@/lib/format";
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
  "tool-get_goal_status": "Checking the plan",
  "tool-simulate_spend": "Seeing what the spend does",
  "tool-suggest_swaps": "Looking at swaps",
  "tool-find_idle_money": "Looking for spare money",
  "tool-replan_goal": "Replanning",
  "tool-milestone_check": "Checking in",
  "tool-propose_goal": "Drafting a plan",
};

export function isToolPart(part: Part): boolean {
  return part.type in TOOL_LABELS;
}

export function ToolPart({ part }: { part: Part }) {
  if (!isToolPart(part) || !("state" in part)) return null;
  const label = TOOL_LABELS[part.type];

  if (part.state === "input-streaming" || part.state === "input-available") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed bg-background px-3 py-2 text-xs text-muted-foreground">
        <LoaderCircleIcon className="size-3.5 animate-spin" /> {label}...
      </div>
    );
  }
  if (part.state === "output-error") {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
        {label} failed: {part.errorText}
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
    <div className="grid gap-3 rounded-xl border bg-background p-3 text-sm shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">{title}</p>
        <Badge variant="secondary" className="gap-1">
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
