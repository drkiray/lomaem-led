import { mulberry32, range } from '../../lib/random';
import { buildRoundTurns } from './turns';

test('needs at least 2 players', () => {
  expect(() => buildRoundTurns(1, mulberry32(1))).toThrow();
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

test('whoever answered asks next, and the chain closes on the opener', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const turns = buildRoundTurns(5, mulberry32(seed));
    turns.forEach((t, i) => expect(turns[(i + 1) % 5].asker).toBe(t.answerer));
  }
  expect(buildRoundTurns(2, mulberry32(1)).map((t) => [t.asker, t.answerer])).toEqual(
    expect.arrayContaining([[0, 1], [1, 0]]),
  );
});

test('the opener is random, or pinned with `first`', () => {
  const openers = new Set(range(40).map((s) => buildRoundTurns(6, mulberry32(s + 1))[0].asker));
  expect(openers.size).toBeGreaterThan(3);
  for (let seed = 1; seed <= 20; seed++) expect(buildRoundTurns(6, mulberry32(seed), 4)[0].asker).toBe(4);
});

test('spin order is random, not clockwise', () => {
  const orders = new Set<string>();
  for (let seed = 1; seed <= 20; seed++) {
    orders.add(buildRoundTurns(5, mulberry32(seed)).map((t) => t.asker).join());
  }
  expect(orders.size).toBeGreaterThan(5);
});
