import { mulberry32, range, shuffle } from './random';

test('mulberry32 is deterministic and in [0,1)', () => {
  const a = mulberry32(42);
  const b = mulberry32(42);
  for (let i = 0; i < 100; i++) {
    const v = a();
    expect(v).toBe(b());
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
  }
});

test('range', () => {
  expect(range(4)).toEqual([0, 1, 2, 3]);
  expect(range(0)).toEqual([]);
});

test('shuffle keeps all elements and does not mutate input', () => {
  const input = [1, 2, 3, 4, 5];
  const out = shuffle(input, mulberry32(1));
  expect([...out].sort()).toEqual(input);
  expect(input).toEqual([1, 2, 3, 4, 5]);
});
