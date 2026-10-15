import {
  createHatGame, currentExplainer, currentTeam, hatReducer, restoreHatGame, turnScore,
  type HatAction, type HatState,
} from './state';
import type { Team } from './teams';

const teams: Team[] = [
  { id: 't0', name: 'Кактусы', color: '#7fe7ff', players: ['Аня', 'Боря', 'Вика'] },
  { id: 't1', name: 'Ламы', color: '#ff7eb6', players: ['Гоша', 'Даша'] },
];
const config = { turnSeconds: 30, skipPenalty: false, lastWordSeconds: 5 };
const wordSetup = { mode: 'dictionary' as const, difficulty: 'mix' as const, count: 3, ownWords: [] };
const game = (patch: Partial<HatState> = {}): HatState => ({
  ...createHatGame({ teams, words: ['кот', 'дом', 'лес'], order: ['кот', 'дом', 'лес'], config, wordSetup }),
  ...patch,
});
const run = (s: HatState, ...actions: HatAction[]) => actions.reduce(hatReducer, s);
const playing = (patch: Partial<HatState> = {}) =>
  run(game(patch), { type: 'beginRound' }, { type: 'startCountdown' }, { type: 'startPlaying' });

describe('turn flow', () => {
  test('new game', () => {
    const s = game();
    expect(s).toMatchObject({ round: 1, phase: 'roundIntro', teamIdx: 0, hat: ['кот', 'дом', 'лес'], scores: { t0: 0, t1: 0 } });
    expect(currentExplainer(s)).toBe('Аня');
  });

  test('countdown sets full turn time, then playing', () => {
    const s = playing();
    expect(s).toMatchObject({ phase: 'playing', remainingMs: 30000, turn: [] });
  });

  test('guess removes the word; skip sends it to the back', () => {
    let s = run(playing(), { type: 'guess' });
    expect(s.hat).toEqual(['дом', 'лес']);
    s = run(s, { type: 'skip' });
    expect(s.hat).toEqual(['лес', 'дом']);
    expect(s.turn).toEqual([
      { word: 'кот', guessed: true, skipped: false },
      { word: 'дом', guessed: false, skipped: true },
    ]);
  });

  test('time up opens the last-word window; guess there ends the turn', () => {
    let s = run(playing(), { type: 'tick', ms: 29900 });
    expect(s.phase).toBe('playing');
    s = run(s, { type: 'tick', ms: 200 });
    expect(s).toMatchObject({ phase: 'lastWord', remainingMs: 0, lastWordMs: 5000 });
    expect(run(s, { type: 'skip' })).toBe(s);
    s = run(s, { type: 'guess' });
    expect(s.phase).toBe('review');
    expect(s.turn).toEqual([{ word: 'кот', guessed: true, skipped: false }]);
  });

  test('"Не успели" and last-word timeout both return the word to the hat', () => {
    const last = run(playing(), { type: 'tick', ms: 30000 });
    for (const s of [run(last, { type: 'miss' }), run(last, { type: 'tick', ms: 5000 })]) {
      expect(s.phase).toBe('review');
      expect(s.hat).toEqual(['дом', 'лес', 'кот']);
      expect(s.turn).toEqual([{ word: 'кот', guessed: false, skipped: false }]);
    }
  });

  test('last word disabled: time up goes straight to review', () => {
    const s = run(playing({ config: { ...config, lastWordSeconds: 0 } }), { type: 'tick', ms: 30000 });
    expect(s.phase).toBe('review');
    expect(s.turn).toHaveLength(1);
  });

  test('emptying the hat ends the turn immediately with time left', () => {
    const s = run(playing(), { type: 'tick', ms: 10000 }, { type: 'guess' }, { type: 'guess' }, { type: 'guess' });
    expect(s).toMatchObject({ phase: 'review', hat: [], remainingMs: 20000 });
  });
});

