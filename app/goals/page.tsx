"use client";

import Image from "next/image";
import Link from "next/link";
import { MeshBand, WhiteSheet } from "@/components/shell/surface";
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
        <Link href="/onboarding" className="mt-6 inline-block rounded-full bg-[#1a1a1a] px-5 py-3 text-[17px] text-white">
          Plan a new goal
        </Link>
      </main>
    );
  }

  return (
    <main>
      <MeshBand label="Goals">
        <h1 className="font-display text-[40px] leading-[1.15] font-normal">What you're saving for</h1>
      </MeshBand>
      <WhiteSheet>
        <div className="mx-auto grid max-w-xl grid-cols-2 gap-3">
          {state.goals.map((goal) => {
            const projection = projectGoal(goal, { today: state.today });
            return (
              <Link key={goal.id} href={`/goals/${goal.id}`} className="grid gap-3 rounded-[18px] border border-[#1a1a1a] p-4">
                <Image src={goalImage(goal)} alt="" width={64} height={64} unoptimized className="size-14 rounded-2xl object-cover" />
                <p className="text-[18px] leading-tight">{goal.name}</p>
                <p className="text-[14px] text-[#1a1a1a]/60">
                  {gbp(projection.amountLeft)} to go
                  {projection.etaDate ? ` · ${formatDayMonth(projection.etaDate)}` : ""}
                </p>
              </Link>
            );
          })}
        </div>
      </WhiteSheet>
    </main>
  );
}
