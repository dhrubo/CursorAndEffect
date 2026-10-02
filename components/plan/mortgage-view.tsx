import type { OverpayScenario, OverpayVsSave, RemortgageComparison } from "@/lib/finance/mortgage";
import { gbp, months, pct } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { cn } from "cn";

const VERDICT: Record<OverpayScenario["verdict"], string> = {
  overpay: "Overpaying wins",
  save: "Saving wins",
  close: "Too close to call",
};

function ScenarioRow({ s, label, savingsRate }: { s: OverpayScenario; label: string; savingsRate: number }) {
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{label}</p>
        <Badge variant={s.verdict === "close" ? "outline" : "default"}>{VERDICT[s.verdict]}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className={cn("rounded-lg border p-3", s.verdict === "overpay" && "border-primary bg-primary/5")}>
          <p className="text-xs text-muted-foreground">Overpay at {pct(s.mortgageRatePct)}: interest saved</p>
          <p className="text-xl font-semibold tabular-nums">{gbp(s.overpayInterestSaved)}</p>
        </div>
        <div className={cn("rounded-lg border p-3", s.verdict === "save" && "border-primary bg-primary/5")}>
          <p className="text-xs text-muted-foreground">Save at {pct(savingsRate)} after tax: interest earned</p>
          <p className="text-xl font-semibold tabular-nums">{gbp(s.saveInterestEarned)}</p>
        </div>
      </div>
    </div>
  );
}

export function OverpayVsSaveView({ result }: { result: OverpayVsSave }) {
  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        {gbp(result.lumpSum)} over {result.horizonYears} years. Savings option: {result.savingsProduct}. Overpaying
        would shorten your mortgage by {months(result.termReductionMonths)}.
      </p>
      <ScenarioRow s={result.current} label="At your current rate" savingsRate={result.savingsRateAfterTaxPct} />
      {result.afterDealEnds && (
        <div className="grid gap-1">
          <ScenarioRow
            s={result.afterDealEnds}
            label="After your deal ends"
            savingsRate={result.savingsRateAfterTaxPct}
          />
          <p className="text-xs text-muted-foreground">{result.afterDealEnds.assumption}</p>
        </div>
      )}
      <ul className="grid list-disc gap-1 pl-5 text-xs text-muted-foreground">
        {result.notes.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
    </div>
  );
}

export function RemortgageView({ result, limit = 5 }: { result: RemortgageComparison; limit?: number }) {
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat label="Loan to value" value={pct(result.ltvPct, 0)} />
        <Stat label={`Now (${pct(result.currentRatePct)})`} value={`${gbp(result.currentMonthlyPayment)}/m`} />
        <Stat
          label={`If you drift to SVR (${pct(result.svrPct)})`}
          value={`${gbp(result.svrMonthlyPayment)}/m`}
          tone="bad"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 pr-3 font-medium">Deal</th>
              <th className="py-2 pr-3 font-medium">Rate</th>
              <th className="py-2 pr-3 font-medium">Fee</th>
              <th className="py-2 pr-3 font-medium">Monthly</th>
              <th className="py-2 font-medium" title="Interest plus fee over the deal, per month">
                True cost/m
              </th>
            </tr>
          </thead>
          <tbody>
            {result.options.slice(0, limit).map((o, i) => (
              <tr key={o.product.id} className={cn("border-b last:border-0", i === 0 && "bg-primary/5")}>
                <td className="py-2 pr-3">
                  <p className="font-medium">{o.product.provider}</p>
                  <p className="text-xs text-muted-foreground">{o.product.name}</p>
                </td>
                <td className="py-2 pr-3 tabular-nums">{pct(o.product.initialRatePct)}</td>
                <td className="py-2 pr-3 tabular-nums">{gbp(o.product.fee)}</td>
                <td className="py-2 pr-3 tabular-nums">{gbp(o.monthlyPayment)}</td>
                <td className="py-2 tabular-nums">{gbp(o.effectiveMonthlyCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="grid list-disc gap-1 pl-5 text-xs text-muted-foreground">
        {result.notes.map((n) => (
          <li key={n}>{n}</li>
        ))}
        <li>Illustrative rates as of {result.ratesAsOf}. Fictional lenders.</li>
      </ul>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "bad" }) {
  return (
    <div className="rounded-lg border p-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("font-semibold tabular-nums", tone === "bad" && "text-destructive")}>{value}</p>
    </div>
  );
}
