"use client";

import { useEffect, useRef } from "react";
import { hexToRgba, spawnBurst, stepParticle, type Particle } from "@/lib/motion/particles";
import { usePrefersReducedMotion } from "@/lib/motion/use-reduced-motion";

const COLOURS = ["#0f766e", "#d97706", "#047857", "#b45309", "#0e7490"];

export function Celebration({ active }: { active: boolean }) {
  const reduce = usePrefersReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active || reduce) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const parent = canvas.parentElement;
    const width = parent?.clientWidth || window.innerWidth;
    const height = parent?.clientHeight || window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    let particles: Particle[] = [
      ...spawnBurst({ x: width / 2, y: height * 0.32 }, 64),
      ...spawnBurst({ x: width * 0.3, y: height * 0.4 }, 24),
      ...spawnBurst({ x: width * 0.7, y: height * 0.4 }, 24),
    ];
    let frame = 0;

    const tick = () => {
      particles = particles
        .map((particle) => stepParticle(particle, 0.09, 0.986))
        .filter((particle) => particle.life > 0 && particle.y < height + 20);
      context.clearRect(0, 0, width, height);
      for (const particle of particles) {
        const alpha = Math.max(0, particle.life / particle.maxLife);
        const colour = COLOURS[Math.abs(Math.floor(particle.size * 10)) % COLOURS.length];
        context.fillStyle = hexToRgba(colour, alpha);
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fill();
      }
      if (particles.length > 0) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, reduce]);

  if (!active || reduce) return null;
  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden />;
}
