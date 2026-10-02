"use client";

import Link from "next/link";
import { gbp } from "@/lib/format";
import { financialPosition, planInsights } from "@/lib/plan/insights";
import type { Goal, SaverState } from "@/lib/saver/schema";

export function PlanDashboard({ state, onReset }: { state: SaverState; onReset: () => void }) {
  const position = financialPosition(state);
  const summary = planInsights(state).join(" ") || "You're doing well against your goals.";

  return (
    <main>
      <section className="bg-[url('/brand/image-mesh-gradient.jpg')] bg-cover bg-center px-4 pt-6 pb-14">
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
      <section className="relative z-10 -mt-8 min-h-[50vh] rounded-t-[28px] bg-white px-4 pt-6 pb-10 text-[#1a1a1a]">
        <h2 className="mb-4 flex items-center gap-1.5 text-[18px] font-medium">
          <span aria-hidden="true">✦</span> Goals
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {state.goals.map((goal) => (
            <Link
              key={goal.id}
              href={`/goals/${goal.id}`}
              className="grid gap-4 rounded-[18px] border border-[#1a1a1a] p-4 transition-colors hover:bg-[#1a1a1a]/5"
            >
              <p className="max-w-[8rem] text-[18px] leading-tight">{goal.name}</p>
              <GoalRing name={goal.name} value={progressOf(goal)} />
            </Link>
          ))}
        </div>
        <button type="button" className="mt-6 text-sm text-[#1a1a1a]/60 underline-offset-4 hover:underline" onClick={onReset}>
          Start again
        </button>
      </section>
    </main>
  );
}

function progressOf(goal: Goal): number {
  if (goal.targetAmount <= 0) return 0;
  return Math.min(100, Math.round((goal.savedSoFar / goal.targetAmount) * 100));
}

function GoalRing({ name, value }: { name: string; value: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <svg viewBox="0 0 72 72" className="mx-auto size-16" role="img" aria-label={`${name} is ${value}% saved`}>
      <circle cx="36" cy="36" r={radius} fill="none" stroke="#e4e4e4" strokeWidth="8" />
      <circle
        cx="36"
        cy="36"
        r={radius}
        fill="none"
        stroke="#3dce3a"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 36 36)"
      />
    </svg>
  );
}
