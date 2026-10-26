import type { BirthdayPlan, Level } from './deck';
import { normalizeDeg } from './geometry';
import type { Turn } from './turns';

export type SpinnerPhase = 'ready' | 'spinning' | 'card' | 'roundEnd' | 'summary';

// One finished card, for the end-of-game summary.
export interface LogEntry {
  asker: number;
  answerer: number;
  cardId: string;
  ms: number; // card on screen until «Готово» (capped: a phone left on the table)
  rerolls: number; // «не хочу отвечать» presses on this turn
}

export const MAX_ANSWER_MS = 15 * 60 * 1000;

export interface SpinnerConfig {
  spinDurationSec: number;
  actionRatio: number;
}

export interface SpinnerState {
  players: string[];
  config: SpinnerConfig;
  level: Level;
  turns: Turn[];
  turnIndex: number;
  phase: SpinnerPhase;
  rotation: number;
  cardId: string | null;
  usedIds: string[];
  birthday: BirthdayPlan | null;
  startedAt: number;
  finishedAt: number | null;
  cardOpenedAt: number | null;
  cardRerolls: number;
  roundsDone: number;
  log: LogEntry[];
}

export type SpinnerAction =
  | { type: 'spin'; rotation: number; cardId: string; usedIds: string[]; birthday?: BirthdayPlan }
  | { type: 'spinDone'; at?: number }
  | { type: 'reroll'; cardId: string; usedIds: string[] }
  | { type: 'cardDone'; at?: number }
  | { type: 'startRound'; level: Level; turns: Turn[] }
  | { type: 'finish'; at: number };

export function createSpinnerGame(
  players: string[],
  config: SpinnerConfig,
  turns: Turn[],
  birthday: BirthdayPlan | null = null,
  now = Date.now(),
): SpinnerState {
  return {
    players, config, level: 1, turns, turnIndex: 0, phase: 'ready', rotation: 0, cardId: null, usedIds: [], birthday,
    startedAt: now, finishedAt: null, cardOpenedAt: null, cardRerolls: 0, roundsDone: 0, log: [],
  };
}

export function currentTurn(state: SpinnerState): Turn {
  return state.turns[state.turnIndex];
}

export function spinnerReducer(state: SpinnerState, action: SpinnerAction): SpinnerState {
  switch (action.type) {
    case 'spin':
      if (state.phase !== 'ready') return state;
      return { ...state, phase: 'spinning', rotation: action.rotation, cardId: action.cardId, usedIds: action.usedIds, birthday: action.birthday ?? state.birthday };
    case 'spinDone':
      if (state.phase !== 'spinning') return state;
      return { ...state, phase: 'card', rotation: normalizeDeg(state.rotation), cardOpenedAt: action.at ?? null, cardRerolls: 0 };
    case 'reroll':
      if (state.phase !== 'card') return state;
      return { ...state, cardId: action.cardId, usedIds: action.usedIds, cardRerolls: state.cardRerolls + 1 };
    case 'cardDone': {
      if (state.phase !== 'card') return state;
      const turn = currentTurn(state);
      const opened = state.cardOpenedAt;
      const ms = opened !== null && action.at !== undefined ? Math.min(MAX_ANSWER_MS, Math.max(0, action.at - opened)) : 0;
      const entry: LogEntry = { asker: turn.asker, answerer: turn.answerer, cardId: state.cardId ?? '', ms, rerolls: state.cardRerolls };
      const logged = { ...state, cardId: null, cardOpenedAt: null, cardRerolls: 0, log: [...state.log, entry] };
      if (state.turnIndex + 1 >= state.turns.length) return { ...logged, phase: 'roundEnd', roundsDone: state.roundsDone + 1 };
      return { ...logged, phase: 'ready', turnIndex: state.turnIndex + 1 };
    }
    case 'finish':
      if (state.phase === 'spinning' || state.phase === 'summary') return state;
      return { ...state, phase: 'summary', cardId: null, finishedAt: action.at };
    case 'startRound':
      if (state.phase !== 'ready' && state.phase !== 'roundEnd') return state;
      return { ...state, phase: 'ready', level: action.level, turns: action.turns, turnIndex: 0, cardId: null };
  }
}

export function restoreSpinnerGame(raw: unknown): SpinnerState | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as SpinnerState;
  if (!Array.isArray(s.players) || s.players.length < 2) return null;
  if (!Array.isArray(s.turns) || s.turns.length !== s.players.length) return null;
  if (typeof s.turnIndex !== 'number' || !s.turns[s.turnIndex]) return null;
  const b = s.birthday;
  const birthday = b && b.index >= 0 && b.index < s.players.length && (b.every === 2 || b.every === 3) && b.since >= 0 ? b : null;
  const log = Array.isArray(s.log) ? s.log : [];
  const fixed: SpinnerState = {
    ...s,
    birthday,
    log,
    // saves from before the summary existed
    startedAt: typeof s.startedAt === 'number' ? s.startedAt : Date.now(),
    finishedAt: typeof s.finishedAt === 'number' ? s.finishedAt : null,
    cardOpenedAt: typeof s.cardOpenedAt === 'number' ? s.cardOpenedAt : null,
    cardRerolls: typeof s.cardRerolls === 'number' ? s.cardRerolls : 0,
    roundsDone: typeof s.roundsDone === 'number' ? s.roundsDone : 0,
  };
  if (s.phase === 'spinning') return { ...fixed, phase: 'card', rotation: normalizeDeg(s.rotation) };
  return fixed;
}
