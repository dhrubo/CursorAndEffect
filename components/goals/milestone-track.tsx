"use client";

import { useState } from "react";
import { spokenDate } from "@/lib/dates";
import { distanceLeftLine, nextMilestone, type Milestone } from "@/lib/goals/milestones";
import { cn } from "cn";

export function MilestoneTrack({ milestones }: { milestones: Milestone[] }) {
  const upcoming = nextMilestone(milestones);
  const [selectedId, setSelectedId] = useState<string | null>(upcoming?.id ?? milestones[0]?.id ?? null);
  const selected = milestones.find((milestone) => milestone.id === selectedId) ?? upcoming ?? milestones[0];

  if (milestones.length === 0) {
    return (
      <p className="text-[15px] text-nuture-ink/60">
        Milestones show up once the plan has a buffer, a fund or a goal.
      </p>
    );
  }

  return (
    <ol className="grid gap-4">
      {milestones.map((milestone) => {
        const active = milestone.id === selected?.id;
        const line = distanceLeftLine(milestone);
        return (
          <li key={milestone.id}>
            <button
              type="button"
              aria-pressed={active}
              aria-label={`${milestone.label}, ${line}`}
              onClick={() => setSelectedId(milestone.id)}
              className={cn(
                "flex min-h-11 w-full flex-col items-start gap-2 rounded-[20px] p-6 text-left transition-colors duration-300 ease-in-out motion-reduce:transition-none",
                active
                  ? "bg-gradient-to-br from-nuture-lime to-nuture-acid text-white"
                  : "bg-nuture-cream text-nuture-ink",
              )}
            >
              <span className={cn("text-[15px]", active ? "text-white/80" : "text-nuture-ink/60")}>{milestone.label}</span>
              <span className={cn("text-[1.75rem] leading-tight", active ? "font-serif text-white" : "font-medium")}>
                {line}
              </span>
              <span className={cn("text-[15px]", active ? "text-white/80" : "text-nuture-ink/60")}>
                {milestone.source === "goal" ? "Your goal" : "From the plan"}
                {milestone.crossedAt ? ` · reached ${spokenDate(milestone.crossedAt)}` : ""}
                {!milestone.crossedAt && !milestone.projectedDate ? " · a date opens once spare cash does" : ""}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
