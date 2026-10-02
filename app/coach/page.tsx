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
  if (!loaded) return <div className="h-screen" />;

  return (
    <main className="mx-auto flex min-h-[78vh] max-w-xl flex-col gap-4 px-4 py-8 text-[#1a1a1a]">
      <Wordmark variant="white" className="h-8 !text-[#1a1a1a]" />
      <h1 className="font-display text-[32px] leading-tight font-normal">Your plans</h1>
      {!state && <p className="text-[15px] text-[#1a1a1a]/70">Ask a general question now, or make a plan for answers based on your numbers.</p>}
      <ChatPanel prefill={params.get("q") ?? undefined} />
    </main>
  );
}
