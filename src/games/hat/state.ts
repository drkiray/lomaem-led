import type { Team } from './teams';
import type { WordSetup } from './words';

export type HatRound = 1 | 2 | 3;
export type HatPhase = 'roundIntro' | 'ready' | 'countdown' | 'playing' | 'lastWord' | 'review' | 'roundEnd' | 'gameEnd';

export interface HatConfig {
  turnSeconds: number;
  skipPenalty: boolean;
  lastWordSeconds: number;
}

export interface TurnEntry {
  word: string;
  guessed: boolean;
  skipped: boolean;
}

export interface HatState {
  config: HatConfig;
  wordSetup: WordSetup;
  teams: Team[];
  scores: Record<string, number>;
  explainerIdx: Record<string, number>;
  words: string[];
  round: HatRound;
  hat: string[]; // hat[0] is the word currently on screen
  teamIdx: number;
  phase: HatPhase;
  remainingMs: number;
  lastWordMs: number;
  carryOverMs: number | null;
  turn: TurnEntry[];
}

export type HatAction =
  | { type: 'beginRound' }
  | { type: 'startCountdown' }
  | { type: 'startPlaying' }
  | { type: 'tick'; ms: number }
  | { type: 'guess' }
  | { type: 'skip' }
  | { type: 'miss' }
  | { type: 'toggle'; index: number }
  | { type: 'confirmTurn' }
  | { type: 'nextRound'; order: string[] }
  | { type: 'restart'; words: string[]; order: string[] };

interface CreateInput {
  teams: Team[];
  words: string[];
  order: string[];
  config: HatConfig;
  wordSetup: WordSetup;
}

export function createHatGame({ teams, words, order, config, wordSetup }: CreateInput): HatState {
  return {
    config,
    wordSetup,
    teams,
    words,
    scores: Object.fromEntries(teams.map((t) => [t.id, 0])),
    explainerIdx: Object.fromEntries(teams.map((t) => [t.id, 0])),
    round: 1,
    hat: order,
    teamIdx: 0,
    phase: 'roundIntro',
    remainingMs: config.turnSeconds * 1000,
    lastWordMs: 0,
    carryOverMs: null,
    turn: [],
  };
}

export function currentTeam(s: HatState): Team {
  return s.teams[s.teamIdx];
}

export function currentExplainer(s: HatState): string {
  const team = currentTeam(s);
  return team.players[s.explainerIdx[team.id] % team.players.length];
}

export function turnScore(entries: TurnEntry[], skipPenalty: boolean): number {
  const guessed = new Set(entries.filter((e) => e.guessed).map((e) => e.word));
  const penalty = skipPenalty ? entries.filter((e) => e.skipped && !e.guessed).length : 0;
  return guessed.size - penalty;
}

function missCurrent(s: HatState): HatState {
  const [word, ...rest] = s.hat;
  if (word === undefined) return { ...s, phase: 'review' };
  return { ...s, hat: [...rest, word], turn: [...s.turn, { word, guessed: false, skipped: false }], phase: 'review' };
}

function passTurn(s: HatState): HatState {
  const team = currentTeam(s);
  return {
    ...s,
    explainerIdx: { ...s.explainerIdx, [team.id]: s.explainerIdx[team.id] + 1 },
    teamIdx: (s.teamIdx + 1) % s.teams.length,
  };
}

// Applies the (possibly corrected) review: guessed words leave the hat,
// everything else is back in it. Empty hat ends the round; leftover time
// stays with the same team and explainer.
function confirmTurn(s: HatState): HatState {
  const guessed = new Set(s.turn.filter((e) => e.guessed).map((e) => e.word));
  const hat = s.hat.filter((w) => !guessed.has(w));
  for (const e of s.turn) {
    if (!guessed.has(e.word) && !hat.includes(e.word)) hat.push(e.word);
  }
  const team = currentTeam(s);
  const scored: HatState = {
    ...s,
    hat,
    turn: [],
    scores: { ...s.scores, [team.id]: s.scores[team.id] + turnScore(s.turn, s.config.skipPenalty) },
  };

  if (hat.length > 0) return { ...passTurn(scored), phase: 'ready' };
  if (s.round === 3) return { ...scored, phase: 'gameEnd' };
  if (s.remainingMs > 0) return { ...scored, phase: 'roundEnd', carryOverMs: s.remainingMs };
  return { ...passTurn(scored), phase: 'roundEnd', carryOverMs: null };
}

