import { normalizeWord } from '../games/hat/words';
import { HAT_WORDS } from './hatWords';

const BANNED = /секс|алкогол|водк|пиво|вино|пьян|бухл|интим|наркот|казино/i;
const all = [...HAT_WORDS.easy, ...HAT_WORDS.medium, ...HAT_WORDS.hard];

test('sizes per difficulty', () => {
  expect(HAT_WORDS.easy.length).toBeGreaterThanOrEqual(200);
  expect(HAT_WORDS.medium.length).toBeGreaterThanOrEqual(170);
  expect(HAT_WORDS.hard.length).toBeGreaterThanOrEqual(130);
  expect(all.length).toBeGreaterThanOrEqual(500);
});

test('no duplicates across the whole dictionary', () => {
  const seen = new Map<string, string>();
  const dups: string[] = [];
  for (const w of all) {
    const k = normalizeWord(w);
    if (seen.has(k)) dups.push(w);
    seen.set(k, w);
  }
  expect(dups).toEqual([]);
});

test('clean formatting and no 18+', () => {
  for (const w of all) {
    expect(w).toBe(w.trim());
    expect(w).toBe(w.toLowerCase());
    expect(w).not.toMatch(BANNED);
  }
});