describe('review and scoring', () => {
  test('turnScore counts unique guessed words and optional skip penalty', () => {
    const entries = [
      { word: 'a', guessed: true, skipped: false },
      { word: 'b', guessed: false, skipped: true },
      { word: 'c', guessed: false, skipped: false },
    ];
    expect(turnScore(entries, false)).toBe(1);
    expect(turnScore(entries, true)).toBe(0);
  });

  test('confirm adds score, passes turn to next team, rotates that team explainer', () => {
    let s = run(playing(), { type: 'guess' }, { type: 'tick', ms: 30000 }, { type: 'miss' }, { type: 'confirmTurn' });
    expect(s).toMatchObject({ phase: 'ready', teamIdx: 1, scores: { t0: 1, t1: 0 } });
    expect(currentTeam(s).id).toBe('t1');
    expect(currentExplainer(s)).toBe('Гоша');
    s = run(s, { type: 'startCountdown' }, { type: 'startPlaying' }, { type: 'tick', ms: 30000 }, { type: 'miss' }, { type: 'confirmTurn' });
    expect(currentExplainer(s)).toBe('Боря');
  });

  test('explainers cycle independently in unequal teams', () => {
    const passTurn = (s: HatState) =>
      run(s, { type: 'startCountdown' }, { type: 'startPlaying' }, { type: 'tick', ms: 30000 }, { type: 'miss' }, { type: 'confirmTurn' });
    let s = run(game(), { type: 'beginRound' });
    const seen: string[] = [];
    for (let i = 0; i < 6; i++) {
      seen.push(currentExplainer(s));
      s = passTurn(s);
    }
    expect(seen).toEqual(['Аня', 'Гоша', 'Боря', 'Даша', 'Вика', 'Гоша']);
  });

  test('un-ticking a word in review puts it back; ticking a skipped word removes it', () => {
    let s = run(playing(), { type: 'guess' }, { type: 'skip' }, { type: 'tick', ms: 30000 }, { type: 'miss' });
    // turn: кот ✓, дом skip, лес missed; hat: дом, лес
    s = run(s, { type: 'toggle', index: 0 }, { type: 'toggle', index: 1 }, { type: 'confirmTurn' });
    expect([...s.hat].sort()).toEqual(['кот', 'лес']);
    expect(s.scores.t0).toBe(1);
  });

  test('hat emptied with time left → round ends, same team/explainer carry the time', () => {
    let s = run(playing(), { type: 'tick', ms: 12000 }, { type: 'guess' }, { type: 'guess' }, { type: 'guess' }, { type: 'confirmTurn' });
    expect(s).toMatchObject({ phase: 'roundEnd', teamIdx: 0, carryOverMs: 18000, scores: { t0: 3 } });
    expect(currentExplainer(s)).toBe('Аня');
    s = run(s, { type: 'nextRound', order: ['лес', 'кот', 'дом'] }, { type: 'beginRound' }, { type: 'startCountdown' });
    expect(s).toMatchObject({ round: 2, phase: 'countdown', remainingMs: 18000, carryOverMs: null, hat: ['лес', 'кот', 'дом'] });
  });

  test('hat emptied exactly at time-up → round ends without carry, next team starts', () => {
    const s = run(
      playing({ hat: ['кот'] }),
      { type: 'tick', ms: 30000 }, { type: 'guess' }, { type: 'confirmTurn' },
    );
    expect(s).toMatchObject({ phase: 'roundEnd', carryOverMs: null, teamIdx: 1 });
  });

  test('un-ticking the word that emptied the hat keeps the round going', () => {
    const s = run(playing({ hat: ['кот'] }), { type: 'guess' }, { type: 'toggle', index: 0 }, { type: 'confirmTurn' });
    expect(s).toMatchObject({ phase: 'ready', hat: ['кот'], round: 1, teamIdx: 1 });
  });

  test('emptying the hat in round 3 ends the game', () => {
    const s = run(playing({ round: 3, hat: ['кот'] }), { type: 'guess' }, { type: 'confirmTurn' });
    expect(s.phase).toBe('gameEnd');
  });

  test('restart keeps teams and config, resets everything else', () => {
    const s = run(game({ phase: 'gameEnd', round: 3, scores: { t0: 9, t1: 4 }, teamIdx: 1 }), {
      type: 'restart', words: ['а', 'б'], order: ['б', 'а'],
    });
    expect(s).toMatchObject({ phase: 'roundIntro', round: 1, teamIdx: 0, scores: { t0: 0, t1: 0 }, words: ['а', 'б'], hat: ['б', 'а'] });
    expect(s.teams).toEqual(teams);
  });
});

describe('restore', () => {
  test('garbage → null', () => {
    expect(restoreHatGame(null)).toBeNull();
    expect(restoreHatGame({ teams: [] })).toBeNull();
  });

  test('mid-turn save resumes at review', () => {
    const s = run(playing(), { type: 'guess' });
    const restored = restoreHatGame(JSON.parse(JSON.stringify(s)))!;
    expect(restored.phase).toBe('review');
    expect(restored.turn).toHaveLength(1);
  });

  test('countdown save resumes at ready keeping carried time', () => {
    const s = run(game({ carryOverMs: 7000 }), { type: 'beginRound' }, { type: 'startCountdown' });
    expect(restoreHatGame(s)).toMatchObject({ phase: 'ready', carryOverMs: 7000 });
  });
});
