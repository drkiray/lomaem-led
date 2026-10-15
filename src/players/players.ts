import { plural } from '../lib/plural';
import { KEYS, loadJSON, saveJSON } from '../lib/storage';

export function cleanPlayers(raw: string[]): string[] {
  return raw.map((name) => name.trim().replace(/\s+/g, ' ')).filter(Boolean);
}

export function validatePlayers(raw: string[], min: number): string | null {
  const names = cleanPlayers(raw);
  if (names.length < min) return `Нужно минимум ${min} ${plural(min, 'игрок', 'игрока', 'игроков')}`;
  const seen = new Set<string>();
  for (const name of names) {
    const key = name.toLowerCase();
    if (seen.has(key)) return `Имя «${name}» повторяется`;
    seen.add(key);
  }
  return null;
}

export function loadLastPlayers(): string[] {
  const value = loadJSON<unknown>(KEYS.lastPlayers, []);
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

export function rememberPlayers(names: string[]): void {
  saveJSON(KEYS.lastPlayers, names);
}
