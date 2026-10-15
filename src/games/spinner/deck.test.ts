import { mulberry32 } from '../../lib/random';
import { fillTemplate, pickCard, type Card } from './deck';

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
