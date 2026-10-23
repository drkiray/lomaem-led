import { mulberry32 } from '../../lib/random';
import { createBirthdayPlan, fillTemplate, pickCard, planBirthdayCard, type Card } from './deck';

const CARDS: Card[] = [
  { id: 'q1', level: 1, kind: 'question', text: 'Q1?' },
  { id: 'q2', level: 1, kind: 'question', text: 'Q2?' },
  { id: 'a1', level: 1, kind: 'action', text: 'A1 {asker}' },
  { id: 'q3', level: 2, kind: 'question', text: 'Q3?' },
  { id: 'a3', level: 2, kind: 'action', text: 'A3' },
];
const none = new Set<string>();

test('only picks from requested level', () => {
  const rng = mulberry32(1);
  for (let i = 0; i < 20; i++) {
    const { card } = pickCard(CARDS, { level: 2, usedIds: [], seenIds: none, actionRatio: 0.5, rng });
    expect(card.level).toBe(2);
  }
});

test('no repeats until the level deck is exhausted, then resets only that level', () => {
  const rng = mulberry32(2);
  let used: string[] = ['q3'];
  const picked: string[] = [];
  for (let i = 0; i < 3; i++) {
    const r = pickCard(CARDS, { level: 1, usedIds: used, seenIds: none, actionRatio: 0.3, rng });
    picked.push(r.card.id);
    used = r.usedIds;
  }
  expect(new Set(picked).size).toBe(3);
  const after = pickCard(CARDS, { level: 1, usedIds: used, seenIds: none, actionRatio: 0.3, rng });
  expect(after.card.level).toBe(1);
  expect(after.usedIds).toContain('q3'); // level 2 history kept
  expect(after.usedIds.filter((id) => id.startsWith('q') || id.startsWith('a')).length).toBe(2);
});

test('actionRatio 0 picks questions, 1 picks actions', () => {
  const rng = mulberry32(3);
  expect(pickCard(CARDS, { level: 1, usedIds: [], seenIds: none, actionRatio: 0, rng }).card.kind).toBe('question');
  expect(pickCard(CARDS, { level: 1, usedIds: [], seenIds: none, actionRatio: 1, rng }).card.kind).toBe('action');
});

test('falls back to the other kind when wanted kind is used up', () => {
  const r = pickCard(CARDS, { level: 1, usedIds: ['a1'], seenIds: none, actionRatio: 1, rng: mulberry32(4) });
  expect(r.card.kind).toBe('question');
});

test('prefers cards not seen in previous games', () => {
  const seen = new Set(['q1']);
  for (let seed = 1; seed < 20; seed++) {
    const r = pickCard(CARDS, { level: 1, usedIds: [], seenIds: seen, actionRatio: 0, rng: mulberry32(seed) });
    expect(r.card.id).toBe('q2');
  }
});

test('fillTemplate substitutes all placeholders', () => {
  expect(fillTemplate('{asker} → {answerer}, {asker}!', 'Маша', 'Петя')).toBe('Маша → Петя, Маша!');
});

test('forced kind: a replacement card keeps the kind of the one it replaces', () => {
  const rng = mulberry32(3);
  for (let i = 0; i < 20; i++) {
    const { card, usedIds } = pickCard(CARDS, { level: 1, usedIds: ['q1'], seenIds: none, actionRatio: 1, rng, kind: 'question' });
    expect(card.id).toBe('q2');
    expect(usedIds).toEqual(['q1', 'q2']);
  }
});

test('birthday plan: a birthday card every 2nd or 3rd fitting turn, never about themself', () => {
  const turn = { asker: 1, answerer: 2 };
  let plan = createBirthdayPlan(0, () => 0.9); // every 3
  expect(plan.every).toBe(3);
  const flags: boolean[] = [];
  for (let i = 0; i < 6; i++) {
    const r = planBirthdayCard(plan, turn, () => 0.9);
    flags.push(r.useBirthday);
    plan = r.plan;
  }
  expect(flags).toEqual([false, false, true, false, false, true]);
  const two = planBirthdayCard({ index: 0, since: 1, every: 2 }, turn, () => 0.9);
  expect(two.useBirthday).toBe(true);
  expect(two.plan).toEqual({ index: 0, since: 0, every: 3 }); // re-rolled
  const mine = planBirthdayCard({ index: 0, since: 5, every: 2 }, { asker: 0, answerer: 2 }, () => 0);
  expect(mine.useBirthday).toBe(false); // birthday person asks: wait for another turn
  expect(planBirthdayCard({ index: 0, since: 5, every: 2 }, { asker: 1, answerer: 0 }, () => 0).useBirthday).toBe(false);
});

test('fillTemplate fills {birthday}', () => {
  expect(fillTemplate('{asker}, про {birthday}', 'А', 'Б', 'Д')).toBe('А, про Д');
});
