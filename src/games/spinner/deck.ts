import { declineName, type NameCase } from '../../lib/declension';
import type { Rng } from '../../lib/random';

export type Level = 1 | 2 | 3;
export const LEVELS: Level[] = [1, 2, 3];
export const LEVEL_TITLES: Record<Level, string> = { 1: 'Поверхность', 2: 'Погружение', 3: 'Глубина' };
export type CardKind = 'question' | 'action';

export interface Card {
  id: string;
  level: Level;
  kind: CardKind;
  text: string;
  /** a question about the birthday person */
  birthday?: true;
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

export function fillTemplate(text: string, asker: string, answerer: string, birthday = ''): string {
  return text.replaceAll('{asker}', asker).replaceAll('{answerer}', answerer).replace(/\{birthday(?::(gen|dat|acc|ins|prep))?\}/g, (_, c?: NameCase) => (c ? declineName(birthday, c) : birthday));
}

// Birthday mode: every 2nd or 3rd card (re-rolled after each one) is about the
// birthday person. `since` counts ordinary cards since the last birthday card.
export interface BirthdayPlan {
  index: number; // player index of the birthday person
  since: number;
  every: 2 | 3;
}

export function createBirthdayPlan(index: number, rng: Rng): BirthdayPlan {
  return { index, since: 0, every: rng() < 0.5 ? 2 : 3 };
}

// The birthday person can't be asked about themself, so such turns are skipped
// (the counter keeps waiting for the next fitting turn).
export function planBirthdayCard(
  plan: BirthdayPlan,
  turn: { asker: number; answerer: number },
  rng: Rng,
): { useBirthday: boolean; plan: BirthdayPlan } {
  const fits = turn.asker !== plan.index && turn.answerer !== plan.index;
  if (fits && plan.since >= plan.every - 1) {
    return { useBirthday: true, plan: { ...plan, since: 0, every: rng() < 0.5 ? 2 : 3 } };
  }
  return { useBirthday: false, plan: { ...plan, since: plan.since + 1 } };
}
