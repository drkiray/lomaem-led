import { range, shuffle, type Rng } from '../../lib/random';

export interface Turn {
  asker: number;
  answerer: number;
}

// Sattolo's algorithm: always a single cycle, so never a fixed point.
function sattolo(n: number, rng: Rng): number[] {
  const a = range(n);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Uniform random derangement by rejection (expected ~e tries);
// falls back to Sattolo if the RNG keeps producing fixed points.
export function randomDerangement(n: number, rng: Rng): number[] {
  if (n < 2) throw new Error('Need at least 2 players');
  for (let attempt = 0; attempt < 100; attempt++) {
    const p = shuffle(range(n), rng);
    if (p.every((target, i) => target !== i)) return p;
  }
  return sattolo(n, rng);
}

export function buildRoundTurns(n: number, rng: Rng): Turn[] {
  const answererOf = randomDerangement(n, rng);
  return shuffle(range(n), rng).map((asker) => ({ asker, answerer: answererOf[asker] }));
}
