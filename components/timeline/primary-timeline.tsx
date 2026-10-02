import { gbp } from "@/lib/format";
import { formatDayMonth } from "@/lib/saver/dates";
import type { Goal } from "@/lib/saver/schema";
import { buildCheckpoints } from "@/lib/timeline/checkpoints";
import { divertImpact, projectGoal } from "@/lib/timeline/eta";

export function PrimaryTimeline({
  goal,
  today,
  divertAmount = 0,
  light = false,
}: {
  goal: Goal;
  today: string;
  divertAmount?: number;
  light?: boolean;
}) {
  const projection = projectGoal(goal, { today });
  const impact = divertAmount > 0 ? divertImpact(goal, divertAmount, { today }) : null;
  const points = buildCheckpoints(goal, today).slice(0, 5);
  const end = projection.daysLeft && projection.daysLeft > 0 ? projection.daysLeft : 1;
  const ink = light ? "rgba(255,255,255,0.9)" : "#1A1A1A";
  const track = light ? "rgba(255,255,255,0.85)" : "#5CD719";

  return (
    <div className="grid gap-3">
      <svg viewBox="0 0 320 88" className="w-full" role="img" aria-label={`${goal.name}: ${gbp(goal.savedSoFar)} saved of ${gbp(goal.targetAmount)}`}>
        <line x1="16" y1="44" x2="304" y2="44" stroke={track} strokeWidth="4" strokeLinecap="round" />
        {impact && impact.deltaDays > 0 && (
          <line
            x1="16"
            y1="62"
            x2={xFor(end + impact.deltaDays, end + impact.deltaDays)}
            y2="62"
            stroke="#C8E000"
            strokeWidth="3"
            strokeDasharray="5 4"
            strokeLinecap="round"
          />
        )}
        {points.map((point) => {
          const days = Math.max(0, daysFrom(today, point.date));
          const cx = xFor(Math.min(days, end), end);
          const slipped = impact && impact.deltaDays > 0 && point.kind !== "finish";
          return (
            <g key={point.id}>
              <circle cx={cx} cy="44" r={point.kind === "finish" ? 7 : 5} fill={slipped ? "#C8E000" : "#FFFFFF"} stroke={ink} strokeWidth="2" />
            </g>
          );
        })}
      </svg>
      <div className={`flex justify-between gap-3 text-[13px] ${light ? "text-white/80" : "text-[#1a1a1a]/60"}`}>
        <span>{gbp(goal.savedSoFar)} saved</span>
        <span>Goal {gbp(goal.targetAmount)}</span>
      </div>
      <div className={`flex justify-between text-[13px] ${light ? "text-white/80" : "text-[#1a1a1a]/60"}`}>
        <span>Today</span>
        <span>{projection.etaDate ? formatDayMonth(projection.etaDate) : "Set a save"}</span>
      </div>
      {impact && impact.divertedEta && impact.onTrackEta && (
        <p className={`text-sm ${light ? "text-white" : "text-[#1a1a1a]"}`}>
          {formatDayMonth(impact.divertedEta)} if you spend £{Math.round(divertAmount)} today, instead of{" "}
          {formatDayMonth(impact.onTrackEta)}.
        </p>
      )}
    </div>
  );
}

function xFor(day: number, end: number): number {
  return 16 + (288 * day) / end;
}

function daysFrom(today: string, date: string): number {
  const ms = new Date(`${date}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime();
  return Math.round(ms / 86_400_000);
}
