"use client";

import { useMemo } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DebtComparison, PayoffResult, Strategy } from "@/lib/finance/debt";
import { gbp, months } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { cn } from "cn";

const LABELS: Record<Strategy, string> = {
  avalanche: "Avalanche (highest rate first)",
  snowball: "Snowball (smallest balance first)",
};

export function DebtStrategySummary({ comparison }: { comparison: DebtComparison }) {
  const c = comparison;
  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted-foreground">
        Paying {gbp(c.monthlyBudget)} a month ({gbp(c.minimumPayments)} minimums + {gbp(c.extraPerMonth)} extra)
        towards {gbp(c.totalDebt)} of debt.
        {c.excludedDebts.length > 0 && ` ${c.excludedDebts.join(", ")} left out (income-based repayments).`}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {(["avalanche", "snowball"] as const).map((s) => {
          const r = c[s];
          return (
            <div
              key={s}
              className={cn("grid gap-1 rounded-lg border p-3", c.recommended === s && "border-primary bg-primary/5")}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{LABELS[s]}</p>
                {c.recommended === s && <Badge className="h-4 px-1.5 text-[10px]">Suggested</Badge>}
              </div>
              {r.feasible ? (
                <>
                  <p className="text-2xl font-semibold tabular-nums">{months(r.months)}</p>
                  <p className="text-xs text-muted-foreground">
                    to debt-free, {gbp(r.totalInterest)} total interest
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Order: {r.payoffOrder.map((p) => p.name).join(" → ")}
                  </p>
                </>
              ) : (
                <p className="text-sm text-destructive">Doesn&apos;t clear at this budget.</p>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-sm">
        {c.interestSavedWithAvalanche > 0
          ? `Avalanche saves ${gbp(c.interestSavedWithAvalanche)} in interest${c.monthsDifference > 0 ? ` and finishes ${months(c.monthsDifference)} sooner` : ""}. Snowball gives quicker early wins, which some people find easier to stick with.`
          : "Both strategies cost about the same here, so pick whichever keeps you motivated."}
      </p>
      {c.note && <p className="text-sm text-destructive">{c.note}</p>}
    </div>
  );
}

export function DebtPayoffChart({ timelines }: { timelines: Record<Strategy, PayoffResult["timeline"]> }) {
  const data = useMemo(() => {
    const len = Math.max(timelines.avalanche.length, timelines.snowball.length);
    return Array.from({ length: len }, (_, i) => ({
      month: i,
      avalanche: timelines.avalanche[i]?.balance ?? 0,
      snowball: timelines.snowball[i]?.balance ?? 0,
    }));
  }, [timelines]);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            fontSize={12}
            tickFormatter={(m: number) => `${m}m`}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            fontSize={12}
            width={56}
            tickFormatter={(v: number) => `£${Math.round(v / 1000)}k`}
          />
          <Tooltip
            formatter={(value) => gbp(Number(value))}
            labelFormatter={(m) => `Month ${m}`}
            contentStyle={{ borderRadius: 8, fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="avalanche" name="Avalanche" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
          <Line
            type="monotone"
            dataKey="snowball"
            name="Snowball"
            stroke="var(--chart-2)"
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
