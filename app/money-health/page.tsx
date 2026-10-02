"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Wordmark } from "@/components/shell/wordmark";
import { useRouter } from "next/navigation";
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
import { compareDebtStrategies, repayableDebts } from "@/lib/finance/debt";
import { buildPlan } from "@/lib/finance/ladder";
import { compareOverpayVsSave, remortgageOptions } from "@/lib/finance/mortgage";
import { gbp, pct } from "@/lib/format";
import { deriveProfile } from "@/lib/saver/derive-profile";
import { useSaver } from "@/lib/saver/use-saver-state";

export default function MoneyHealthPage() {
  const { state, loaded, save, clear } = useSaver();
  const router = useRouter();
  const profile = useMemo(() => (state ? deriveProfile(state) : null), [state]);
  const [amountText, setAmountText] = useState("");

  if (!loaded) return <div className="h-40" />;
  if (!state || !profile) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="font-display text-[32px]">Money health</h1>
        <p className="mt-2 text-[15px] text-[#1a1a1a]/60">Load a household from the splash screen to see the priority ladder.</p>
        <Link href="/" className="mt-4 inline-block underline">Back</Link>
      </main>
    );
  }

  const amount = Math.max(0, Number(amountText || profile.nextAmount) || 0);
  return (
    <HealthView
      amount={amount}
      amountText={amountText || String(profile.nextAmount)}
      onAmountText={setAmountText}
      profile={profile}
      onReset={() => {
        clear();
        router.push("/");
      }}
      onCommit={(nextAmount) => save({ ...state, profile: { ...state.profile, nextAmount } })}
    />
  );
}

function HealthView({
  profile,
  amount,
  amountText,
  onAmountText,
  onCommit,
  onReset,
}: {
  profile: ReturnType<typeof deriveProfile>;
  amount: number;
  amountText: string;
  onAmountText: (value: string) => void;
  onCommit: (amount: number) => void;
  onReset: () => void;
}) {
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
  const metrics = plan.metrics;

  return (
    <main className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-8">
      <Wordmark variant="gradient" />
      <p className="text-sm text-[#1a1a1a]/70">
        Your emergency fund step feeds your Emergency fund plan.{" "}
        <Link href="/home" className="underline">Back to your plans</Link>
      </p>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[32px] font-normal">{profile.name ? `${profile.name}'s money health` : "Money health"}</h1>
          <p className="text-sm text-[#1a1a1a]/60">Illustrative rates as of {plan.ratesAsOf}. Guidance, not regulated advice.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onReset}>Start again</Button>
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat label="Spare each month" value={gbp(metrics.monthlySurplus)} />
        <Stat label="Emergency fund" value={`${gbp(metrics.cashSavings)} / ${gbp(metrics.emergencyFundTarget)}`}>
          <Progress value={Math.min(100, (metrics.cashSavings / Math.max(1, metrics.emergencyFundTarget)) * 100)} className="mt-1.5 h-1.5" />
        </Stat>
        <Stat label="Debt" value={gbp(metrics.totalDebt)} />
        <Stat label="Cash rate after tax" value={pct(metrics.bestCashRateAfterTaxPct)} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Where an extra amount goes</CardTitle>
          <CardDescription>The UK priority order, kept behind the plans on your home screen.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="relative max-w-xs">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">£</span>
            <Input
              aria-label="Amount to plan for"
              type="number"
              min={0}
              value={amountText}
              onChange={(event) => onAmountText(event.target.value)}
              onBlur={() => onCommit(amount)}
              className="h-10 pl-7"
            />
          </div>
          <AllocationView plan={plan} />
        </CardContent>
      </Card>
      {(plan.warnings.length > 0 || plan.signposts.length > 0) && (
        <div className="grid gap-3">
          <WarningList warnings={plan.warnings} />
          {plan.signposts.length > 0 && <SignpostList signposts={plan.signposts} />}
        </div>
      )}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Priority ladder</CardTitle></CardHeader>
          <CardContent><PriorityLadder steps={plan.steps} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Quick wins</CardTitle></CardHeader>
          <CardContent><QuickWins wins={plan.quickWins} /></CardContent>
        </Card>
      </div>
      {debts && (
        <Card>
          <CardHeader><CardTitle>Debt payoff</CardTitle></CardHeader>
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
              <CardHeader><CardTitle>Overpay or save</CardTitle></CardHeader>
              <CardContent><OverpayVsSaveView result={overpay} /></CardContent>
            </Card>
          )}
          {remortgage && (
            <Card>
              <CardHeader><CardTitle>Remortgage options</CardTitle></CardHeader>
              <CardContent><RemortgageView result={remortgage} /></CardContent>
            </Card>
          )}
        </div>
      )}
    </main>
  );
}

function Stat({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <Card size="sm">
      <CardContent className="grid gap-0.5">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold tabular-nums">{value}</p>
        {children}
      </CardContent>
    </Card>
  );
}
