"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DecisionAlert } from "@/components/coach/decision-alert";
import { BrandStar } from "@/components/shell/brand-mark";
import { Wordmark } from "@/components/shell/wordmark";
import { PrimaryTimeline } from "@/components/timeline/primary-timeline";
import { goalImage } from "@/data/goal-art";
import { gbp } from "@/lib/format";
import { formatDayMonth } from "@/lib/saver/dates";
import { openCoachEvents, primaryGoal } from "@/lib/coach/rules";
import { payCycleStack } from "@/lib/timeline/budget";
import { projectGoal } from "@/lib/timeline/eta";
import { useSaver } from "@/lib/saver/use-saver-state";

export default function HomePage() {
  const { state, loaded } = useSaver();
  const router = useRouter();
  useEffect(() => {
    if (loaded && !state) router.replace("/");
  }, [loaded, state, router]);
  if (!loaded || !state) return <div className="h-screen" />;
  const goal = primaryGoal(state);
  const projection = goal ? projectGoal(goal, { today: state.today }) : null;
  const cycle = payCycleStack(state);
  const notes = openCoachEvents(state);
  const name = state.profile.name || "there";

  return (
    <main className="mx-auto grid max-w-3xl gap-8 px-4 py-8 text-white">
      <Wordmark variant="white" className="h-8" />
      <div className="flex items-center justify-between">
        <Link href="/coach" className="frosted inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm">
          <BrandStar className="size-3.5" /> Assistant
        </Link>
        <Link href="/money-health" className="frosted flex size-10 items-center justify-center rounded-full text-sm" aria-label="Profile">
          {name.slice(0, 1)}
        </Link>
      </div>
      <header className="text-center">
        <h1 className="font-display text-[40px] leading-[1.15] font-normal">Hey {name}</h1>
        <p className="font-display text-[40px] leading-[1.15]">What can I help with today</p>
      </header>
      {goal && projection && (
        <section className="grid gap-4">
          <div className="flex items-center gap-3">
            <Image src={goalImage(goal)} alt="" width={56} height={56} unoptimized className="size-14 rounded-2xl object-cover" />
            <div>
              <p className="text-[22px] font-medium">{goal.name}</p>
              <p className="text-[15px] text-white/80">
                {gbp(projection.amountLeft)} still to go
                {projection.etaDate ? ` · future you, ${formatDayMonth(projection.etaDate)}` : ""}
              </p>
            </div>
          </div>
          <PrimaryTimeline goal={goal} today={state.today} light />
        </section>
      )}
      <p className="text-center text-[15px] text-white/80">
        {cycle.leftForGoals >= 0
          ? `${gbp(cycle.leftForGoals)} is still yours until payday.`
          : "This pay cycle is tight. The Friday save still stands."}
      </p>
      <div className="grid gap-4">
        {notes.map((event) => {
          const eventGoal = state.goals.find((item) => item.id === event.goalId);
          return eventGoal ? <DecisionAlert key={event.id} event={event} goal={eventGoal} /> : null;
        })}
      </div>
      <div className="text-center">
        <Link href="/onboarding" className="frosted inline-block rounded-full px-5 py-3 text-[17px]">
          Plan a new goal
        </Link>
      </div>
    </main>
  );
}
