import { describe, expect, it } from "vitest";
import { displaceGridPoint, hexToRgba, spawnBurst, stepParticle } from "./particles";

describe("particle math", () => {
  it("leaves grid points outside the radius where they are", () => {
    expect(displaceGridPoint({ x: 400, y: 0 }, { x: 0, y: 0 }, 120, 40)).toEqual({ x: 400, y: 0 });
  });

  it("pushes grid points away from the pointer", () => {
    const moved = displaceGridPoint({ x: 40, y: 0 }, { x: 0, y: 0 }, 120, 40);
    expect(moved.x).toBeGreaterThan(40);
    expect(moved.y).toBe(0);
  });

  it("leaves a point sitting on the pointer alone", () => {
    expect(displaceGridPoint({ x: 10, y: 10 }, { x: 10, y: 10 }, 80, 30)).toEqual({ x: 10, y: 10 });
  });

  it("ages particles and lets gravity pull them", () => {
    const next = stepParticle({ x: 0, y: 0, vx: 2, vy: 0, life: 5, maxLife: 10, size: 2 }, 0.4, 0.5);
    expect(next.x).toBe(2);
    expect(next.y).toBe(0);
    expect(next.vx).toBe(1);
    expect(next.vy).toBe(0.4);
    expect(next.life).toBe(4);
    expect(next.maxLife).toBe(10);
  });

  it("keeps hex channels", () => {
    expect(hexToRgba("#ff5a1f", 0.5)).toBe("rgba(255, 90, 31, 0.5)");
  });

  it("spawns a burst that falls once stepped", () => {
    let n = 0;
    const rand = () => {
      n += 1;
      return (n % 7) / 7;
    };
    const burst = spawnBurst({ x: 10, y: 20 }, 8, rand);
    expect(burst).toHaveLength(8);
    const aged = burst.map((particle) => {
      let current = particle;
      for (let i = 0; i < 20; i++) current = stepParticle(current, 0.15, 0.98);
      return current;
    });
    expect(aged.every((particle) => particle.life < burst[0].maxLife)).toBe(true);
    expect(aged.some((particle) => particle.y > 20)).toBe(true);
  });
});