export function hatReducer(s: HatState, a: HatAction): HatState {
  switch (a.type) {
    case 'beginRound':
      return s.phase === 'roundIntro' ? { ...s, phase: 'ready' } : s;

    case 'startCountdown':
      if (s.phase !== 'ready') return s;
      return {
        ...s,
        phase: 'countdown',
        remainingMs: s.carryOverMs ?? s.config.turnSeconds * 1000,
        carryOverMs: null,
        lastWordMs: 0,
        turn: [],
      };

    case 'startPlaying':
      return s.phase === 'countdown' ? { ...s, phase: 'playing' } : s;

    case 'tick': {
      if (s.phase === 'playing') {
        const remainingMs = s.remainingMs - a.ms;
        if (remainingMs > 0) return { ...s, remainingMs };
        if (s.config.lastWordSeconds > 0) {
          return { ...s, remainingMs: 0, phase: 'lastWord', lastWordMs: s.config.lastWordSeconds * 1000 };
        }
        return missCurrent({ ...s, remainingMs: 0 });
      }
      if (s.phase === 'lastWord') {
        const lastWordMs = s.lastWordMs - a.ms;
        if (lastWordMs > 0) return { ...s, lastWordMs };
        return missCurrent({ ...s, lastWordMs: 0 });
      }
      return s;
    }

    case 'guess': {
      if ((s.phase !== 'playing' && s.phase !== 'lastWord') || s.hat.length === 0) return s;
      const [word, ...rest] = s.hat;
      const done = s.phase === 'lastWord' || rest.length === 0;
      return { ...s, hat: rest, turn: [...s.turn, { word, guessed: true, skipped: false }], phase: done ? 'review' : 'playing' };
    }

    case 'skip': {
      if (s.phase !== 'playing' || s.hat.length === 0) return s;
      const [word, ...rest] = s.hat;
      return { ...s, hat: [...rest, word], turn: [...s.turn, { word, guessed: false, skipped: true }] };
    }

    case 'miss':
      return s.phase === 'lastWord' ? missCurrent(s) : s;

    case 'toggle':
      if (s.phase !== 'review' || !s.turn[a.index]) return s;
      return { ...s, turn: s.turn.map((e, i) => (i === a.index ? { ...e, guessed: !e.guessed } : e)) };

    case 'confirmTurn':
      return s.phase === 'review' ? confirmTurn(s) : s;

    case 'nextRound':
      if (s.phase !== 'roundEnd' || s.round === 3) return s;
      return { ...s, round: (s.round + 1) as HatRound, hat: a.order, phase: 'roundIntro', turn: [] };

    case 'restart':
      return createHatGame({ teams: s.teams, words: a.words, order: a.order, config: s.config, wordSetup: s.wordSetup });
  }
}

export function restoreHatGame(raw: unknown): HatState | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as HatState;
  if (!Array.isArray(s.teams) || s.teams.length < 2) return null;
  if (!Array.isArray(s.words) || !Array.isArray(s.hat) || !Array.isArray(s.turn) || !s.config) return null;
  // The timer cannot survive a reload: close the interrupted turn into review.
  if (s.phase === 'playing' || s.phase === 'lastWord') return { ...s, phase: 'review' };
  if (s.phase === 'countdown') {
    const full = s.config.turnSeconds * 1000;
    return { ...s, phase: 'ready', carryOverMs: s.remainingMs < full ? s.remainingMs : null };
  }
  return s;
}
