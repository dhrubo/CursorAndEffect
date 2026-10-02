"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Wordmark } from "@/components/shell/wordmark";
import { gbp, pct } from "@/lib/format";
import { financialPosition, goalStatus, onTrackCount, upcomingEvents } from "@/lib/plan/insights";
import type { GoalStatus } from "@/lib/plan/insights";
import type { SaverState } from "@/lib/saver/schema";

export function PlanDashboard({ state, onReset }: { state: SaverState; onReset: () => void }) {
  const position = financialPosition(state);
  const events = upcomingEvents(state);
  const name = state.profile.name || "there";

  return (
    <main className="mx-auto grid w-full max-w-3xl gap-8 px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <Wordmark variant="gradient" />
        <button type="button" className="text-sm text-muted-foreground underline-offset-4 hover:underline" onClick={onReset}>
          Start again
        </button>
      </div>
      <header className="grid gap-1">
        <p className="text-sm text-muted-foreground">Your plan</p>
        <h1 className="font-display text-[40px] leading-[1.15] font-normal">Hey {name}</h1>
      </header>
      <section className="grid grid-cols-2 gap-3" aria-label="Plan summary">
        <Stat label="Active goals" value={String(state.goals.length)} />
        <Stat label="Upcoming events" value={String(events.length)} />
        <Stat label="Savings and investments" value={gbp(position.savingsAndInvestments)} />
        <Stat label="Goals on track" value={String(onTrackCount(state))} />
      </section>
      <section className="grid gap-3">
        <h2 className="font-display text-[28px] font-normal">Net worth</h2>
        <Card>
          <CardContent className="grid gap-4">
            <p className="text-3xl font-medium tabular-nums">{gbp(position.netWorth)}</p>
            <dl className="grid gap-2 text-sm">
              <Row label="Cash" value={gbp(position.cash)} />
              <Row label="Savings" value={gbp(position.savings)} />
              <Row label="Investments" value={gbp(position.investments)} />
              <Row label="Pension" value={gbp(position.pension)} />
              <Row label="Debts" value={gbp(position.debts)} />
              <Row label="Monthly income" value={gbp(position.income)} />
              <Row label="Monthly spending" value={gbp(position.spending)} />
              <Row label="Left each month" value={gbp(position.surplus)} />
            </dl>
          </CardContent>
        </Card>
      </section>
      <section className="grid gap-3">
        <h2 className="font-display text-[28px] font-normal">Credit</h2>
        {state.profile.debts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No credit connected.</p>
        ) : (
          <div className="grid gap-3">
            {state.profile.debts.map((debt) => (
              <Card key={debt.id} size="sm">
                <CardContent className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-base">{debt.name}</p>
                    <p className="text-sm text-muted-foreground">{pct(debt.apr)} APR</p>
                  </div>
                  <p className="text-lg tabular-nums">{gbp(debt.balance)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
      <section className="grid gap-3">
        <h2 className="font-display text-[28px] font-normal">Goals</h2>
        <div className="grid gap-3">
          {state.goals.map((goal) => {
            const status = goalStatus(goal, state.today);
            const progress = goal.targetAmount > 0 ? Math.min(100, Math.round((goal.savedSoFar / goal.targetAmount) * 100)) : 0;
            return (
              <Card key={goal.id}>
                <CardContent className="grid gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-lg">{goal.name}</p>
                    <Badge variant={badgeFor(status)}>{status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {gbp(goal.savedSoFar)} saved of {gbp(goal.targetAmount)}
                  </p>
                  <Progress value={progress} aria-label={`${goal.name} progress`} />
                  <p className="text-sm text-muted-foreground">Target: {monthYear(goal.targetDate)}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card size="sm">
      <CardContent className="grid gap-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-medium tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

function badgeFor(status: GoalStatus): "default" | "destructive" | "secondary" {
  if (status === "Needs attention") return "destructive";
  if (status === "Ahead of plan") return "secondary";
  return "default";
}

function monthYear(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
