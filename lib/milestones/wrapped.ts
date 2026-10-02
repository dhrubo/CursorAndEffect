import { formatDayMonth } from "@/lib/saver/dates";
import { gbp } from "@/lib/format";
import { categoryLabel, categoryTotals } from "@/lib/coach/typology";
import { projectGoal } from "@/lib/timeline/eta";
import type { Goal, SaverState } from "@/lib/saver/schema";

export type WrappedSlide = {
  id: string;
  kicker: string;
  headline: string;
  detail: string;
};

export function buildWrapped(state: SaverState, goalId: string, checkpointPct: number): WrappedSlide[] {
  const goal = state.goals.find((item) => item.id === goalId);
  if (!goal) return [];
  const projection = projectGoal(goal, { today: state.today });
  const arrival = projection.etaDate ? formatDayMonth(projection.etaDate) : formatDayMonth(goal.targetDate);
  const top = categoryTotals(state.transactions)[0];
  const ageLater = goal.horizon === "long" ? state.profile.age + 3 : state.profile.age;

  return [
    {
      id: "saved",
      kicker: goal.name,
      headline: `${gbp(goal.savedSoFar)} is already waiting`,
      detail: `For ${goal.name}. ${goal.whyItMatters ?? "This one is yours."}`,
    },
    {
      id: "closer",
      kicker: "Pulled closer",
      headline: checkpointPct >= 75 ? `${goal.name} is close` : "You brought the date forward",
      detail: `Arrival is ${arrival}. The Friday save is doing the quiet work.`,
    },
    {
      id: "swap",
      kicker: "A choice that helped",
      headline: top ? `${categoryLabel(top.category)} is your biggest outgoing` : "Small swaps add up",
      detail: top
        ? `About ${gbp(top.amount)} over the last few months. One swap there moves ${goal.name}.`
        : `Keeping the save going is what moves ${goal.name}.`,
    },
    {
      id: "future",
      kicker: "Future you",
      headline: `${state.profile.name || "You"}, aged ${ageLater}`,
      detail: `${goal.name} lands on ${arrival}.`,
    },
    {
      id: "next",
      kicker: "What's next",
      headline: nextHeadline(goal),
      detail: "The plan stays on this page. One more save keeps it moving.",
    },
  ];
}

function nextHeadline(goal: Goal): string {
  const left = Math.max(0, goal.targetAmount - goal.savedSoFar);
  if (left <= 0) return `${goal.name} is funded`;
  return `${gbp(left)} still to go for ${goal.name}`;
}
