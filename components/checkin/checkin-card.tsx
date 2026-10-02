"use client";

import type { CheckIn } from "@/lib/checkin/build";
import { Button } from "@/components/ui/button";
import { useAssistant } from "@/components/chat/assistant-provider";

export function CheckInCard({ checkin }: { checkin: CheckIn }) {
  const { openWith } = useAssistant();
  const win = checkin.wins[0];
  const risk = checkin.risks[0];

  return (
    <section className="grid gap-4 rounded-[20px] bg-nuture-cream p-6 text-nuture-ink">
      <h2 className="font-serif text-[2rem] leading-[1.15]">{checkin.headline}</h2>
      <p className="text-[15px] text-nuture-ink/60">{checkin.summary}</p>
      <div className="grid gap-3 text-[15px]">
        {win && (
          <p>
            <span className="font-medium">One thing going well. </span>
            {win.title}. {win.detail}
          </p>
        )}
        {risk && (
          <p>
            <span className="font-medium">One thing to watch. </span>
            {risk.title}
          </p>
        )}
        <p>
          <span className="font-medium">Next step. </span>
          {checkin.nextAction.title}. {checkin.nextAction.detail}
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          className="min-h-11 rounded-full bg-nuture-ink px-5 text-[17px] text-white hover:bg-nuture-ink/90"
          onClick={() => openWith("How am I doing?")}
        >
          How am I doing
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 rounded-full border-nuture-ink/15 bg-transparent px-5 text-[17px] text-nuture-ink hover:bg-white/50"
          onClick={() => openWith("What spending could I cut?")}
        >
          A spending idea
        </Button>
      </div>
    </section>
  );
}
