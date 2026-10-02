"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PencilIcon, RotateCcwIcon } from "lucide-react";
import { transactionsForProfile } from "@/data/transactions";
import { CheckInCard } from "@/components/checkin/checkin-card";
import { useAssistant } from "@/components/chat/assistant-provider";
import { ChatPanel } from "@/components/chat/chat-panel";
import { GoalForm } from "@/components/goals/goal-form";
import { MilestoneTrack } from "@/components/goals/milestone-track";
import { AllocationView } from "@/components/plan/allocation-view";
import { SignpostList, WarningList } from "@/components/plan/alerts";
import { DebtPayoffChart, DebtStrategySummary } from "@/components/plan/debt-view";
import { OverpayVsSaveView, RemortgageView } from "@/components/plan/mortgage-view";
import { PriorityLadder } from "@/components/plan/priority-ladder";
import { QuickWins } from "@/components/plan/quick-wins";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { buildCheckIn } from "@/lib/checkin/build";
import { compareDebtStrategies, repayableDebts } from "@/lib/finance/debt";
import { buildPlan } from "@/lib/finance/ladder";
import { compareOverpayVsSave, remortgageOptions } from "@/lib/finance/mortgage";
import { deriveMilestones } from "@/lib/goals/milestones";
import { gbp, pct } from "@/lib/format";
import { ensureHistory } from "@/lib/history";
import type { Profile } from "@/lib/profile";
import { freeableMonthly, suggestSpendingChanges } from "@/lib/spending/insights";
import { useGoals } from "@/lib/use-goals";
import { useHistory } from "@/lib/use-history";
import { useProfile } from "@/lib/use-profile";

