import type { Rng } from '../lib/random';

// Crack coordinates live in a portrait 100×200 box scaled with "slice", so
// angles stay true on a phone instead of being stretched like a 100×100 box.
export const CRACK_W = 100;
export const CRACK_H = 200;
/** the ice keeps cracking for this long after a screen opens */
export const CRACK_DURATION_S = 25;

const SPEED = 5; // box units per second — a slow creep
const FIRST_START_S = 0.8; // nothing is drawn when the screen opens
const LAST_START_S = 11;
const MAX_PATHS = 90;

export interface CrackPath {
  d: string;
  width: number;
  /** seconds after the screen settles when this line starts to grow */
  delay: number;
  /** seconds it takes to grow to full length */
  duration: number;
}

type Point = [number, number];

const between = (rng: Rng, min: number, max: number) => min + rng() * (max - min);
const fmt = (n: number) => n.toFixed(1);
const inside = ([x, y]: Point, margin: number) =>
  x >= -margin && x <= CRACK_W + margin && y >= -margin && y <= CRACK_H + margin;

// One jagged line growing from `from`; along the way it forks thinner
// branches that start growing once this line reaches the fork.
function grow(rng: Rng, out: CrackPath[], from: Point, angle: number, steps: number, stepLen: number,
  width: number, delay: number, depth: number) {
  const pts: Point[] = [from];
  const forks: { at: Point; angle: number; lenAt: number }[] = [];
  let [x, y] = from;
  let length = 0;
  for (let i = 0; i < steps; i++) {
    angle += between(rng, -0.35, 0.35);
    const seg = stepLen * between(rng, 0.6, 1.4);
    x += Math.cos(angle) * seg;
    y += Math.sin(angle) * seg;
    length += seg;
    pts.push([x, y]);
    if (!inside([x, y], 2)) break;
    if (depth < 2 && i < steps - 1 && inside([x, y], -1) && rng() < 0.25) {
      forks.push({ at: [x, y], angle: angle + (rng() < 0.5 ? -1 : 1) * between(rng, 0.5, 1.1), lenAt: length });
    }
  }
  const duration = Math.min(length / SPEED, CRACK_DURATION_S - delay);
  out.push({ d: 'M' + pts.map(([px, py]) => `${fmt(px)} ${fmt(py)}`).join(' L'), width, delay, duration });
  for (const fork of forks) {
    const forkDelay = delay + duration * (fork.lenAt / length);
    if (forkDelay > CRACK_DURATION_S - 1) continue;
    grow(rng, out, fork.at, fork.angle, Math.max(2, Math.round(steps * 0.5)), stepLen * 0.75, width * 0.65, forkDelay,
      depth + 1);
  }
}

// A point at `distance` along the screen's perimeter, clockwise from the top-left corner.
function perimeterPoint(distance: number): Point {
  const perimeter = 2 * (CRACK_W + CRACK_H);
  const d = ((distance % perimeter) + perimeter) % perimeter;
  if (d < CRACK_W) return [d, 0];
  if (d < CRACK_W + CRACK_H) return [CRACK_W, d - CRACK_W];
  if (d < 2 * CRACK_W + CRACK_H) return [CRACK_W - (d - CRACK_W - CRACK_H), CRACK_H];
  return [0, CRACK_H - (d - 2 * CRACK_W - CRACK_H)];
}

// Cracks creep in from all around the screen edge at different moments and
// grow towards the middle, slowly covering the whole screen.
export function generateCracks(rng: Rng): CrackPath[] {
  const out: CrackPath[] = [];
  const perimeter = 2 * (CRACK_W + CRACK_H);
  const count = 10 + Math.floor(rng() * 5);
  const spacing = perimeter / count;
  const offset = rng() * perimeter;
  for (let i = 0; i < count; i++) {
    const at = perimeterPoint(offset + i * spacing + between(rng, -0.3, 0.3) * spacing);
    const target: Point = [between(rng, 0.15, 0.85) * CRACK_W, between(rng, 0.1, 0.9) * CRACK_H];
    const angle = Math.atan2(target[1] - at[1], target[0] - at[0]);
    grow(rng, out, at, angle, 7 + Math.floor(rng() * 5), between(rng, 9, 15), 1,
      between(rng, FIRST_START_S, LAST_START_S), 0);
  }
  return out.slice(0, MAX_PATHS);
}
