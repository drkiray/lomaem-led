import { SPIN_PHRASES, pickSpinPhrase } from './spinPhrases';

test('plenty of unique phrases', () => {
  expect(SPIN_PHRASES.length).toBeGreaterThanOrEqual(30);
  expect(new Set(SPIN_PHRASES).size).toBe(SPIN_PHRASES.length);
});

test('never repeats the previous phrase', () => {
  for (let i = 0; i < 50; i++) {
    const prev = SPIN_PHRASES[i % SPIN_PHRASES.length];
    expect(pickSpinPhrase(prev, () => (i % 10) / 10)).not.toBe(prev);
  }
});

test('no past-tense or gendered forms', () => {
  for (const p of SPIN_PHRASES) expect(p).not.toMatch(/(ал|ил|ял)(а)?\b|\(а\)/);
});