export default function PlanPage() {
  const { profile, loaded, save, clear } = useProfile();
  const router = useRouter();

  if (!loaded) {
    return <div className="mx-auto h-[60vh] w-full max-w-7xl animate-pulse px-4 py-8" />;
  }

  if (!profile) {
    return (
      <div className="mx-auto grid w-full max-w-xl gap-4 px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold">No numbers yet</h1>
        <p className="text-muted-foreground">Load a demo household or enter your own figures to see your plan.</p>
        <div>
          <Button asChild>
            <Link href="/">Get started</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <PlanView
      profile={profile}
      onAmountCommit={(nextAmount) => save({ ...profile, nextAmount })}
      onReset={() => {
        clear();
        router.push("/");
      }}
    />
  );
}

function PlanView({
  profile,
  onAmountCommit,
  onReset,
}: {
  profile: Profile;
  onAmountCommit: (amount: number) => void;
  onReset: () => void;
}) {
  const [amountText, setAmountText] = useState(String(profile.nextAmount));
  const amount = Math.max(0, Number(amountText) || 0);
  const { setProfileOverride } = useAssistant();
  const { goals, loaded: goalsLoaded, save: saveGoals } = useGoals(profile.name);
  const { snapshots: history, ready: historyReady } = useHistory(profile.name);

  const plan = useMemo(() => buildPlan(profile, amount), [profile, amount]);
  const debts = useMemo(
    () => (repayableDebts(profile.debts).length > 0 ? compareDebtStrategies(profile) : null),
    [profile],
  );
  const overpay = useMemo(
    () => (profile.mortgage && amount > 0 ? compareOverpayVsSave(profile, { lumpSum: amount }) : null),
    [profile, amount],
  );
  const remortgage = useMemo(() => remortgageOptions(profile), [profile]);
  const chatProfile = useMemo(() => ({ ...profile, nextAmount: amount }), [profile, amount]);
  const transactions = useMemo(() => transactionsForProfile(profile), [profile]);
  const freed = useMemo(
    () => freeableMonthly(suggestSpendingChanges(profile, transactions)),
    [profile, transactions],
  );
  const milestones = useMemo(
    () =>
      deriveMilestones({
        profile,
        plan: buildPlan(profile),
        goals,
        history: history ?? undefined,
        freeableMonthly: freed,
      }),
    [profile, goals, history, freed],
  );
  const checkin = useMemo(
    () => (historyReady ? buildCheckIn({ profile, goals, history, transactions }) : null),
    [historyReady, profile, goals, history, transactions],
  );

  useEffect(() => {
    setProfileOverride(chatProfile);
    return () => setProfileOverride(null);
  }, [chatProfile, setProfileOverride]);

  useEffect(() => {
    ensureHistory(profile, buildPlan(profile));
  }, [profile]);

  const m = plan.metrics;
  const title = profile.name ? `${profile.name}'s money plan` : "Your money plan";

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="grid content-start gap-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">
              Illustrative rates as of {plan.ratesAsOf}. Guidance, not regulated advice.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/#profile">
                <PencilIcon /> Edit numbers
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={onReset}>
              <RotateCcwIcon /> Start again
            </Button>
          </div>
        </div>

        {checkin ? <CheckInCard checkin={checkin} /> : <Card className="h-32 animate-pulse" />}

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard label="Spare each month" value={gbp(m.monthlySurplus)} tone={m.monthlySurplus < 0 ? "bad" : undefined}>
            after {gbp(m.monthlyOutgoings)} of essentials and repayments
          </StatCard>
          <StatCard label="Emergency fund" value={`${gbp(m.cashSavings)} / ${gbp(m.emergencyFundTarget)}`}>
            <Progress
              value={Math.min(100, (m.cashSavings / Math.max(1, m.emergencyFundTarget)) * 100)}
              className="mt-1.5 h-1.5"
            />
          </StatCard>
          <StatCard label="Debt (excl. student loans)" value={gbp(m.totalDebt)} tone={m.highInterestDebt > 0 ? "bad" : undefined}>
            {m.highInterestDebt > 0 ? `${gbp(m.highInterestDebt)} at 8%+ APR` : "nothing at 8%+ APR"}
          </StatCard>
          <StatCard label="Tax band" value={m.taxBand.split(" (")[0]}>
            best cash rate after tax {pct(m.bestCashRateAfterTaxPct)}
          </StatCard>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Goals and milestones</CardTitle>
            <CardDescription>
              Filled markers are reached. The next one is highlighted with a date.{" "}
              <Link href="/wrapped" className="underline">
                Open Wrapped
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <MilestoneTrack milestones={milestones} />
            {goalsLoaded ? (
              <GoalForm goals={goals} onChange={saveGoals} />
            ) : (
              <div className="h-40 animate-pulse rounded-lg bg-muted" />
            )}
          </CardContent>
        </Card>

        <Card className="ring-primary/30">
          <CardHeader>
            <CardTitle className="text-lg">Where should your next £ go?</CardTitle>
            <CardDescription>Following the UK priority order, step by step. Change the amount to try a what-if.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="flex max-w-xs items-center gap-2">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">£</span>
                <Input
                  aria-label="Amount to plan for"
                  type="number"
                  min={0}
                  step={50}
                  value={amountText}
                  onChange={(e) => setAmountText(e.target.value)}
                  onBlur={() => onAmountCommit(amount)}
                  className="h-10 pl-7 text-lg font-semibold"
                />
              </div>
              {m.monthlySurplus > 0 && amount !== m.monthlySurplus && (
                <Button variant="outline" size="sm" onClick={() => {
                  setAmountText(String(m.monthlySurplus));
                  onAmountCommit(m.monthlySurplus);
                }}>
                  Use monthly spare ({gbp(m.monthlySurplus)})
                </Button>
              )}
            </div>
            <AllocationView plan={plan} />
          </CardContent>
        </Card>

        {(plan.warnings.length > 0 || (plan.signposts.length > 0 && !plan.stopped)) && (
          <div className="grid gap-3">
            <WarningList warnings={plan.warnings} />
            {!plan.stopped && plan.signposts.length > 0 && (
              <div className="grid gap-2">
                <p className="text-sm text-muted-foreground">
                  Your high-interest debt is large compared with your income. Free advice could help:
                </p>
                <SignpostList signposts={plan.signposts} />
              </div>
            )}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-[1.3fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Your priority ladder</CardTitle>
              <CardDescription>Each step is filled before moving to the next.</CardDescription>
            </CardHeader>
            <CardContent>
              <PriorityLadder steps={plan.steps} />
            </CardContent>
          </Card>
          <Card className="content-start">
            <CardHeader>
              <CardTitle>Quick wins</CardTitle>
              <CardDescription>Current accounts, overdrafts and tax.</CardDescription>
            </CardHeader>
            <CardContent>
              <QuickWins wins={plan.quickWins} />
            </CardContent>
          </Card>
        </div>

        {debts && (
          <Card>
            <CardHeader>
              <CardTitle>Debt payoff: avalanche vs snowball</CardTitle>
              <CardDescription>Total balance over time if you put all your spare money towards debts.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <DebtPayoffChart timelines={debts.timelines} />
              <DebtStrategySummary comparison={debts} />
            </CardContent>
          </Card>
        )}

        {profile.mortgage && (
          <div className="grid gap-6 xl:grid-cols-2">
            {overpay && (
              <Card>
                <CardHeader>
                  <CardTitle>Overpay the mortgage or save?</CardTitle>
                  <CardDescription>For {gbp(amount)}, compared like for like.</CardDescription>
                </CardHeader>
                <CardContent>
                  <OverpayVsSaveView result={overpay} />
                </CardContent>
              </Card>
            )}
            {remortgage && (
              <Card>
                <CardHeader>
                  <CardTitle>Remortgage options</CardTitle>
                  <CardDescription>
                    {profile.mortgage.fixEndsInMonths === 0
                      ? "You're on the standard variable rate."
                      : `Your deal ends in ${profile.mortgage.fixEndsInMonths} months.`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RemortgageView result={remortgage} />
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      <aside className="lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)]">
        <ChatPanel profile={chatProfile} />
      </aside>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
  children,
}: {
  label: string;
  value: string;
  tone?: "bad";
  children?: React.ReactNode;
}) {
  return (
    <Card size="sm">
      <CardContent className="grid gap-0.5">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-lg font-semibold tabular-nums ${tone === "bad" ? "text-destructive" : ""}`}>{value}</p>
        <div className="text-xs text-muted-foreground">{children}</div>
      </CardContent>
    </Card>
  );
}
