import { InfoIcon, LifeBuoyIcon, TriangleAlertIcon } from "lucide-react";
import type { Signpost, Warning } from "@/lib/finance/ladder";
import { cn } from "cn";

const LEVEL_STYLES: Record<Warning["level"], string> = {
  urgent: "border-destructive/40 bg-destructive/5",
  warning: "border-warning/60 bg-warning/10",
  info: "border-border bg-background",
};

export function WarningList({ warnings }: { warnings: Warning[] }) {
  if (warnings.length === 0) return null;
  return (
    <div className="grid gap-2">
      {warnings.map((w) => (
        <div key={w.title} className={cn("flex gap-3 rounded-lg border p-3", LEVEL_STYLES[w.level])}>
          {w.level === "info" ? (
            <InfoIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          ) : (
            <TriangleAlertIcon
              className={cn("mt-0.5 size-4 shrink-0", w.level === "urgent" ? "text-destructive" : "text-amber-600")}
            />
          )}
          <div>
            <p className="text-sm font-medium">{w.title}</p>
            <p className="text-sm text-muted-foreground">{w.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SignpostList({ signposts }: { signposts: Signpost[] }) {
  if (signposts.length === 0) return null;
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {signposts.map((s) => (
        <a
          key={s.name}
          href={s.url}
          target="_blank"
          rel="noreferrer"
          className="flex gap-3 rounded-lg border bg-background p-3 transition-colors hover:bg-accent"
        >
          <LifeBuoyIcon className="mt-0.5 size-4 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-medium">{s.name}</p>
            <p className="text-xs text-muted-foreground">{s.description}</p>
          </div>
        </a>
      ))}
    </div>
  );
}
