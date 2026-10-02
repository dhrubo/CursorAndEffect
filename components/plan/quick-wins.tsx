import { SparklesIcon } from "lucide-react";
import type { QuickWin } from "@/lib/finance/ladder";
import { gbp } from "@/lib/format";

export function QuickWins({ wins }: { wins: QuickWin[] }) {
  if (wins.length === 0) {
    return <p className="text-sm text-muted-foreground">No quick wins spotted. Nice work.</p>;
  }
  return (
    <ul className="grid gap-3">
      {wins.map((w) => (
        <li key={w.title} className="flex gap-3">
          <SparklesIcon className="mt-0.5 size-4 shrink-0 text-primary" />
          <div className="grid gap-0.5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-medium">{w.title}</p>
              {w.value > 0 && (
                <p className="shrink-0 text-xs font-medium text-primary tabular-nums">
                  ~{gbp(w.value)}
                  {w.valueKind === "yearly" ? "/yr" : " one-off"}
                </p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{w.detail}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
