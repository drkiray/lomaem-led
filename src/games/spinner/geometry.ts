import type { Rng } from '../../lib/random';

export const WHEEL_SIZE = 400;
export const WHEEL_CENTER = 200;
export const WHEEL_RADIUS = 190;

export const SECTOR_COLORS = [
  '#7fe7ff', '#ff7eb6', '#ffd166', '#7cff9e', '#b69cff', '#ff9f5a',
  '#5ad1ff', '#ff5e7e', '#c3ff5a', '#ffa8e2', '#66ffe0', '#ffb86b',
];

export function normalizeDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

export function sectorAtRotation(rotation: number, n: number): number {
  return Math.floor(normalizeDeg(rotation) / (360 / n)) % n;
}

// Final arrow rotation: at least `extraTurns` full turns, ending at a random
// point inside the target sector (never within 10% of its borders).
export function computeStopRotation(current: number, target: number, n: number, rng: Rng, extraTurns: number): number {
  const size = 360 / n;
  const targetAngle = target * size + size * (0.15 + 0.7 * rng());
  return current + extraTurns * 360 + normalizeDeg(targetAngle - current);
}

export function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

function pointAt(angleDeg: number, r: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  return [WHEEL_CENTER + r * Math.sin(rad), WHEEL_CENTER - r * Math.cos(rad)];
}

const fmt = (v: number) => Number(v.toFixed(2));

export function sectorPath(i: number, n: number): string {
  const size = 360 / n;
  const [x1, y1] = pointAt(i * size, WHEEL_RADIUS);
  const [x2, y2] = pointAt((i + 1) * size, WHEEL_RADIUS);
  const largeArc = size > 180 ? 1 : 0;
  return `M${WHEEL_CENTER} ${WHEEL_CENTER} L${fmt(x1)} ${fmt(y1)} A${WHEEL_RADIUS} ${WHEEL_RADIUS} 0 ${largeArc} 1 ${fmt(x2)} ${fmt(y2)} Z`;
}

export function sectorColor(i: number, n: number): string {
  const len = SECTOR_COLORS.length;
  // last sector would repeat the first one's color when n ≡ 1 (mod len)
  if (n > 1 && i === n - 1 && i % len === 0) return SECTOR_COLORS[len / 2];
  return SECTOR_COLORS[i % len];
}

// The hub button is 26% of the wheel width (see .wheel__hub in spinner.css).
export const HUB_RADIUS = WHEEL_SIZE * 0.13;
const GLYPH_EM = 0.72; // average Unbounded Cyrillic advance width
const MIN_SHRUNK_FONT = 11;
// Labels end near the rim (0.9R) and must stop short of the hub.
const LABEL_SPACE = WHEEL_RADIUS * 0.9 - HUB_RADIUS - 4;

const charsThatFit = (fontSize: number) => Math.floor(LABEL_SPACE / (fontSize * GLYPH_EM));

export function labelLayout(n: number): { fontSize: number; maxChars: number } {
  const fontSize = Math.max(9, Math.min(22, Math.round(26 - n * 0.7)));
  return { fontSize, maxChars: charsThatFit(fontSize) };
}

// Long names first shrink (down to 11, never above the wheel's base size),
// then get truncated with «…».
export function fitLabel(name: string, n: number): { text: string; fontSize: number } {
  const base = labelLayout(n).fontSize;
  const fitting = Math.floor(LABEL_SPACE / (Math.max(1, name.length) * GLYPH_EM));
  const fontSize = Math.max(Math.min(base, MIN_SHRUNK_FONT), Math.min(base, fitting));
  return { text: truncateLabel(name, charsThatFit(fontSize)), fontSize };
}

export function truncateLabel(name: string, maxChars: number): string {
  return name.length > maxChars ? `${name.slice(0, maxChars - 1)}…` : name;
}

// Text runs along the sector's bisector, ending near the rim. On the left
// half it is rotated another 180° so it never reads upside down.
export function labelPlacement(i: number, n: number): { x: number; anchor: 'start' | 'end'; transform: string } {
  const mid = (i + 0.5) * (360 / n);
  const rimX = WHEEL_RADIUS * 0.9;
  if (mid <= 180) {
    return { x: WHEEL_CENTER + rimX, anchor: 'end', transform: `rotate(${fmt(mid - 90)} ${WHEEL_CENTER} ${WHEEL_CENTER})` };
  }
  return { x: WHEEL_CENTER - rimX, anchor: 'start', transform: `rotate(${fmt(mid + 90)} ${WHEEL_CENTER} ${WHEEL_CENTER})` };
}
