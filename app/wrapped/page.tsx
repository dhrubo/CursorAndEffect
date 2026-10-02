"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { buildWrappedStory, type WrappedStory } from "@/lib/wrapped/story";
import { useGoals } from "@/lib/use-goals";
import { useHistory } from "@/lib/use-history";
import { useProfile } from "@/lib/use-profile";
import { usePrefersReducedMotion } from "@/lib/motion/use-reduced-motion";
import { Celebration } from "@/components/wrapped/celebration";
import { Button } from "@/components/ui/button";
import { cn } from "cn";

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export default function WrappedPage() {
  const { profile, loaded } = useProfile();
  const { goals } = useGoals(profile?.name ?? "");
  const { snapshots } = useHistory(profile?.name ?? "");
  const reduce = usePrefersReducedMotion();
  const client = useIsClient();
  const [index, setIndex] = useState(0);

  const storyResult = useMemo(() => {
    if (!client || !profile) return { story: null, error: false };
    try {
      return { story: buildWrappedStory({ profile, goals, history: snapshots }), error: false };
    } catch {
      return { story: null, error: true };
    }
  }, [client, profile, goals, snapshots]);
  const story = storyResult.story;

  if (!loaded || (profile && !client)) {
    return <div className="h-[calc(100dvh-3.5rem-5rem)] w-full animate-pulse bg-nuture-lime/40 sm:h-[calc(100dvh-3.5rem)]" />;
  }

  if (!profile) {
    return (
      <div className="mx-auto grid w-full max-w-xl gap-4 px-4 py-20 text-center">
        <h1 className="font-serif text-[2rem] leading-tight">Nothing to wrap yet</h1>
        <p className="text-[15px] text-nuture-ink/60">
          Load Priya, Sam or Mark, or enter your own numbers, and this story fills in from the plan.
        </p>
        <div>
          <Button asChild className="min-h-11 rounded-full bg-nuture-ink px-5 text-white hover:bg-nuture-ink/90">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (storyResult.error || !story) {
    return (
      <div className="mx-auto grid w-full max-w-xl gap-4 px-4 py-20 text-center">
        <h1 className="font-serif text-[2rem] leading-tight">Wrapped didn&apos;t load</h1>
        <p className="text-[15px] text-nuture-ink/60">The story couldn&apos;t be built from the numbers in this browser.</p>
        <div>
          <Button asChild className="min-h-11 rounded-full bg-nuture-ink px-5 text-white hover:bg-nuture-ink/90">
            <Link href="/plan#goals">Back to goals</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <Deck story={story} index={index} setIndex={setIndex} reduce={reduce} />;
}

function Deck({
  story,
  index,
  setIndex,
  reduce,
}: {
  story: WrappedStory;
  index: number;
  setIndex: (index: number | ((current: number) => number)) => void;
  reduce: boolean;
}) {
  const touchXRef = useRef<number | null>(null);
  const ignoreClickRef = useRef(false);
  const beat = story.beats[Math.min(index, story.beats.length - 1)];
  const share = `/wrapped/share?${new URLSearchParams(story.share).toString()}`;
  const last = index >= story.beats.length - 1;

  const go = (next: number) => setIndex(Math.max(0, Math.min(story.beats.length - 1, next)));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        setIndex((current) => Math.min(story.beats.length - 1, current + 1));
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        setIndex((current) => Math.max(0, current - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setIndex, story.beats.length]);

  return (
    <div className="fixed inset-x-0 top-14 bottom-20 z-10 flex flex-col sm:static sm:inset-auto sm:z-auto sm:mx-auto sm:min-h-[calc(100dvh-3.5rem)] sm:w-full sm:max-w-3xl sm:px-4 sm:py-6">
      <div
        className={cn(
          "relative flex min-h-0 flex-1 flex-col justify-between bg-nuture-lime px-6 py-8 text-white sm:rounded-[20px] sm:px-10",
          !reduce && "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300",
        )}
        key={beat.id}
        onClick={(event) => {
          if (ignoreClickRef.current) {
            ignoreClickRef.current = false;
            return;
          }
          const bounds = event.currentTarget.getBoundingClientRect();
          const x = event.clientX - bounds.left;
          go(x > bounds.width / 2 ? index + 1 : index - 1);
        }}
        onTouchStart={(event) => {
          touchXRef.current = event.changedTouches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          if (touchXRef.current === null) return;
          const delta = (event.changedTouches[0]?.clientX ?? touchXRef.current) - touchXRef.current;
          if (delta < -40) go(index + 1);
          if (delta > 40) go(index - 1);
          ignoreClickRef.current = true;
          touchXRef.current = null;
        }}
      >
        <Celebration active={beat.id === "milestones" || beat.id === "next"} />
        <div className="relative grid gap-3">
          <p className="text-[15px] text-white/90">
            {story.pin.name} · {story.pin.eta}
          </p>
          <div className="flex items-center justify-between gap-3 text-[13px] text-white/75">
            <p>{beat.kicker}</p>
            <p>
              {index + 1} of {story.beats.length}
            </p>
          </div>
        </div>
        <div className="relative grid gap-3">
          <p className="font-serif text-[2.5rem] leading-[1.15] text-balance sm:text-6xl">{beat.figure}</p>
          <h1 className="text-[22px] font-medium text-balance">{beat.title}</h1>
          <p className="max-w-xl text-[15px] text-white/90 text-pretty sm:text-[17px]">{beat.body}</p>
        </div>
        <div className="relative flex flex-wrap items-center justify-between gap-3" onClick={(event) => event.stopPropagation()}>
          <div className="flex gap-1.5" aria-hidden>
            {story.beats.map((item, itemIndex) => (
              <span
                key={item.id}
                className={cn("h-1.5 w-6 rounded-full", itemIndex === index ? "bg-white" : "bg-white/35")}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 rounded-full bg-white/20 px-5 text-white hover:bg-white/30"
              onClick={() => go(index - 1)}
              disabled={index === 0}
            >
              Back
            </Button>
            {last ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-11 rounded-full bg-white px-5 text-nuture-ink hover:bg-white/90"
                  asChild
                >
                  <Link href="/plan#goals">See goals</Link>
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-11 rounded-full bg-white/20 px-5 text-white hover:bg-white/30"
                  asChild
                >
                  <a href={share} target="_blank" rel="noreferrer">
                    Share card
                  </a>
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="secondary"
                className="min-h-11 rounded-full bg-white px-5 text-nuture-ink hover:bg-white/90"
                onClick={() => go(index + 1)}
              >
                Next
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
