"use client";

import { useState } from "react";
import { formatUkDate } from "@/lib/dates";
import { gbp } from "@/lib/format";
import { nextMilestone, type Milestone } from "@/lib/goals/milestones";
import { cn } from "cn";
import { Progress } from "@/components/ui/progress";

export function MilestoneTrack({ milestones }: { milestones: Milestone[] }) {
  const upcoming = nextMilestone(milestones);
  const [selectedId, setSelectedId] = useState<string | null>(upcoming?.id ?? milestones[0]?.id ?? null);
  const selected = milestones.find((milestone) => milestone.id === selectedId) ?? upcoming ?? milestones[0];

  if (milestones.length === 0) {
    return <p className="text-sm text-muted-foreground">Milestones appear once the plan has a buffer, a fund or a goal.</p>;
  }

  return (
    <div className="grid gap-4">
      <div className="overflow-x-auto pb-1">
        <ol className="flex min-w-max items-start">
          {milestones.map((milestone, index) => {
            const crossed = milestone.pct >= 100;
            const isNext = milestone.id === upcoming?.id;
            const active = milestone.id === selected?.id;
            return (
              <li key={milestone.id} className="flex w-36 flex-col items-center">
                <div className="flex w-full items-center">
                  <span className={cn("h-px flex-1", index === 0 ? "bg-transparent" : crossed ? "bg-primary" : "bg-border")} />
                  <button
                    type="button"
                    aria-pressed={active}
                    aria-label={`${milestone.label}, ${milestone.pct}%`}
                    onClick={() => setSelectedId(milestone.id)}
                    className={cn(
                      "size-4 shrink-0 rounded-full border-2 motion-safe:transition-colors motion-reduce:transition-none",
                      crossed ? "border-primary bg-primary" : "border-muted-foreground/40 bg-background",
                      isNext && "size-5 ring-4 ring-primary/30",
                      active && "outline-2 outline-offset-2 outline-primary",
                    )}
                  />
                  <span
                    className={cn(
                      "h-px flex-1",
                      index === milestones.length - 1 ? "bg-transparent" : "bg-border",
                    )}
                  />
                </div>
                <p className={cn("mt-2 px-1 text-center text-xs", isNext ? "font-medium" : "text-muted-foreground")}>
                  {milestone.label}
                </p>
                {isNext && milestone.projectedDate && (
                  <p className="px-1 text-center text-[11px] text-muted-foreground">Around {formatUkDate(milestone.projectedDate)}</p>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {selected && (
        <div className="grid gap-2 rounded-lg border p-3 text-sm motion-reduce:transition-none">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-medium">{selected.label}</p>
            <p className="text-xs text-muted-foreground">{selected.source === "goal" ? "Your goal" : "From the plan"}</p>
          </div>
          <p className="tabular-nums">
            {gbp(selected.current)} of {gbp(selected.target)} · {selected.pct}%
          </p>
          <Progress value={selected.pct} />
          {selected.crossedAt && <p className="text-muted-foreground">Reached {formatUkDate(selected.crossedAt)}.</p>}
          {!selected.crossedAt && selected.projectedDate && (
            <p className="text-muted-foreground">
              At current spare cash, plus anything spending could free up, around {formatUkDate(selected.projectedDate)}.
            </p>
          )}
          {!selected.crossedAt && !selected.projectedDate && (
            <p className="text-muted-foreground">There isn&apos;t spare cash to put a date on this yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
