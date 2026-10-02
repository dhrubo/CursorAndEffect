export type Point = { x: number; y: number };

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
};

export function displaceGridPoint(point: Point, pointer: Point, radius: number, push: number): Point {
  const dx = point.x - pointer.x;
  const dy = point.y - pointer.y;
  const dist = Math.hypot(dx, dy);
  if (dist === 0 || radius <= 0 || dist >= radius) {
    return { x: point.x, y: point.y };
  }
  const influence = 1 - dist / radius;
  const amount = influence * influence * push;
  return {
    x: point.x + (dx / dist) * amount,
    y: point.y + (dy / dist) * amount,
  };
}

export function stepParticle(particle: Particle, gravity: number, drag: number): Particle {
  return {
    ...particle,
    x: particle.x + particle.vx,
    y: particle.y + particle.vy,
    vx: particle.vx * drag,
    vy: particle.vy * drag + gravity,
    life: particle.life - 1,
  };
}

export function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** A burst of particles leaving `origin`. Used by the Wrapped celebration. */
export function spawnBurst(origin: Point, count: number, rand: () => number = Math.random): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = rand() * Math.PI * 2;
    const speed = 1.2 + rand() * 3.4;
    const life = 36 + Math.floor(rand() * 28);
    particles.push({
      x: origin.x,
      y: origin.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2.2,
      life,
      maxLife: life,
      size: 1.5 + rand() * 2.5,
    });
  }
  return particles;
}
