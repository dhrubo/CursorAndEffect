"use client";

import Image from "next/image";
import Link from "next/link";
import { Wordmark } from "@/components/shell/wordmark";
import { goalImage } from "@/data/goal-art";
import { gbp } from "@/lib/format";
import { formatDayMonth } from "@/lib/saver/dates";
import { projectGoal } from "@/lib/timeline/eta";
import { useSaver } from "@/lib/saver/use-saver-state";

export default function GoalsPage() {
  const { state, loaded } = useSaver();
  if (!loaded) return <div className="h-40" />;
  if (!state) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="font-display text-[32px]">Goals</h1>
        <p className="mt-3 text-[15px] text-[#1a1a1a]/60">Plan one thing you actually want.</p>
        <Link href="/onboarding" className="mt-6 inline-block rounded-full bg-[#5cd719] px-5 py-3 text-[17px] text-white">
          Plan a new goal
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto grid max-w-xl gap-4 px-4 py-10">
      <Wordmark variant="gradient" />
      <h1 className="font-display text-[32px] font-normal">Goals</h1>
      <div className="grid gap-4">
        {state.goals.map((goal) => {
          const projection = projectGoal(goal, { today: state.today });
          return (
            <Link
              key={goal.id}
              href={`/goals/${goal.id}`}
              className={`grid gap-3 rounded-[20px] p-6 ${goal.isPrimary ? "goal-card-active" : "bg-[#ede8e0] text-[#1a1a1a]"}`}
            >
              <Image src={goalImage(goal)} alt="" width={64} height={64} unoptimized className="size-16 rounded-2xl object-cover" />
              <p className="text-[22px] font-medium">{goal.name}</p>
              <p className={`text-[15px] ${goal.isPrimary ? "text-white/80" : "text-[#1a1a1a]/60"}`}>
                {gbp(projection.amountLeft)} still to go
                {projection.etaDate ? ` · ${formatDayMonth(projection.etaDate)}` : ""}
              </p>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
