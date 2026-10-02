"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SAVER_PERSONAS } from "@/data/saver-personas";
import { PERSONAS } from "@/data/personas";
import { BrandStar } from "@/components/shell/brand-mark";
import { Wordmark } from "@/components/shell/wordmark";
import { stateFromLegacyProfile, useSaver } from "@/lib/saver/use-saver-state";
import { DEMO_TODAY } from "@/data/saver-personas";

export default function SplashPage() {
  const { state, loaded, save } = useSaver();
  const router = useRouter();
  const [ready] = useState(true);
  if (!loaded) return <div className="h-screen" />;

  return (
    <main className="mx-auto grid min-h-[80vh] max-w-3xl content-center gap-8 px-6 py-16 text-center text-white">
      <BrandStar className={`mx-auto size-8 ${ready ? "opacity-100" : "opacity-0"}`} />
      <Wordmark variant="white" className="mx-auto h-14" />
      <p className="font-display text-[40px] leading-[1.15]">
        {state?.profile.name ? `Hey ${state.profile.name}` : "See your plans come together"}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {state && (
          <button type="button" className="frosted rounded-full px-5 py-3 text-[17px]" onClick={() => router.push("/home")}>
            Continue
          </button>
        )}
        <button type="button" className="frosted rounded-full px-5 py-3 text-[17px]" onClick={() => router.push("/onboarding")}>
          Plan a new goal
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {SAVER_PERSONAS.map((persona) => (
          <button
            key={persona.id}
            type="button"
            onClick={() => {
              save(structuredClone(persona.state));
              router.push("/home");
            }}
            className="rounded-[20px] bg-white/15 px-4 py-4 text-left"
          >
            <p className="text-[17px]">{persona.state.profile.name}</p>
            <p className="text-[15px] text-white/75">{persona.tagline}</p>
          </button>
        ))}
        {PERSONAS.map((persona) => (
          <button
            key={persona.id}
            type="button"
            onClick={() => {
              save(stateFromLegacyProfile(persona.profile, DEMO_TODAY));
              router.push("/money-health");
            }}
            className="rounded-[20px] bg-white/15 px-4 py-4 text-left"
          >
            <p className="text-[17px]">{persona.profile.name}</p>
            <p className="text-[15px] text-white/75">{persona.tagline}</p>
          </button>
        ))}
      </div>
    </main>
  );
}
