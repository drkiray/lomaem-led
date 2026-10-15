import type { Rng } from '../lib/random';

// Crack coordinates live in a portrait 100×200 box scaled with "slice", so
// angles stay true on a phone instead of being stretched like a 100×100 box.
export const CRACK_W = 100;
export const CRACK_H = 200;

export interface CrackPath {
  d: string;
  width: number;
  delay: number;
}

type Point = [number, number];

const between = (rng: Rng, min: number, max: number) => min + rng() * (max - min);
const fmt = (n: number) => n.toFixed(1);
const inside = ([x, y]: Point, margin = 10) =>
  x >= -margin && x <= CRACK_W + margin && y >= -margin && y <= CRACK_H + margin;

// One jagged line; at some vertices it forks a thinner, later-drawn branch.
function walk(rng: Rng, out: CrackPath[], from: Point, angle: number, steps: number, stepLen: number,
  width: number, delay: number, depth: number): Point[] {
  const pts: Point[] = [from];
  const forks: CrackPath[] = [];
  let [x, y] = from;
  for (let i = 0; i < steps; i++) {
    angle += between(rng, -0.45, 0.45);
    const len = stepLen * between(rng, 0.6, 1.4);
    x += Math.cos(angle) * len;
    y += Math.sin(angle) * len;
    pts.push([x, y]);
    if (!inside([x, y])) break;
    if (depth < 2 && i < steps - 1 && inside([x, y], 0) && rng() < 0.3) {
      const side = rng() < 0.5 ? -1 : 1;
      walk(rng, forks, [x, y], angle + side * between(rng, 0.5, 1.2), Math.max(2, Math.round(steps * 0.45)),
        stepLen * 0.7, width * 0.6, delay + 0.05 * (i + 1), depth + 1);
    }
  }
  out.push({ d: 'M' + pts.map(([px, py]) => `${fmt(px)} ${fmt(py)}`).join(' L'), width, delay }, ...forks);
  return pts;
}

// A point on a random screen edge and the direction from it towards the
// middle, so a crack starting near a corner still heads into view.
function edgePoint(rng: Rng): { at: Point; inward: number } {
  let at: Point;
  switch (Math.floor(rng() * 4)) {
    case 0: at = [between(rng, 0, CRACK_W), 0]; break;
    case 1: at = [CRACK_W, between(rng, 0, CRACK_H)]; break;
    case 2: at = [between(rng, 0, CRACK_W), CRACK_H]; break;
    default: at = [0, between(rng, 0, CRACK_H)];
  }
  const target: Point = [between(rng, 0.3, 0.7) * CRACK_W, between(rng, 0.3, 0.7) * CRACK_H];
  return { at, inward: Math.atan2(target[1] - at[1], target[0] - at[0]) };
}

// Three kinds of fracture, each randomised: a star from a point of impact,
// a few cracks creeping in from an edge, or one long fissure across the ice.
export function generateCracks(rng: Rng): CrackPath[] {
  const out: CrackPath[] = [];
  const kind = rng();
  if (kind < 0.4) {
    const at: Point = [between(rng, 10, CRACK_W - 10), between(rng, 15, CRACK_H - 15)];
    const arms = 3 + Math.floor(rng() * 3);
    const turn = rng() * Math.PI * 2;
    for (let i = 0; i < arms; i++) {
      const angle = turn + (i / arms) * Math.PI * 2 + between(rng, -0.4, 0.4);
      walk(rng, out, at, angle, 3 + Math.floor(rng() * 4), between(rng, 9, 16), 1, between(rng, 0, 0.06), 0);
    }
  } else if (kind < 0.75) {
    const { at, inward } = edgePoint(rng);
    const arms = 2 + Math.floor(rng() * 3);
    for (let i = 0; i < arms; i++) {
      walk(rng, out, at, inward + between(rng, -0.8, 0.8), 4 + Math.floor(rng() * 4), between(rng, 10, 18), 1,
        between(rng, 0, 0.1), 0);
    }
  } else {
    const { at, inward } = edgePoint(rng);
    const main = walk(rng, out, at, inward + between(rng, -0.35, 0.35), 9 + Math.floor(rng() * 4),
      between(rng, 14, 22), 1.1, 0, 0);
    const visible = main.filter((p) => inside(p, 0));
    for (let i = 0, n = 2 + Math.floor(rng() * 2); i < n && visible.length > 1; i++) {
      const k = 1 + Math.floor(rng() * (visible.length - 1));
      walk(rng, out, visible[k], inward + (rng() < 0.5 ? -1 : 1) * between(rng, 0.8, 1.6), 2 + Math.floor(rng() * 3),
        between(rng, 7, 12), 0.6, 0.06 * k, 1);
    }
  }
  return out.slice(0, 24);
}
