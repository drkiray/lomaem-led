import type { BirthdayPlan, Level } from './deck';
import { normalizeDeg } from './geometry';
import type { Turn } from './turns';

export type SpinnerPhase = 'ready' | 'spinning' | 'card' | 'roundEnd';

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
}

export type SpinnerAction =
  | { type: 'spin'; rotation: number; cardId: string; usedIds: string[]; birthday?: BirthdayPlan }
  | { type: 'spinDone' }
  | { type: 'reroll'; cardId: string; usedIds: string[] }
  | { type: 'cardDone' }
  | { type: 'startRound'; level: Level; turns: Turn[] };

export function createSpinnerGame(players: string[], config: SpinnerConfig, turns: Turn[], birthday: BirthdayPlan | null = null): SpinnerState {
  return { players, config, level: 1, turns, turnIndex: 0, phase: 'ready', rotation: 0, cardId: null, usedIds: [], birthday };
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
      return { ...state, phase: 'card', rotation: normalizeDeg(state.rotation) };
    case 'reroll':
      if (state.phase !== 'card') return state;
      return { ...state, cardId: action.cardId, usedIds: action.usedIds };
    case 'cardDone':
      if (state.phase !== 'card') return state;
      if (state.turnIndex + 1 >= state.turns.length) return { ...state, phase: 'roundEnd', cardId: null };
      return { ...state, phase: 'ready', turnIndex: state.turnIndex + 1, cardId: null };
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
  const fixed = { ...s, birthday };
  if (s.phase === 'spinning') return { ...fixed, phase: 'card', rotation: normalizeDeg(s.rotation) };
  return fixed;
}
