"use client";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { FourPointStar } from "@/components/four-point-star";
import { ChatPanel } from "./chat-panel";
import { useAssistant } from "./assistant-provider";

export function AssistantDock() {
  const { open, setOpen, nudges, scripted } = useAssistant();
  const count = nudges.length;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="relative min-h-11 rounded-full border-white bg-white/70 px-4 text-[15px] text-nuture-ink backdrop-blur-md hover:bg-white"
        aria-expanded={open}
        aria-label={count > 0 ? `Open Coach, ${count} notes` : "Open Coach"}
        onClick={() => setOpen(true)}
      >
        <FourPointStar className="text-base" />
        Coach
        {count > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-nuture-ink px-1 text-[10px] font-medium text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </Button>
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
          <ChatPanel variant="dock" />
        </SheetContent>
      </Sheet>
    </>
  );
}
