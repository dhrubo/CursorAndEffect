"use client";

import Image from "next/image";
import Link from "next/link";
import { Wordmark } from "@/components/shell/wordmark";
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
    <main className="mx-auto grid max-w-xl gap-6 px-4 py-10">
      <Wordmark variant="gradient" />
      <Image
        src={goalImage(goal)}
        alt=""
        width={640}
        height={360}
        unoptimized
        className={`rounded-[20px] object-cover ${progress > 0.75 ? "h-56 w-full" : "size-24"}`}
      />
      <header>
        <h1 className="font-display text-[32px] font-normal">{goal.name}</h1>
        <p className="text-[15px] text-[#1a1a1a]/60">
          {progress > 0.75 && projection.etaDate
            ? `${goal.name} is close. ${formatDayMonth(projection.etaDate)}.`
            : `${gbp(projection.amountLeft)} still to go${projection.etaDate ? `. Future you, ${formatDayMonth(projection.etaDate)}.` : "."}`}
        </p>
        {goal.whyItMatters && <p className="mt-2 text-[15px]">{goal.whyItMatters}</p>}
      </header>
      <PrimaryTimeline goal={goal} today={state.today} />
      <section className="rounded-[20px] bg-[#ede8e0] p-6">
        <h2 className="mb-3 text-[22px] font-medium">Coming up</h2>
        <CheckpointLadder goal={goal} today={state.today} />
      </section>
      <section className="rounded-[20px] bg-[#ede8e0] p-6">
        <h2 className="mb-3 text-[22px] font-medium">If you spend it</h2>
        <DivertSimulator goal={goal} today={state.today} />
      </section>
      <p className="text-sm text-[#1a1a1a]/60">
        Friday&apos;s save is {gbp(goal.autoSave.amount)}
        {goal.autoSave.cadence === "weekly" ? " a week" : " on payday"}
        {goal.autoSave.enabled ? ", already on." : ", currently paused."}
      </p>
    </main>
  );
}
