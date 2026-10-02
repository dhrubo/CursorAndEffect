import assert from "node:assert/strict";
import test from "node:test";
import { displaceGridPoint, hexToRgba, stepParticle } from "./pointer-math.ts";

test("grid points outside the radius stay put", () => {
  const moved = displaceGridPoint({ x: 400, y: 0 }, { x: 0, y: 0 }, 120, 40);
  assert.deepEqual(moved, { x: 400, y: 0 });
});

test("grid points are pushed away from the pointer", () => {
  const moved = displaceGridPoint({ x: 40, y: 0 }, { x: 0, y: 0 }, 120, 40);
  assert.ok(moved.x > 40);
  assert.equal(moved.y, 0);
});

test("a point sitting on the pointer is left alone", () => {
  const moved = displaceGridPoint({ x: 10, y: 10 }, { x: 10, y: 10 }, 80, 30);
  assert.deepEqual(moved, { x: 10, y: 10 });
});

test("particles age and fall", () => {
  const next = stepParticle(
    { x: 0, y: 0, vx: 2, vy: 0, life: 5, maxLife: 10, size: 2 },
    0.4,
    0.5,
  );
  assert.equal(next.x, 2);
  assert.equal(next.y, 0);
  assert.equal(next.vx, 1);
  assert.equal(next.vy, 0.4);
  assert.equal(next.life, 4);
  assert.equal(next.maxLife, 10);
});

test("hex colors keep their channels", () => {
  assert.equal(hexToRgba("#ff5a1f", 0.5), "rgba(255, 90, 31, 0.5)");
});
