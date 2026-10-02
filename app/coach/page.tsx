"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ChatPanel } from "@/components/chat/chat-panel";
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
  if (!loaded) return <div className="h-screen bg-black" />;

  return (
    <main className="min-h-[100dvh] bg-black px-4 py-8 text-white">
      {state ? (
        <ChatPanel prefill={params.get("q") ?? undefined} />
      ) : (
        <p className="text-center text-white/70">Plan a goal first, then we can talk it through.</p>
      )}
    </main>
  );
}
