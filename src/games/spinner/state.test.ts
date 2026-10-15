import { createSpinnerGame, currentTurn, restoreSpinnerGame, spinnerReducer, type SpinnerState } from './state';

const turns = [
  { asker: 1, answerer: 0 },
  { asker: 0, answerer: 2 },
  { asker: 2, answerer: 1 },
];
const config = { spinDurationSec: 4, actionRatio: 0.3 };
const fresh = () => createSpinnerGame(['Аня', 'Боря', 'Вика'], config, turns);

test('new game starts at level 1, first turn, ready', () => {
  const s = fresh();
  expect(s).toMatchObject({ level: 1, turnIndex: 0, phase: 'ready', rotation: 0, cardId: null, usedIds: [] });
  expect(currentTurn(s)).toEqual({ asker: 1, answerer: 0 });
});

test('full turn cycle: spin → spinDone → cardDone', () => {
  let s = spinnerReducer(fresh(), { type: 'spin', rotation: 1500, cardId: 'l1-q1', usedIds: ['l1-q1'] });
  expect(s).toMatchObject({ phase: 'spinning', rotation: 1500, cardId: 'l1-q1', usedIds: ['l1-q1'] });
  s = spinnerReducer(s, { type: 'spinDone' });
  expect(s.phase).toBe('card');
  expect(s.rotation).toBe(1500 % 360);
  s = spinnerReducer(s, { type: 'cardDone' });
  expect(s).toMatchObject({ phase: 'ready', turnIndex: 1, cardId: null });
});

test('ignores actions in the wrong phase (double tap safety)', () => {
  const spinning = spinnerReducer(fresh(), { type: 'spin', rotation: 900, cardId: 'x', usedIds: ['x'] });
  expect(spinnerReducer(spinning, { type: 'spin', rotation: 50, cardId: 'y', usedIds: ['y'] })).toBe(spinning);
  expect(spinnerReducer(fresh(), { type: 'cardDone' }).turnIndex).toBe(0);
});

test('after the last turn the round ends', () => {
  let s: SpinnerState = { ...fresh(), turnIndex: 2, phase: 'card', cardId: 'z' };
  s = spinnerReducer(s, { type: 'cardDone' });
  expect(s.phase).toBe('roundEnd');
});

test('startRound sets level and new turns, keeps used cards', () => {
  const s: SpinnerState = { ...fresh(), phase: 'roundEnd', turnIndex: 2, usedIds: ['a'] };
  const next = spinnerReducer(s, { type: 'startRound', level: 2, turns: [...turns].reverse() });
  expect(next).toMatchObject({ level: 2, turnIndex: 0, phase: 'ready', usedIds: ['a'] });
  expect(next.turns[0]).toEqual(turns[2]);
});

test('startRound is not allowed mid-card', () => {
  const s: SpinnerState = { ...fresh(), phase: 'card', cardId: 'x' };
  expect(spinnerReducer(s, { type: 'startRound', level: 3, turns })).toBe(s);
});

test('restore: rejects garbage, resumes a mid-spin save into the card phase', () => {
  expect(restoreSpinnerGame(null)).toBeNull();
  expect(restoreSpinnerGame({ players: ['solo'] })).toBeNull();
  const saved = { ...fresh(), phase: 'spinning', rotation: 1000, cardId: 'l1-q1' };
  const restored = restoreSpinnerGame(JSON.parse(JSON.stringify(saved)))!;
  expect(restored.phase).toBe('card');
  expect(restored.rotation).toBe(1000 % 360);
});

test('reroll swaps the shown card only while it is shown', () => {
  const shown = { ...createSpinnerGame(['А', 'Б'], { spinDurationSec: 4, actionRatio: 0.3 }, [{ asker: 0, answerer: 1 }, { asker: 1, answerer: 0 }]), phase: 'card' as const, cardId: 'q1', usedIds: ['q1'] };
  const next = spinnerReducer(shown, { type: 'reroll', cardId: 'q2', usedIds: ['q1', 'q2'] });
  expect(next).toMatchObject({ phase: 'card', cardId: 'q2', usedIds: ['q1', 'q2'], turnIndex: 0 });
  const ready = { ...shown, phase: 'ready' as const };
  expect(spinnerReducer(ready, { type: 'reroll', cardId: 'q2', usedIds: [] })).toBe(ready);
});
