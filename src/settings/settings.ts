export type WordDifficulty = 'easy' | 'medium' | 'hard';
export type DifficultySetting = WordDifficulty | 'mix';
export type TurnSeconds = 30 | 45 | 60 | 90;
export type WordCount = 30 | 40 | 60;

export interface SpinnerSettings {
  spinDurationSec: number;
  actionRatio: number;
}

export interface HatSettings {
  turnSeconds: TurnSeconds;
  skipPenalty: boolean;
  lastWordSeconds: number;
  difficulty: DifficultySetting;
  wordCount: WordCount;
  wordsPerPlayer: number;
}

// Bump when a default changes in a way saved values must not override.
// v2: music is on by default (v1 saved the old default of 0 for everyone).
export const SETTINGS_VERSION = 2;

export interface Settings {
  version: number;
  sfxVolume: number;
  musicVolume: number;
  vibration: boolean;
  keepAwake: boolean;
  landscapeGames: boolean;
  spinner: SpinnerSettings;
  hat: HatSettings;
}

export type SettingsPatch = Partial<Omit<Settings, 'spinner' | 'hat'>> & {
  spinner?: Partial<SpinnerSettings>;
  hat?: Partial<HatSettings>;
};

export const DEFAULT_SETTINGS: Settings = {
  version: SETTINGS_VERSION,
  sfxVolume: 0.8,
  musicVolume: 0.3,
  vibration: true,
  keepAwake: true,
  landscapeGames: true,
  spinner: { spinDurationSec: 4, actionRatio: 0.3 },
  hat: {
    turnSeconds: 60,
    skipPenalty: false,
    lastWordSeconds: 5,
    difficulty: 'mix',
    wordCount: 40,
    wordsPerPlayer: 5,
  },
};

export function applyPatch(base: Settings, patch: SettingsPatch): Settings {
  return {
    ...base,
    ...patch,
    spinner: { ...base.spinner, ...patch.spinner },
    hat: { ...base.hat, ...patch.hat },
  };
}

export function mergeSettings(stored: unknown): Settings {
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return DEFAULT_SETTINGS;
  const patch = stored as SettingsPatch;
  const merged = applyPatch(DEFAULT_SETTINGS, patch);
  if ((patch.version ?? 1) < 2) merged.musicVolume = DEFAULT_SETTINGS.musicVolume;
  return { ...merged, version: SETTINGS_VERSION };
}
