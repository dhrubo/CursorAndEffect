"use client";

import { FourPointStar } from "@/components/four-point-star";
import { CheckInCard } from "@/components/checkin/checkin-card";
import { MilestoneTrack } from "@/components/goals/milestone-track";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { distanceLeftLine } from "@/lib/goals/milestones";
import { cn } from "cn";
import { ChatPanel } from "./chat-panel";
import { useAssistant, type CoachView } from "./assistant-provider";

export function CoachTrigger({ appearance }: { appearance: "pill" | "tab" }) {
  const { open, openCoach, unreadCount } = useAssistant();
  const label = unreadCount > 0 ? `Open Coach, ${unreadCount} notes` : "Open Coach";
  const badge =
    unreadCount > 0 ? (
      <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-nuture-ink px-1 text-[10px] font-medium text-white">
        {unreadCount > 9 ? "9+" : unreadCount}
      </span>
    ) : null;

  if (appearance === "tab") {
    return (
      <button
        type="button"
        className={cn(
          "relative flex min-h-11 min-w-16 flex-1 flex-col items-center justify-center gap-1 text-[13px]",
          open ? "text-nuture-ink" : "text-[#8a8680]",
        )}
        aria-expanded={open}
        aria-label={label}
        onClick={openCoach}
      >
        <span className="relative">
          <FourPointStar className="text-xl" />
          {badge}
        </span>
        Coach
      </button>
    );
  }

  return (
    <button
      type="button"
      className="relative inline-flex min-h-11 items-center gap-2 rounded-full border border-white bg-white/70 px-4 text-[15px] text-nuture-ink backdrop-blur-md hover:bg-white"
      aria-expanded={open}
      aria-label={label}
      onClick={openCoach}
    >
      <FourPointStar className="text-base" />
      Coach
      {badge}
    </button>
  );
}

function ViewTab({
  selected,
  children,
  onSelect,
}: {
  selected: boolean;
  children: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "min-h-11 rounded-full px-4 text-[15px]",
        selected ? "bg-nuture-ink text-white" : "bg-nuture-cream text-nuture-ink",
      )}
    >
      {children}
    </button>
  );
}

function ForYou() {
  const { profile, checkin, milestones, nudges, openWith } = useAssistant();

  if (!profile || !checkin) {
    return (
      <p className="px-4 py-6 text-[15px] text-nuture-ink/60">
        Add your numbers, or load a demo household, and Coach can walk through that plan.
      </p>
    );
  }

  return (
    <div className="grid gap-6 px-4 py-4">
      <CheckInCard checkin={checkin} />
      <section className="grid gap-3">
        <h2 className="text-[15px] text-nuture-ink/60">Milestones</h2>
        <MilestoneTrack
          milestones={milestones}
          onTalk={(milestone) => openWith(`Talk me through ${milestone.label}. ${distanceLeftLine(milestone)}`)}
        />
      </section>
      <section className="grid gap-3">
        <h2 className="text-[15px] text-nuture-ink/60">Worth a look</h2>
        {nudges.length === 0 ? (
          <p className="text-[15px] text-nuture-ink/60">Nothing to raise right now.</p>
        ) : (
          <ul className="grid gap-3">
            {nudges.map((nudge) => (
              <li key={nudge.id} className="grid gap-3 rounded-[20px] bg-nuture-cream p-6 text-nuture-ink">
                <p className="text-[15px] font-medium">{nudge.title}</p>
                <p className="text-[15px] text-nuture-ink/60">{nudge.detail}</p>
                <button
                  type="button"
                  className="min-h-11 w-fit rounded-full bg-nuture-ink px-5 text-[17px] text-white"
                  onClick={() => openWith(nudge.prompt)}
                >
                  Talk it through
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export function AssistantDock() {
  const { open, setOpen, view, setView, scripted } = useAssistant();
  const choose = (next: CoachView) => setView(next);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="gap-0 bg-nuture-paper p-0 shadow-none">
        <SheetHeader className="sr-only">
          <SheetTitle>Coach</SheetTitle>
          <SheetDescription>
            {scripted
              ? "Scripted replies without an xAI key. Figures come from the calculators."
              : "Chat about your plan. Figures come from the calculators."}
          </SheetDescription>
        </SheetHeader>
        <div className="flex items-center gap-2 border-b px-4 py-3 pr-12">
          <ViewTab selected={view === "foryou"} onSelect={() => choose("foryou")}>
            For you
          </ViewTab>
          <ViewTab selected={view === "chat"} onSelect={() => choose("chat")}>
            Chat
          </ViewTab>
        </div>
        <div className={cn("min-h-0 flex-1", view === "chat" ? "overflow-hidden" : "overflow-y-auto")}>
          {view === "foryou" ? <ForYou /> : <ChatPanel variant="dock" className="h-full" />}
        </div>
      </SheetContent>
    </Sheet>
  );
}
