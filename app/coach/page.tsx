"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ChatPanel } from "@/components/chat/chat-panel";
import { MeshBand, WhiteSheet } from "@/components/shell/surface";
import { useSaver } from "@/lib/saver/use-saver-state";

export default function CoachPage() {
  return (
    <Suspense fallback={<div className="h-40" />}>
      <CoachScreen />
    </Suspense>
  );
}

function CoachScreen() {
  const params = useSearchParams();
  const { state, loaded } = useSaver();
  const name = state?.profile.name || "there";
  if (!loaded) return <div className="h-40" />;

  return (
    <main>
      <MeshBand label="Coach">
        <header>
          <h1 className="font-display text-[40px] leading-[1.15] font-normal">Hey {name}</h1>
          <p className="font-display text-[32px] leading-[1.15]">What can I help with today?</p>
        </header>
      </MeshBand>
      <WhiteSheet>
        {!state && <p className="text-center text-sm text-[#1a1a1a]/70">Ask a general question now, or make a plan for answers based on your numbers.</p>}
        <ChatPanel prefill={params.get("q") ?? undefined} />
      </WhiteSheet>
    </main>
  );
}
