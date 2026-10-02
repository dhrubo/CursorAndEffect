"use client";

import { useEffect, useRef } from "react";
import type { EffectId } from "@/lib/effects";
import {
  displaceGridPoint,
  hexToRgba,
  stepParticle,
  type Particle,
} from "@/lib/pointer-math";

export type PointerSettings = {
  effect: EffectId;
  scale: number;
  intensity: number;
  color: string;
};

type TrailPoint = { x: number; y: number };
type Ripple = { x: number; y: number; radius: number; max: number; alpha: number };

const GRID_GAP = 36;
const MAX_PARTICLES = 180;

function fitCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const pixelWidth = Math.floor(width * dpr);
  const pixelHeight = Math.floor(height * dpr);
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { width, height };
}

function overControls(x: number, y: number) {
  const dock = document.getElementById("controls");
  if (!dock) return false;
  const rect = dock.getBoundingClientRect();
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

export function PointerField({ effect, scale, intensity, color }: PointerSettings) {
  const fieldRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLCanvasElement>(null);
  const settings = useRef<PointerSettings>({ effect, scale, intensity, color });

  useEffect(() => {
    settings.current = { effect, scale, intensity, color };
  }, [effect, scale, intensity, color]);

  useEffect(() => {
    const field = fieldRef.current;
    const cursor = cursorRef.current;
    if (!field || !cursor) return;
    const fieldCtx = field.getContext("2d");
    const cursorCtx = cursor.getContext("2d");
    if (!fieldCtx || !cursorCtx) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = motionQuery.matches;
    const onMotionChange = () => {
      reducedMotion = motionQuery.matches;
    };
    motionQuery.addEventListener("change", onMotionChange);

    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const smooth = { ...target };
    const previousTarget = { ...target };
    let pressed = false;
    let lastSpawn = { ...target };
    let lastRippleAt = 0;
    let lastRipplePoint = { ...target };
    let lastReadout = 0;
    let lastStamp = 0;
    let displaySpeed = 0;
    let activeEffect = settings.current.effect;
    const trail: TrailPoint[] = [];
    const particles: Particle[] = [];
    const ripples: Ripple[] = [];
    let raf = 0;

    const resetMarks = () => {
      trail.length = 0;
      particles.length = 0;
      ripples.length = 0;
    };

    const onPointerMove = (event: PointerEvent) => {
      target.x = event.clientX;
      target.y = event.clientY;
    };
    const onPointerDown = (event: PointerEvent) => {
      target.x = event.clientX;
      target.y = event.clientY;
      pressed = true;
      if (overControls(event.clientX, event.clientY)) return;
      if (settings.current.effect === "ripple") {
        const reach = 90 + settings.current.scale * 0.8;
        ripples.push({
          x: event.clientX,
          y: event.clientY,
          radius: 6,
          max: reach,
          alpha: 0.9,
        });
      }
    };
    const onPointerUp = () => {
      pressed = false;
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    const draw = (now: number) => {
      const { effect: currentEffect, scale: scalePercent, intensity: intensityPercent, color: ink } =
        settings.current;
      const size = scalePercent / 100;
      const strength = intensityPercent / 100;
      const ease = reducedMotion ? 1 : 0.16 + strength * 0.18;
      smooth.x += (target.x - smooth.x) * ease;
      smooth.y += (target.y - smooth.y) * ease;

      const elapsed =
        lastStamp === 0 ? 1 / 60 : Math.min(0.05, Math.max(0.001, (now - lastStamp) / 1000));
      lastStamp = now;
      const instant = Math.hypot(target.x - previousTarget.x, target.y - previousTarget.y) / elapsed;
      previousTarget.x = target.x;
      previousTarget.y = target.y;
      displaySpeed += (instant - displaySpeed) * 0.2;

      if (currentEffect !== activeEffect) {
        activeEffect = currentEffect;
        resetMarks();
      }

      const root = document.documentElement;
      root.style.setProperty("--ink", ink);
      root.style.setProperty("--spot-x", `${smooth.x}px`);
      root.style.setProperty("--spot-y", `${smooth.y}px`);
      root.style.setProperty("--spot-size", `${Math.round(210 * size)}px`);

      const blocked = overControls(smooth.x, smooth.y);
      const lastTrail = trail.at(-1);
      const moved = lastTrail ? Math.hypot(smooth.x - lastTrail.x, smooth.y - lastTrail.y) : 0;
      if (!blocked && (trail.length === 0 || moved > 1.6)) {
        if (moved > 90) trail.length = 0;
        trail.push({ x: smooth.x, y: smooth.y });
        const limit = currentEffect === "comet" ? 22 : 32;
        if (trail.length > limit) trail.shift();
      }

      if (!blocked && !reducedMotion && currentEffect === "particles") {
        const travel = Math.hypot(target.x - lastSpawn.x, target.y - lastSpawn.y);
        if (travel > 8) {
          const count = Math.round(1 + strength * 3);
          const angle = Math.atan2(target.y - lastSpawn.y, target.x - lastSpawn.x);
          for (let index = 0; index < count; index += 1) {
            const spread = angle + Math.PI + (Math.random() - 0.5) * 1.5;
            const speed = (0.6 + Math.random() * 1.8) * (0.6 + strength);
            particles.push({
              x: smooth.x,
              y: smooth.y,
              vx: Math.cos(spread) * speed,
              vy: Math.sin(spread) * speed,
              life: 28 + Math.random() * 24,
              maxLife: 52,
              size: (1.4 + Math.random() * 2.2) * size,
            });
          }
          if (particles.length > MAX_PARTICLES) {
            particles.splice(0, particles.length - MAX_PARTICLES);
          }
          lastSpawn = { x: target.x, y: target.y };
        }
      }

      const rippleTravel = Math.hypot(smooth.x - lastRipplePoint.x, smooth.y - lastRipplePoint.y);
      if (!blocked && currentEffect === "ripple" && now - lastRippleAt > 90 && rippleTravel > 28) {
        lastRippleAt = now;
        lastRipplePoint = { x: smooth.x, y: smooth.y };
        ripples.push({
          x: smooth.x,
          y: smooth.y,
          radius: 4,
          max: 36 + 40 * size,
          alpha: 0.45,
        });
      }

      for (let index = particles.length - 1; index >= 0; index -= 1) {
        const next = stepParticle(particles[index], 0.045 + strength * 0.04, 0.985);
        if (next.life <= 0) particles.splice(index, 1);
        else particles[index] = next;
      }
      for (let index = ripples.length - 1; index >= 0; index -= 1) {
        const ripple = ripples[index];
        ripple.radius += (2.2 + strength * 3.2) * (reducedMotion ? 2.4 : 1);
        ripple.alpha *= 0.965;
        if (ripple.alpha < 0.03 || ripple.radius > ripple.max) ripples.splice(index, 1);
      }

      document.querySelectorAll<HTMLElement>("[data-sheen]").forEach((element) => {
        const rect = element.getBoundingClientRect();
        element.style.setProperty("--lx", `${smooth.x - rect.left}px`);
        element.style.setProperty("--ly", `${smooth.y - rect.top}px`);
      });

      document.querySelectorAll<HTMLElement>("[data-magnet]").forEach((element) => {
        // Measure the resting box. Reading the transformed rect feeds the
        // translation back into itself and the card drifts.
        element.style.transform = "none";
        const rect = element.getBoundingClientRect();
        if (currentEffect !== "magnetic" || reducedMotion) {
          element.style.transform = "";
          return;
        }
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = smooth.x - cx;
        const dy = smooth.y - cy;
        const dist = Math.hypot(dx, dy) || 1;
        const range = 260 * size;
        if (dist < range) {
          const influence = (1 - dist / range) ** 0.7;
          let tx = dx * 0.45 * influence * (0.45 + strength);
          let ty = dy * 0.45 * influence * (0.45 + strength);
          const mag = Math.hypot(tx, ty) || 1;
          const cap = 42 * size;
          if (mag > cap) {
            tx = (tx / mag) * cap;
            ty = (ty / mag) * cap;
          }
          element.style.transform = `translate(${tx}px, ${ty}px)`;
        } else {
          element.style.transform = "";
        }
      });

      if (now - lastReadout > 80) {
        lastReadout = now;
        const position = document.querySelector("[data-readout='position']");
        const speed = document.querySelector("[data-readout='speed']");
        if (position) position.textContent = `${Math.round(target.x)}  ${Math.round(target.y)}`;
        if (speed) speed.textContent = `${Math.round(displaySpeed)} px/s`;
      }

      const fieldSize = fitCanvas(field, fieldCtx);
      const cursorSize = fitCanvas(cursor, cursorCtx);
      fieldCtx.clearRect(0, 0, fieldSize.width, fieldSize.height);
      cursorCtx.clearRect(0, 0, cursorSize.width, cursorSize.height);
      cursorCtx.lineCap = "round";
      cursorCtx.lineJoin = "round";

      if (currentEffect === "grid") {
        const radius = 150 * size;
        const push = 48 * strength * (reducedMotion ? 0.35 : 1);
        fieldCtx.lineWidth = 1;
        for (let y = GRID_GAP / 2; y < fieldSize.height; y += GRID_GAP) {
          for (let x = GRID_GAP / 2; x < fieldSize.width; x += GRID_GAP) {
            const displaced = displaceGridPoint({ x, y }, smooth, radius, push);
            const influence = Math.min(1, Math.hypot(displaced.x - x, displaced.y - y) / 28);
            if (influence > 0.04) {
              fieldCtx.strokeStyle = hexToRgba(ink, 0.15 + influence * 0.35);
              fieldCtx.beginPath();
              fieldCtx.moveTo(x, y);
              fieldCtx.lineTo(displaced.x, displaced.y);
              fieldCtx.stroke();
            }
            fieldCtx.fillStyle = hexToRgba(ink, 0.28 + influence * 0.7);
            fieldCtx.beginPath();
            fieldCtx.arc(displaced.x, displaced.y, 1.35 + influence * 1.8, 0, Math.PI * 2);
            fieldCtx.fill();
          }
        }
      }

      if (currentEffect === "spotlight") {
        const glowRadius = 180 * size;
        const glow = fieldCtx.createRadialGradient(smooth.x, smooth.y, 0, smooth.x, smooth.y, glowRadius);
        glow.addColorStop(0, hexToRgba(ink, 0.28));
        glow.addColorStop(1, hexToRgba(ink, 0));
        fieldCtx.fillStyle = glow;
        fieldCtx.beginPath();
        fieldCtx.arc(smooth.x, smooth.y, glowRadius, 0, Math.PI * 2);
        fieldCtx.fill();
      }

      if (currentEffect === "follow") {
        const radius = (pressed ? 12 : 20) * size;
        cursorCtx.strokeStyle = hexToRgba(ink, 0.95);
        cursorCtx.lineWidth = 1.5;
        cursorCtx.beginPath();
        cursorCtx.arc(smooth.x, smooth.y, radius, 0, Math.PI * 2);
        cursorCtx.stroke();
        cursorCtx.fillStyle = hexToRgba("#f4efe6", 0.95);
        cursorCtx.beginPath();
        cursorCtx.arc(smooth.x, smooth.y, 2.4 * size, 0, Math.PI * 2);
        cursorCtx.fill();
      }

      if (currentEffect === "trail") {
        trail.forEach((point, index) => {
          const t = (index + 1) / trail.length;
          cursorCtx.fillStyle = hexToRgba(ink, 0.15 + t * 0.8);
          cursorCtx.beginPath();
          cursorCtx.arc(point.x, point.y, (2 + t * 7) * size * 0.45, 0, Math.PI * 2);
          cursorCtx.fill();
        });
      }

      if (currentEffect === "comet" && trail.length > 1) {
        cursorCtx.globalCompositeOperation = "lighter";
        for (let index = 1; index < trail.length; index += 1) {
          const t = index / (trail.length - 1);
          cursorCtx.strokeStyle = hexToRgba(ink, 0.15 + t * 0.85);
          cursorCtx.lineWidth = Math.max(1, t * 10 * size);
          cursorCtx.beginPath();
          cursorCtx.moveTo(trail[index - 1].x, trail[index - 1].y);
          cursorCtx.lineTo(trail[index].x, trail[index].y);
          cursorCtx.stroke();
        }
        cursorCtx.globalCompositeOperation = "source-over";
      }

      if (currentEffect === "ripple" || currentEffect === "particles" || currentEffect === "spotlight" || currentEffect === "magnetic" || currentEffect === "grid") {
        cursorCtx.fillStyle = hexToRgba(ink, 0.95);
        cursorCtx.beginPath();
        cursorCtx.arc(smooth.x, smooth.y, currentEffect === "spotlight" ? 3 : 3.5 * size, 0, Math.PI * 2);
        cursorCtx.fill();
      }

      if (currentEffect === "ripple") {
        ripples.forEach((ripple) => {
          cursorCtx.strokeStyle = hexToRgba(ink, ripple.alpha);
          cursorCtx.lineWidth = 1.5;
          cursorCtx.beginPath();
          cursorCtx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
          cursorCtx.stroke();
        });
      }

      if (currentEffect === "particles") {
        particles.forEach((particle) => {
          const alpha = Math.max(0, particle.life / particle.maxLife);
          cursorCtx.fillStyle = hexToRgba(ink, alpha);
          cursorCtx.beginPath();
          cursorCtx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
          cursorCtx.fill();
        });
      }

      raf = window.requestAnimationFrame(draw);
    };

    raf = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      motionQuery.removeEventListener("change", onMotionChange);
      document.querySelectorAll<HTMLElement>("[data-magnet]").forEach((element) => {
        element.style.transform = "";
      });
    };
  }, []);

  return (
    <>
      <canvas ref={fieldRef} className="pointer-events-none fixed inset-0 z-0" aria-hidden />
      <canvas ref={cursorRef} className="pointer-events-none fixed inset-0 z-30" aria-hidden />
    </>
  );
}
