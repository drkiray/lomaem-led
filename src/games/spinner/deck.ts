import type { Rng } from '../../lib/random';

export type Level = 1 | 2 | 3;
export const LEVELS: Level[] = [1, 2, 3];
export type CardKind = 'question' | 'action';

export interface Card {
  id: string;
  level: Level;
  kind: CardKind;
  text: string;
}

interface PickOptions {
  level: Level;
  usedIds: string[];
  seenIds: ReadonlySet<string>;
  actionRatio: number;
  rng: Rng;
  /** force the kind — a replacement card keeps the kind of the one it replaces */
  kind?: CardKind;
}

// Priority: this level → not used in this game (reset level when exhausted)
// → wanted kind (by actionRatio, else any) → not seen in earlier games.
export function pickCard(cards: Card[], { level, usedIds, seenIds, actionRatio, rng, kind: forced }: PickOptions): { card: Card; usedIds: string[] } {
  const levelCards = cards.filter((c) => c.level === level);
  if (levelCards.length === 0) throw new Error(`No cards for level ${level}`);

  let used = usedIds;
  let pool = levelCards.filter((c) => !used.includes(c.id));
  if (pool.length === 0) {
    const levelIds = new Set(levelCards.map((c) => c.id));
    used = used.filter((id) => !levelIds.has(id));
    pool = levelCards;
  }

  const kind: CardKind = forced ?? (rng() < actionRatio ? 'action' : 'question');
  const ofKind = pool.filter((c) => c.kind === kind);
  const kindPool = ofKind.length > 0 ? ofKind : pool;
  const fresh = kindPool.filter((c) => !seenIds.has(c.id));
  const finalPool = fresh.length > 0 ? fresh : kindPool;

  const card = finalPool[Math.floor(rng() * finalPool.length)];
  return { card, usedIds: [...used, card.id] };
}

export function fillTemplate(text: string, asker: string, answerer: string): string {
  return text.replaceAll('{asker}', asker).replaceAll('{answerer}', answerer);
}
