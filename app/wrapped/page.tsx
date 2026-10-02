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
    return <div className="mx-auto h-[70vh] w-full max-w-3xl animate-pulse px-4 py-10" />;
  }

  if (!profile) {
    return (
      <div className="mx-auto grid w-full max-w-xl gap-4 px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold">Nothing to wrap yet</h1>
        <p className="text-muted-foreground">Load Priya, Sam or Mark, or enter your own numbers, and this deck fills in from the plan.</p>
        <div>
          <Button asChild>
            <Link href="/">Get started</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (storyResult.error || !story) {
    return (
      <div className="mx-auto grid w-full max-w-xl gap-4 px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold">Wrapped didn&apos;t load</h1>
        <p className="text-muted-foreground">The story couldn&apos;t be built from the numbers in this browser.</p>
        <div>
          <Button asChild>
            <Link href="/plan">Back to the plan</Link>
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
    <div className="relative mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-3xl flex-col px-4 py-6">
      <Celebration active={beat.id === "milestones" || beat.id === "next"} />
      <div
        className={cn(
          "relative flex flex-1 flex-col justify-between rounded-3xl bg-primary px-6 py-8 text-primary-foreground shadow-lg sm:px-10",
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
        <div className="flex items-center justify-between gap-3 text-sm text-primary-foreground/80">
          <p>{beat.kicker}</p>
          <p>
            {index + 1} of {story.beats.length}
          </p>
        </div>
        <div className="grid gap-3">
          <p className="text-5xl font-semibold tracking-tight text-balance sm:text-6xl">{beat.figure}</p>
          <h1 className="text-2xl font-semibold text-balance sm:text-3xl">{beat.title}</h1>
          <p className="max-w-xl text-base text-primary-foreground/90 text-pretty sm:text-lg">{beat.body}</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3" onClick={(event) => event.stopPropagation()}>
          <div className="flex gap-1.5" aria-hidden>
            {story.beats.map((item, itemIndex) => (
              <span
                key={item.id}
                className={cn("h-1.5 w-6 rounded-full", itemIndex === index ? "bg-primary-foreground" : "bg-primary-foreground/35")}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => go(index - 1)} disabled={index === 0}>
              Back
            </Button>
            {index < story.beats.length - 1 ? (
              <Button type="button" variant="secondary" size="sm" onClick={() => go(index + 1)}>
                Next
              </Button>
            ) : (
              <Button type="button" variant="secondary" size="sm" asChild>
                <a href={share} target="_blank" rel="noreferrer">
                  Share card
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Click either side, swipe, or use the arrow keys. Guidance, not regulated advice.
      </p>
    </div>
  );
}
