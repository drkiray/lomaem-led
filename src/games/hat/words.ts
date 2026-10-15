import { shuffle, type Rng } from '../../lib/random';
import type { DifficultySetting, WordDifficulty } from '../../settings/settings';

export type WordMode = 'dictionary' | 'own' | 'mix';
export type Dictionary = Record<WordDifficulty, string[]>;

export interface WordSetup {
  mode: WordMode;
  difficulty: DifficultySetting;
  count: number;
  ownWords: string[];
}

export function normalizeWord(word: string): string {
  return word.trim().replace(/\s+/g, ' ').toLowerCase().replace(/ё/g, 'е');
}

export function dedupeWords(words: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of words) {
    const word = raw.trim().replace(/\s+/g, ' ');
    const key = normalizeWord(word);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(word);
  }
  return out;
}

export function pickDictionaryWords(
  dict: Dictionary,
  difficulty: DifficultySetting,
  count: number,
  exclude: string[],
  rng: Rng,
): string[] {
  if (count <= 0) return [];
  const pool = difficulty === 'mix' ? [...dict.easy, ...dict.medium, ...dict.hard] : dict[difficulty];
  const excluded = new Set(exclude.map(normalizeWord));
  return shuffle(pool.filter((w) => !excluded.has(normalizeWord(w))), rng).slice(0, count);
}

// `exclude` = words of the previous game; ignored for the top-up when the
// dictionary is too small to avoid them entirely.
export function buildWordSet(setup: WordSetup, dict: Dictionary, rng: Rng, exclude: string[] = []): string[] {
  const own = setup.mode === 'dictionary' ? [] : dedupeWords(setup.ownWords);
  if (setup.mode === 'own') return shuffle(own, rng);
  const need = Math.max(0, setup.count - own.length);
  const picked = pickDictionaryWords(dict, setup.difficulty, need, [...own, ...exclude], rng);
  const topUp = pickDictionaryWords(dict, setup.difficulty, need - picked.length, [...own, ...picked], rng);
  return shuffle([...own, ...picked, ...topUp], rng);
}
