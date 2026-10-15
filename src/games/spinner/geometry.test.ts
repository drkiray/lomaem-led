import { mulberry32 } from '../../lib/random';
import {
  HUB_RADIUS, WHEEL_RADIUS, computeStopRotation, easeOutQuart, fitLabel, labelLayout, labelPlacement, normalizeDeg,
  sectorAtRotation, sectorColor, sectorPath, truncateLabel,
} from './geometry';

test('normalizeDeg', () => {
  expect(normalizeDeg(370)).toBe(10);
  expect(normalizeDeg(-30)).toBe(330);
  expect(normalizeDeg(720)).toBe(0);
});

test('sectorAtRotation maps angles clockwise from top', () => {
  expect(sectorAtRotation(0, 4)).toBe(0);
  expect(sectorAtRotation(89, 4)).toBe(0);
  expect(sectorAtRotation(90, 4)).toBe(1);
  expect(sectorAtRotation(359, 4)).toBe(3);
  expect(sectorAtRotation(360 * 5 + 200, 4)).toBe(2);
});

test.each([2, 3, 7, 12, 30])('stop rotation lands inside target sector for n=%i', (n) => {
  const rng = mulberry32(n);
  let current = 0;
  for (let k = 0; k < 40; k++) {
    const target = Math.floor(rng() * n);
    const stop = computeStopRotation(current, target, n, rng, 4);
    expect(sectorAtRotation(stop, n)).toBe(target);
    expect(stop - current).toBeGreaterThanOrEqual(4 * 360);
    expect(stop - current).toBeLessThan(5 * 360);
    // never lands on a sector border
    const offset = normalizeDeg(stop) - target * (360 / n);
    expect(offset).toBeGreaterThan((360 / n) * 0.1);
    expect(offset).toBeLessThan((360 / n) * 0.9);
    current = normalizeDeg(stop);
  }
});

test('easeOutQuart', () => {
  expect(easeOutQuart(0)).toBe(0);
  expect(easeOutQuart(1)).toBe(1);
  expect(easeOutQuart(0.5)).toBeCloseTo(0.9375);
});

test('sectorPath is a closed wedge from the center', () => {
  const d = sectorPath(0, 4);
  expect(d.startsWith('M200 200 L')).toBe(true);
  expect(d.endsWith('Z')).toBe(true);
  expect(d).toContain('A190 190 0 0 1');
});

test.each(Array.from({ length: 29 }, (_, i) => i + 2))('adjacent sectors differ in color for n=%i', (n) => {
  for (let i = 0; i < n; i++) {
    expect(sectorColor(i, n)).not.toBe(sectorColor((i + 1) % n, n));
  }
});

test('font shrinks with more players, within bounds', () => {
  expect(labelLayout(2).fontSize).toBe(22);
  expect(labelLayout(12).fontSize).toBeLessThan(labelLayout(4).fontSize);
  expect(labelLayout(40).fontSize).toBe(9);
  expect(labelLayout(40).maxChars).toBeGreaterThanOrEqual(10);
});

test('truncateLabel', () => {
  expect(truncateLabel('Маша', 10)).toBe('Маша');
  expect(truncateLabel('Александра', 6)).toBe('Алекс…');
});

test('labels on the left half are flipped to stay upright', () => {
  expect(labelPlacement(0, 4).anchor).toBe('end');
  expect(labelPlacement(3, 4).anchor).toBe('start');
});

describe('fitLabel keeps names clear of the hub', () => {
  const GLYPH = 0.72; // Unbounded Cyrillic average advance, in em
  const endRadius = (text: string, fontSize: number) => WHEEL_RADIUS * 0.9 - text.length * fontSize * GLYPH;

  test.each([2, 3, 4, 8, 12, 20, 30, 40])('n=%i: long name never reaches the hub', (n) => {
    const { text, fontSize } = fitLabel('Константинопольская', n);
    expect(endRadius(text, fontSize)).toBeGreaterThanOrEqual(HUB_RADIUS + 4);
  });

  test('a 10-letter name fits whole on a small wheel by shrinking the font', () => {
    const { text, fontSize } = fitLabel('Александра', 4);
    expect(text).toBe('Александра');
    expect(fontSize).toBeLessThan(labelLayout(4).fontSize);
  });

  test('short names keep the base font', () => {
    expect(fitLabel('Аня', 4)).toEqual({ text: 'Аня', fontSize: labelLayout(4).fontSize });
  });
});
