"use client";

import { bounceBackCopy, idleCopy, replanCopy, spendCopy } from "@/lib/coach/copy";
import type { CoachEvent, Goal, SaverState } from "@/lib/saver/schema";
import { applyCoachChoice } from "@/lib/saver/actions";
import { divertImpact, replan } from "@/lib/timeline/eta";
import { useSaver } from "@/lib/saver/use-saver-state";
import { useCoach } from "@/components/shell/coach-provider";

export function DecisionAlert({ event, goal }: { event: CoachEvent; goal: Goal }) {
  const { state, save } = useSaver();
  const { openCoach } = useCoach();
  if (!state || event.status !== "new") return null;
  const copy = describe(event, goal, state);
  const active = event.severity === "big" || event.severity === "emergency";

  const choose = (choice: Parameters<typeof applyCoachChoice>[2]) => {
    save(applyCoachChoice(state, event.id, choice));
  };

  return (
    <article className={`grid gap-3 rounded-[20px] p-6 ${active ? "goal-card-active" : "bg-[#ede8e0] text-[#1a1a1a]"}`}>
      <p className="text-center text-[22px] font-medium">{copy.title}</p>
      <p className={`text-center text-[15px] ${active ? "text-white/80" : "text-[#1a1a1a]/60"}`}>{copy.detail}</p>
      <div className="flex flex-wrap justify-center gap-2">
        {event.kind === "spend" && (
          <>
            <Pill onClick={() => choose("kept")} light={active}>Keep plan</Pill>
            <Pill onClick={() => choose("spent")} light={active}>Spend anyway</Pill>
            <Pill onClick={() => choose("move-twenty")} light={active}>Put £20 toward {goal.name}</Pill>
          </>
        )}
        {event.kind === "idle" && <Pill onClick={() => choose("moved")} light={active}>Move it to {goal.name}</Pill>}
        {event.kind === "replan" && (
          <>
            <Pill onClick={() => choose("replan-amount")} light={active}>Keep the date</Pill>
            <Pill onClick={() => choose("replan-date")} light={active}>Move the arrival</Pill>
          </>
        )}
        <Pill onClick={() => openCoach(`Talk me through ${goal.name}`)} light={active}>Talk it through</Pill>
      </div>
      {event.kind === "spend" && event.severity === "big" && (
        <p className={`text-center text-sm ${active ? "text-white/80" : ""}`}>{bounceBackCopy(goal.name, impactDate(goal, state)).detail}</p>
      )}
    </article>
  );
}

function Pill({ children, onClick, light }: { children: React.ReactNode; onClick: () => void; light: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-2 text-sm ${light ? "frosted" : "bg-white"}`}
    >
      {children}
    </button>
  );
}

function describe(event: CoachEvent, goal: Goal, state: SaverState) {
  if (event.kind === "spend") {
    const impact = divertImpact(goal, event.amount, { today: state.today });
    return spendCopy({
      goalName: goal.name,
      amount: event.amount,
      from: impact.onTrackEta ?? goal.targetDate,
      to: impact.divertedEta ?? goal.targetDate,
      deltaDays: event.deltaDays,
    });
  }
  if (event.kind === "idle") return idleCopy(goal.name, event.amount, 4.1);
  const later = replan(goal, state.today, "amount");
  const sooner = replan(goal, state.today, "date");
  return replanCopy(goal.name, sooner.weeklyAmount, goal.targetDate, later.targetDate);
}

function impactDate(goal: Goal, state: SaverState): string {
  return divertImpact(goal, 0, { today: state.today }).onTrackEta ?? goal.targetDate;
}
