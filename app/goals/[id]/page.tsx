"use client";

import Image from "next/image";
import Link from "next/link";
import { GlassCard, MeshBand, WhiteSheet } from "@/components/shell/surface";
import { useParams } from "next/navigation";
import { CheckpointLadder } from "@/components/timeline/checkpoint-ladder";
import { DivertSimulator } from "@/components/timeline/divert-simulator";
import { PrimaryTimeline } from "@/components/timeline/primary-timeline";
import { goalImage } from "@/data/goal-art";
import { gbp } from "@/lib/format";
import { formatDayMonth } from "@/lib/saver/dates";
import { projectGoal } from "@/lib/timeline/eta";
import { useSaver } from "@/lib/saver/use-saver-state";

export default function GoalDetailPage() {
  const params = useParams<{ id: string }>();
  const { state, loaded } = useSaver();
  if (!loaded) return <div className="h-40" />;
  const goal = state?.goals.find((item) => item.id === params.id);
  if (!state || !goal) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16">
        <p>That plan is not here.</p>
        <Link href="/goals" className="underline">Back to goals</Link>
      </main>
    );
  }
  const projection = projectGoal(goal, { today: state.today });
  const progress = goal.targetAmount > 0 ? goal.savedSoFar / goal.targetAmount : 0;

  return (
    <main>
      <MeshBand label="Goal">
        <GlassCard className="grid gap-3">
          <Image
            src={goalImage(goal)}
            alt=""
            width={640}
            height={360}
            unoptimized
            className={`rounded-2xl object-cover ${progress > 0.75 ? "h-40 w-full" : "size-16"}`}
          />
          <h1 className="font-display text-[32px] leading-tight font-normal">{goal.name}</h1>
          <p className="text-[15px]">
            {progress > 0.75 && projection.etaDate
              ? `${goal.name} is close. ${formatDayMonth(projection.etaDate)}.`
              : `${gbp(projection.amountLeft)} still to go${projection.etaDate ? `. Future you, ${formatDayMonth(projection.etaDate)}.` : "."}`}
          </p>
          {goal.whyItMatters && <p className="text-[15px]">{goal.whyItMatters}</p>}
        </GlassCard>
      </MeshBand>
      <WhiteSheet className="grid gap-4">
      <PrimaryTimeline goal={goal} today={state.today} />
      <section className="rounded-[18px] border border-[#1a1a1a] p-5">
        <h2 className="mb-3 text-[18px] font-medium">Coming up</h2>
        <CheckpointLadder goal={goal} today={state.today} />
      </section>
      <section className="rounded-[18px] border border-[#1a1a1a] p-5">
        <h2 className="mb-3 text-[18px] font-medium">If you spend it</h2>
        <DivertSimulator goal={goal} today={state.today} />
      </section>
      <p className="text-sm text-[#1a1a1a]/60">
        Friday&apos;s save is {gbp(goal.autoSave.amount)}
        {goal.autoSave.cadence === "weekly" ? " a week" : " on payday"}
        {goal.autoSave.enabled ? ", already on." : ", currently paused."}
      </p>
      </WhiteSheet>
    </main>
  );
}
