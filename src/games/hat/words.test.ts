import { mulberry32 } from '../../lib/random';
import { buildWordSet, dedupeWords, normalizeWord, type Dictionary } from './words';

const dict: Dictionary = {
  easy: ['кот', 'дом', 'лес', 'мяч', 'сыр', 'чай'],
  medium: ['вокзал', 'маяк', 'квест', 'йога'],
  hard: ['карма', 'хаос', 'эхо'],
};
const rng = () => mulberry32(5);

test('normalizeWord trims, lowercases, folds ё', () => {
  expect(normalizeWord('  Ёжик   Мой ')).toBe('ежик мой');
});

test('dedupeWords keeps first spelling, drops empties and duplicates', () => {
  expect(dedupeWords(['Кот', 'кот ', '  ', 'Ёж', 'еж', 'кОт'])).toEqual(['Кот', 'Ёж']);
});

test('dictionary mode: exact count from chosen difficulty', () => {
  const words = buildWordSet({ mode: 'dictionary', difficulty: 'medium', count: 3, ownWords: [] }, dict, rng());
  expect(words).toHaveLength(3);
  words.forEach((w) => expect(dict.medium).toContain(w));
  expect(new Set(words).size).toBe(3);
});

test('mix difficulty draws from all levels', () => {
  const words = buildWordSet({ mode: 'dictionary', difficulty: 'mix', count: 13, ownWords: [] }, dict, rng());
  expect(words).toHaveLength(13);
});

test('own mode uses only deduped own words', () => {
  const words = buildWordSet({ mode: 'own', difficulty: 'mix', count: 40, ownWords: ['Кот', 'кот', '', 'Луна'] }, dict, rng());
  expect([...words].sort()).toEqual(['Кот', 'Луна']);
});

test('mix mode tops up own words from dictionary without duplicates', () => {
  const words = buildWordSet({ mode: 'mix', difficulty: 'easy', count: 5, ownWords: ['КОТ', 'Луна'] }, dict, rng());
  expect(words).toHaveLength(5);
  expect(words).toContain('КОТ');
  expect(words).toContain('Луна');
  expect(words.map(normalizeWord).filter((w) => w === 'кот')).toHaveLength(1);
});

test('mix mode with more own words than count keeps all own words', () => {
  const own = ['а1', 'а2', 'а3', 'а4'];
  const words = buildWordSet({ mode: 'mix', difficulty: 'easy', count: 2, ownWords: own }, dict, rng());
  expect([...words].sort()).toEqual(own);
});

test('excludes previous words when possible, tops up when not', () => {
  const first = buildWordSet({ mode: 'dictionary', difficulty: 'easy', count: 3, ownWords: [] }, dict, rng());
  const second = buildWordSet({ mode: 'dictionary', difficulty: 'easy', count: 3, ownWords: [] }, dict, mulberry32(9), first);
  second.forEach((w) => expect(first).not.toContain(w));
  const third = buildWordSet({ mode: 'dictionary', difficulty: 'easy', count: 5, ownWords: [] }, dict, mulberry32(9), first);
  expect(third).toHaveLength(5);
  expect(new Set(third).size).toBe(5);
});
