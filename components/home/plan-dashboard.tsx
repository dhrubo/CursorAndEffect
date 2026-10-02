"use client";

import Link from "next/link";
import { gbp } from "@/lib/format";
import { financialPosition, planInsights } from "@/lib/plan/insights";
import type { SaverState } from "@/lib/saver/schema";

export function PlanDashboard({ state }: { state: SaverState }) {
  const position = financialPosition(state);
  const summary = planInsights(state).join(" ") || "You're doing well against your goals.";

  return (
    <main>
      <section className="px-4 pt-6 pb-6">
        <p className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/30 px-3 py-1 text-[14px] text-[#1a1a1a] backdrop-blur-md">
          <span aria-hidden="true">✦</span> Summary
        </p>
        <p className="mt-4 rounded-[22px] border border-white/75 bg-white/30 px-4 py-4 text-[17px] leading-relaxed text-[#1a1a1a] backdrop-blur-md">
          {summary}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <figure className="rounded-[18px] border border-white/75 bg-white/30 px-4 py-3 backdrop-blur-md">
            <figcaption className="text-[14px] text-[#1a1a1a]">Net worth</figcaption>
            <p className="text-[28px] leading-tight font-medium text-[#1a1a1a] tabular-nums">{gbp(position.netWorth)}</p>
          </figure>
          <figure className="rounded-[18px] border border-white/75 bg-white/30 px-4 py-3 backdrop-blur-md">
            <figcaption className="text-[14px] text-[#1a1a1a]">Credit</figcaption>
            <p className="text-[28px] leading-tight font-medium text-[#1a1a1a] tabular-nums">{gbp(-position.debts)}</p>
          </figure>
        </div>
      </section>
      <section className="px-4 pt-2 pb-10 text-[#1a1a1a]">
        <h2 className="mb-4 flex items-center gap-1.5 text-[18px] font-medium">
          <span aria-hidden="true">✦</span> Goals
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {state.goals.map((goal) => (
            <Link
              key={goal.id}
              href={`/goals/${goal.id}`}
              className="grid gap-4 rounded-[18px] border border-white/75 bg-white/30 p-4 backdrop-blur-md transition-colors hover:bg-white/45"
            >
              <p className="max-w-[8rem] text-[18px] leading-tight">{goal.name}</p>
              <GoalRing name={goal.name} saved={goal.savedSoFar} target={goal.targetAmount} />
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

function progressOf(saved: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((saved / target) * 100));
}

function GoalRing({ name, saved, target }: { name: string; saved: number; target: number }) {
  const value = progressOf(saved, target);
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div className="grid justify-items-center gap-2">
      <svg viewBox="0 0 72 72" className="size-16" role="img" aria-label={`${name}: ${gbp(saved)} saved of ${gbp(target)}`}>
        <circle cx="36" cy="36" r={radius} fill="none" stroke="rgb(255 255 255 / 55%)" strokeWidth="8" />
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke="#1a1a1a"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 36 36)"
        />
      </svg>
      <p className="text-center text-[13px] leading-tight tabular-nums">
        {gbp(saved)} saved
        <span className="block text-[#1a1a1a]/70">of {gbp(target)}</span>
      </p>
    </div>
  );
}
