"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { PointerField } from "@/components/pointer-field";
import { EFFECTS, INKS, effectById, type EffectId } from "@/lib/effects";
import { cn } from "@/lib/utils";

function sliderValue(value: number | readonly number[]) {
  return typeof value === "number" ? value : value[0];
}

export function Studio() {
  const [effectId, setEffectId] = useState<EffectId>("follow");
  const [scale, setScale] = useState(100);
  const [intensity, setIntensity] = useState(72);
  const [color, setColor] = useState<(typeof INKS)[number]["value"]>(INKS[0].value);
  const [nativeCursor, setNativeCursor] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const effect = effectById(effectId);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const target = event.target;
      if (target instanceof Element && target.closest("input, textarea, select, [data-slot='slider']")) {
        return;
      }
      const index = EFFECTS.findIndex((item) => item.id === effectId);
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setEffectId(EFFECTS[(index + 1) % EFFECTS.length].id);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        setEffectId(EFFECTS[(index - 1 + EFFECTS.length) % EFFECTS.length].id);
      } else if (/^[1-8]$/.test(event.key)) {
        setEffectId(EFFECTS[Number(event.key) - 1].id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [effectId]);

  const selectOffset = (offset: number) => {
    const index = EFFECTS.findIndex((item) => item.id === effectId);
    setEffectId(EFFECTS[(index + offset + EFFECTS.length) % EFFECTS.length].id);
  };

  const chooseAnotherInk = () => {
    const choices = INKS.filter((ink) => ink.value !== color);
    const pick = choices[Math.floor(Math.random() * choices.length)];
    setColor(pick.value);
  };

  return (
    <div className={cn("relative min-h-dvh", nativeCursor ? undefined : "cursor-none")}>
      <PointerField effect={effectId} scale={scale} intensity={intensity} color={color} />
      <div
        aria-hidden
        className={cn(
          "spotlight-veil pointer-events-none fixed inset-0 z-20 motion-reduce:transition-none transition-opacity duration-300",
          effectId === "spotlight" ? "opacity-100" : "opacity-0",
        )}
      />
      <p className="sr-only" aria-live="polite">
        {effect.name}. {effect.description}
      </p>

      <div className="relative z-10 flex min-h-dvh flex-col px-4 pt-6 pb-64 sm:px-8">
        <header className="flex items-center justify-between gap-4">
          <p className="font-display text-xl tracking-tight">Cursor & Effect</p>
          <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
            {reducedMotion ? "Reduced motion" : effect.name}
          </p>
        </header>

        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-8 py-8">
          <div className="max-w-2xl text-center">
            <p className="text-xs font-medium tracking-[0.22em] text-muted-foreground uppercase">
              Pointer studio
            </p>
            <h1 className="mt-3 font-display text-5xl leading-none tracking-tight text-balance sm:text-7xl">
              {effect.name}
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              {effect.description}
            </p>
          </div>

          <div className="grid w-full gap-3 md:grid-cols-3">
            <article data-sheen data-magnet className="specimen rounded-2xl border border-border p-5">
              <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Position</p>
              <p data-readout="position" className="mt-3 font-mono text-3xl tracking-tight">
                —
              </p>
              <p className="mt-5 text-xs tracking-[0.16em] text-muted-foreground uppercase">Speed</p>
              <p data-readout="speed" className="mt-3 font-mono text-3xl tracking-tight">
                —
              </p>
            </article>
            <article data-sheen data-magnet className="specimen rounded-2xl border border-border p-5">
              <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Try this</p>
              <p className="mt-3 text-lg leading-7">{effect.tip}</p>
            </article>
            <article data-sheen data-magnet className="specimen flex flex-col rounded-2xl border border-border p-5">
              <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Field note</p>
              <p className="mt-3 flex-1 text-lg leading-7">{effect.note}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button type="button" data-magnet className="cursor-pointer" onClick={() => selectOffset(1)}>
                  Next effect
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  data-magnet
                  className="cursor-pointer"
                  onClick={chooseAnotherInk}
                >
                  Another ink
                </Button>
              </div>
            </article>
          </div>
        </main>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 p-3 sm:p-5">
        <section
          id="controls"
          aria-label="Effect controls"
          className="mx-auto max-w-5xl cursor-auto rounded-2xl border border-border bg-card/90 p-4 shadow-2xl backdrop-blur-xl"
        >
          <div
            role="radiogroup"
            aria-label="Pointer effect"
            className="flex gap-1.5 overflow-x-auto pb-3"
          >
            {EFFECTS.map((item, index) => {
              const selected = item.id === effectId;
              return (
                <Button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  variant={selected ? "default" : "outline"}
                  size="sm"
                  className="cursor-pointer"
                  onClick={() => setEffectId(item.id)}
                >
                  <span className="font-mono text-[10px] opacity-70">{index + 1}</span>
                  {item.name}
                </Button>
              );
            })}
          </div>

          <div className="grid gap-4 border-t border-border pt-3 md:grid-cols-[1fr_1fr_auto_auto] md:items-end">
            <div className="grid gap-2">
              <Label htmlFor="scale">Scale {scale}%</Label>
              <Slider
                id="scale"
                aria-label="Scale"
                min={50}
                max={160}
                step={1}
                value={[scale]}
                onValueChange={(value) => setScale(sliderValue(value))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="strength">Strength {intensity}%</Label>
              <Slider
                id="strength"
                aria-label="Strength"
                min={20}
                max={100}
                step={1}
                value={[intensity]}
                onValueChange={(value) => setIntensity(sliderValue(value))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Ink</Label>
              <div className="flex items-center gap-2" role="group" aria-label="Ink color">
                {INKS.map((ink) => (
                  <button
                    key={ink.value}
                    type="button"
                    aria-label={ink.name}
                    aria-pressed={color === ink.value}
                    className={cn(
                      "size-6 cursor-pointer rounded-full ring-offset-2 ring-offset-card outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      color === ink.value && "ring-2 ring-foreground",
                    )}
                    style={{ backgroundColor: ink.value }}
                    onClick={() => setColor(ink.value)}
                  />
                ))}
              </div>
            </div>
            <label className="flex cursor-pointer items-center justify-between gap-3 md:flex-col md:items-start">
              <span className="text-sm font-medium">Native cursor</span>
              <Switch checked={nativeCursor} onCheckedChange={setNativeCursor} />
            </label>
          </div>
          <p className="mt-3 font-mono text-[11px] tracking-wide text-muted-foreground">
            Keys 1–8 or arrow left and right switch effects.
          </p>
        </section>
      </div>
    </div>
  );
}
