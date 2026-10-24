import { range, shuffle, type Rng } from '../../lib/random';

export interface Turn {
  asker: number;
  answerer: number;
}

// A round is one chain through all players: whoever just answered asks next,
// so the answerer of each turn is the asker of the following one. The chain
// closes on the first asker, so everyone asks once and answers once.
// `first` pins the opening asker (a new round continues from the last answerer);
// without it the opener is random.
export function buildRoundTurns(n: number, rng: Rng, first?: number): Turn[] {
  if (n < 2) throw new Error('Need at least 2 players');
  const rest = shuffle(range(n).filter((i) => i !== first), rng);
  const order = first === undefined ? rest : [first, ...rest];
  return order.map((asker, i) => ({ asker, answerer: order[(i + 1) % n] }));
}
