"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ChatPanel } from "@/components/chat/chat-panel";
import { Wordmark } from "@/components/shell/wordmark";
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
    <main className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-6 text-white">
      <Wordmark variant="white" className="h-8" />
      <header className="text-center">
        <h1 className="font-display text-[clamp(2rem,4vw,2.75rem)] leading-[1.15] font-normal">Hey {name}</h1>
        <p className="font-display text-[clamp(2rem,4vw,2.75rem)] leading-[1.15]">What can I help with today?</p>
      </header>
      {!state && <p className="text-center text-sm text-white/80">Ask a general question now, or make a plan for answers based on your numbers.</p>}
      <ChatPanel prefill={params.get("q") ?? undefined} />
    </main>
  );
}
