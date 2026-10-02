"use client";

import { MessageCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
        size="sm"
        className="relative"
        aria-expanded={open}
        aria-label={count > 0 ? `Open money guide, ${count} nudges` : "Open money guide"}
        onClick={() => setOpen(true)}
      >
        <MessageCircleIcon />
        <span className="hidden sm:inline">Guide</span>
        {count > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="gap-0 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Money guide</SheetTitle>
            <SheetDescription>
              {scripted
                ? "Scripted replies until a Claude key is set. Figures come from the calculators."
                : "Chat about your plan. Figures come from the calculators."}
            </SheetDescription>
          </SheetHeader>
          <ChatPanel variant="dock" />
        </SheetContent>
      </Sheet>
    </>
  );
}
