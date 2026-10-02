"use client";

import { useMemo, useState } from "react";
import {
  applySuggestion,
  buildCoach,
  coffeeWeek,
  formatDay,
  gbpExact,
  idleCashWeek,
  nightOutWeek,
  quietWeek,
  type CoachLane,
  type Week,
} from "@/lib/coach/model";

const MOMENTS: { id: string; label: string; make: (name: string) => Week }[] = [
  { id: "night", label: "Night out £46", make: nightOutWeek },
  { id: "coffee", label: "Coffee £3.40", make: coffeeWeek },
  { id: "quiet", label: "Quiet week", make: quietWeek },
  { id: "idle", label: "Idle £600 lands", make: idleCashWeek },
];

export function CoachScreen({ name }: { name: string }) {
  const [moment, setMoment] = useState("night");
  const [week, setWeek] = useState<Week>(() => nightOutWeek(name));
  const view = useMemo(() => buildCoach({ ...week, name }), [week, name]);

  function chooseMoment(id: string) {
    const next = MOMENTS.find((item) => item.id === id);
    if (!next) return;
    setMoment(id);
    setWeek(next.make(name));
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 text-[#1A1A1A] sm:py-12">
      <header className="grid gap-3">
        <p className="font-[family-name:var(--font-inknut)] text-[28px] leading-none text-[#1A1A1A] sm:text-[34px]">
          Nuture
        </p>
        <h1 className="font-[family-name:var(--font-inknut)] text-[40px] leading-[1.15] tracking-tight sm:text-5xl">
          Coach
        </h1>
        <p className="max-w-xl text-[17px] text-[#1A1A1A]/80">
          <span aria-hidden="true">✦ </span>
          Hey {view.name}, what can I help with today
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <TimelineChip label="Distance left" value={`${gbpExact(view.amountLeft)} · ${view.goalName}`} />
        <TimelineChip label="On track" value={formatDay(view.onTrackDate)} />
        <TimelineChip
          label={view.delayDays > 0 ? "If this spend stands" : "If you move what's left"}
          value={formatDay(view.delayDays > 0 ? view.divertedDate : view.soonerDate)}
          hot={view.delayDays > 0}
        />
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(16rem,20rem)_1fr]">
        <section aria-labelledby="coach-monitor" className="grid gap-3">
          <h2 id="coach-monitor" className="font-[family-name:var(--font-inknut)] text-[32px] leading-none">
            Coach
          </h2>
          <LaneCard lane={view.monitor} onApply={(id) => setWeek((current) => applySuggestion(current, id))} />
          <p className="text-[13px] text-[#1A1A1A]/60">
            The monitor watches this pay cycle, then hands anything it notices to the spending coach.
          </p>
        </section>

        <section aria-labelledby="spending-coach" className="grid gap-3">
          <h2 id="spending-coach" className="font-[family-name:var(--font-inknut)] text-[32px] leading-none">
            Spending coach
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <LaneCard lane={view.save} onApply={(id) => setWeek((current) => applySuggestion(current, id))} />
            <LaneCard lane={view.utilise} onApply={(id) => setWeek((current) => applySuggestion(current, id))} />
          </div>
        </section>
      </div>

      <section className="grid gap-3">
        <h2 className="text-[15px]">Try a moment</h2>
        <div className="flex flex-wrap gap-2">
          {MOMENTS.map((item) => {
            const selected = item.id === moment;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={selected}
                onClick={() => chooseMoment(item.id)}
                className={`rounded-full px-4 py-2 text-[15px] transition-colors ${
                  selected ? "bg-[#5CD719] text-[#1A1A1A]" : "bg-[#EDE8E0] text-[#1A1A1A]"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        <p className="max-w-2xl text-[13px] text-[#1A1A1A]/60">
          Dates come from the weekly auto-save of {gbpExact(view.nextCheckpoint)}. A night out of £46 is 8 days
          on this plan. Guidance, not regulated advice. Rates are illustrative.
        </p>
      </section>
    </div>
  );
}

function TimelineChip({ label, value, hot = false }: { label: string; value: string; hot?: boolean }) {
  return (
    <div className={`rounded-[20px] px-5 py-4 ${hot ? "bg-[#1A1A1A] text-white" : "bg-[#EDE8E0]"}`}>
      <p className={`text-[13px] ${hot ? "text-white/70" : "text-[#1A1A1A]/60"}`}>{label}</p>
      <p className="mt-1 text-[22px] leading-tight">{value}</p>
    </div>
  );
}

function LaneCard({ lane, onApply }: { lane: CoachLane; onApply: (id: string) => void }) {
  return (
    <article
      className={`grid min-h-64 content-start gap-4 rounded-[20px] p-6 text-[#1A1A1A] ${
        lane.active ? "bg-[linear-gradient(160deg,#5CD719_0%,#C8E000_100%)]" : "bg-[#EDE8E0]"
      }`}
    >
      <h3 className="text-[22px] leading-snug font-medium">{lane.title}</h3>
      <p className="text-[15px] leading-relaxed text-[#1A1A1A]/75">{lane.body}</p>
      {lane.suggestions.length > 0 && (
        <ul className="grid gap-2">
          {lane.suggestions.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onApply(item.id)}
                className="w-full rounded-full bg-white/55 px-4 py-3 text-left text-[15px] text-[#1A1A1A] hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1A1A]"
              >
                <span className="block">{item.title}</span>
                <span className="mt-0.5 block text-[13px] text-[#1A1A1A]/65">{item.detail}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
