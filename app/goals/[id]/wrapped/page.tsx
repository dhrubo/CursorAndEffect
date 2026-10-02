"use client";

import { useState } from "react";
import { Wordmark } from "@/components/shell/wordmark";
import { useParams, useRouter } from "next/navigation";
import { buildWrapped } from "@/lib/milestones/wrapped";
import { celebrateCheckpoint } from "@/lib/saver/actions";
import { useSaver } from "@/lib/saver/use-saver-state";

export default function WrappedPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { state, loaded, save } = useSaver();
  const [index, setIndex] = useState(0);
  if (!loaded || !state) return <div className="h-screen" />;
  const slides = buildWrapped(state, params.id, 75);
  const slide = slides[index];
  if (!slide) return null;
  const last = index === slides.length - 1;

  const next = () => {
    if (!last) {
      setIndex((value) => value + 1);
      return;
    }
    save(celebrateCheckpoint(state, params.id, 75));
    router.push(`/goals/${params.id}`);
  };

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-3xl flex-col justify-between px-6 py-16 text-center text-white" onClick={next}>
      <div className="grid justify-items-center gap-4">
        <Wordmark variant="white" className="h-8" />
        <p className="text-sm tracking-wide">{slide.kicker}</p>
      </div>
      <div>
        <h1 className="font-display text-[40px] leading-[1.15]">{slide.headline}</h1>
        <p className="mt-4 text-[17px] text-white/80">{slide.detail}</p>
      </div>
      <button type="button" className="frosted mx-auto rounded-full px-5 py-3 text-[17px]">
        {last ? "What's next" : "Continue"}
      </button>
    </main>
  );
}
