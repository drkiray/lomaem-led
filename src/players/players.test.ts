import { cleanPlayers, loadLastPlayers, rememberPlayers, validatePlayers } from './players';

test('cleanPlayers trims, collapses spaces, drops empties', () => {
  expect(cleanPlayers(['  Маша ', '', 'Петя   Иванов', '   '])).toEqual(['Маша', 'Петя Иванов']);
});

test('validatePlayers enforces minimum', () => {
  expect(validatePlayers(['Маша', ''], 2)).toBe('Нужно минимум 2 игрока');
  expect(validatePlayers(['a', 'b', 'c'], 4)).toBe('Нужно минимум 4 игрока');
  expect(validatePlayers(['Маша', 'Петя'], 2)).toBeNull();
});

test('validatePlayers rejects case-insensitive duplicates', () => {
  expect(validatePlayers(['Маша', 'маша'], 2)).toBe('Имя «маша» повторяется');
});

test('remembers last players', () => {
  expect(loadLastPlayers()).toEqual([]);
  rememberPlayers(['A', 'B']);
  expect(loadLastPlayers()).toEqual(['A', 'B']);
});
