import { mulberry32, range } from '../../lib/random';
import { buildRoundTurns, randomDerangement } from './turns';

test.each([2, 3, 5, 12, 30])('derangement of %i has no fixed points and is a permutation', (n) => {
  for (let seed = 1; seed <= 50; seed++) {
    const d = randomDerangement(n, mulberry32(seed));
    expect([...d].sort((a, b) => a - b)).toEqual(range(n));
    d.forEach((target, i) => expect(target).not.toBe(i));
  }
});

test('two players ask each other', () => {
  expect(randomDerangement(2, mulberry32(7))).toEqual([1, 0]);
});

test('throws for fewer than 2 players', () => {
  expect(() => randomDerangement(1, mulberry32(1))).toThrow();
});

test('degenerate rng still yields a derangement', () => {
  const d = randomDerangement(5, () => 0.999);
  d.forEach((target, i) => expect(target).not.toBe(i));
  expect([...d].sort()).toEqual(range(5));
});

test('round: everyone spins once, answers once, never themselves', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const turns = buildRoundTurns(6, mulberry32(seed));
    expect(turns).toHaveLength(6);
    expect(turns.map((t) => t.asker).sort()).toEqual(range(6));
    expect(turns.map((t) => t.answerer).sort()).toEqual(range(6));
    turns.forEach((t) => expect(t.answerer).not.toBe(t.asker));
  }
});

test('spin order is random, not clockwise', () => {
  const orders = new Set<string>();
  for (let seed = 1; seed <= 20; seed++) {
    orders.add(buildRoundTurns(5, mulberry32(seed)).map((t) => t.asker).join());
  }
  expect(orders.size).toBeGreaterThan(5);
});
