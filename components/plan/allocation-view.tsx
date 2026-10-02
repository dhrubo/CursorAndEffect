import { ZapIcon } from "lucide-react";
import type { Plan, RuleId } from "@/lib/finance/ladder";
import { gbp } from "@/lib/format";
import { cn } from "cn";
import { SignpostList } from "./alerts";

export const RULE_COLOURS: Record<RuleId, string> = {
  essentials: "bg-slate-400",
  starter_buffer: "bg-sky-500",
  employer_match: "bg-emerald-600",
  high_interest_debt: "bg-orange-500",
  emergency_fund: "bg-teal-500",
  lisa: "bg-pink-500",
  medium_interest_debt: "bg-amber-400",
  mortgage_vs_save: "bg-violet-500",
  long_term: "bg-indigo-500",
};

export function AllocationView({ plan, compact = false }: { plan: Plan; compact?: boolean }) {
  if (plan.stopped) {
    return (
      <div className="grid gap-3">
        <p className="text-sm">
          Before putting money anywhere else, the priority is covering essential bills and getting back on
          track with repayments. These services are free and confidential:
        </p>
        <SignpostList signposts={plan.signposts} />
      </div>
    );
  }

  if (plan.amount === 0) {
    return <p className="text-sm text-muted-foreground">Enter an amount to see where it should go.</p>;
  }

  return (
    <div className="grid gap-4">
      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label="How the money is split"
      >
        {plan.allocations.map((a, i) => (
          <div
            key={`${a.ruleId}-${i}`}
            className={cn(RULE_COLOURS[a.ruleId], "h-full border-r border-background last:border-r-0")}
            style={{ width: `${(a.amount / plan.amount) * 100}%` }}
            title={`${a.destination}: ${gbp(a.amount)}`}
          />
        ))}
      </div>

      <ol className="grid gap-3">
        {plan.allocations.map((a, i) => (
          <li key={`${a.ruleId}-${i}`} className="flex gap-3">
            <span className={cn(RULE_COLOURS[a.ruleId], "mt-1.5 size-2.5 shrink-0 rounded-full")} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-medium">{a.destination}</p>
                <p className="shrink-0 font-semibold tabular-nums">{gbp(a.amount)}</p>
              </div>
              <p className="text-xs text-muted-foreground">{a.title}</p>
              {!compact && <p className="mt-1 text-sm text-muted-foreground">{a.reason}</p>}
            </div>
          </li>
        ))}
      </ol>

      {plan.actions.length > 0 && (
        <div className="grid gap-2 rounded-lg border border-warning/50 bg-warning/10 p-3">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <ZapIcon className="size-4" /> Also do this (no extra money needed)
          </p>
          {plan.actions.map((a) => (
            <p key={a} className="text-sm">
              {a}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
