const PREFIX = 'll.';

export const KEYS = {
  settings: 'settings',
  lastPlayers: 'lastPlayers',
  spinnerGame: 'spinner.game',
  spinnerSeen: 'spinner.seen',
  hatGame: 'hat.game',
  hatReplay: 'hat.replay',
} as const;

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function saveJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // storage full or blocked — the app keeps working in memory
  }
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
}
