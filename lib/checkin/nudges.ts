import type { Plan, Warning } from "@/lib/finance/ladder";
import type { SpendingReview, SpendingSuggestion } from "@/lib/spending/insights";

export type Nudge = {
  id: string;
  title: string;
  detail: string;
  prompt: string;
  level: Warning["level"];
};

export function buildNudges(input: {
  plan: Plan;
  review: SpendingReview;
  suggestions: SpendingSuggestion[];
}): Nudge[] {
  const nudges: Nudge[] = [];

  for (const warning of input.plan.warnings) {
    nudges.push({
      id: `warning:${warning.title}`,
      title: warning.title,
      detail: warning.detail,
      prompt: `How should I handle this: ${warning.title}?`,
      level: warning.level,
    });
  }

  for (const suggestion of input.suggestions) {
    nudges.push({
      id: `spend:${suggestion.id}`,
      title: suggestion.title,
      detail: suggestion.planEffect.progressLine,
      prompt: "What spending could I cut?",
      level: suggestion.kind === "unused_subscription" ? "warning" : "info",
    });
  }

  const quietMover = input.review.topMovers.find(
    (mover) => mover.delta >= 20 && !input.suggestions.some((suggestion) => suggestion.category === mover.category),
  );
  if (quietMover) {
    nudges.push({
      id: `mover:${quietMover.category}`,
      title: `${quietMover.label} jumped`,
      detail: `${quietMover.label} moved by ${quietMover.delta >= 0 ? "+" : ""}${quietMover.delta} since ${input.review.previousMonth ?? "the month before"}.`,
      prompt: "What changed in my spending?",
      level: "info",
    });
  }

  return nudges.slice(0, 6);
}
