import { gbp } from "@/lib/format";
import { formatDayMonth } from "@/lib/saver/dates";
import type { Goal } from "@/lib/saver/schema";
import { buildCheckpoints } from "@/lib/timeline/checkpoints";

export function CheckpointLadder({ goal, today, slipped = false }: { goal: Goal; today: string; slipped?: boolean }) {
  const steps = buildCheckpoints(goal, today).filter((item) => item.kind === "step").slice(0, 3);
  return (
    <ol className="grid gap-2">
      {steps.map((step, index) => (
        <li key={step.id} className="flex items-center justify-between text-sm">
          <span className={slipped && index === 0 ? "text-[#8a6a00]" : ""}>
            {gbp(step.amount - goal.savedSoFar)} by {formatDayMonth(step.date)}
          </span>
          <span className="text-[#1a1a1a]/60">{index === 0 ? "Next save" : "Then"}</span>
        </li>
      ))}
    </ol>
  );
}
