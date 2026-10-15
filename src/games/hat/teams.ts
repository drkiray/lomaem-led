import { range, shuffle, type Rng } from '../../lib/random';

export interface Team {
  id: string;
  name: string;
  color: string;
  players: string[];
}

export const TEAM_NAMES = ['Пингвины', 'Кактусы', 'Еноты', 'Ламы', 'Акулы', 'Совы', 'Ёжики', 'Йети', 'Манулы', 'Тюлени'];
export const TEAM_COLORS = ['#7fe7ff', '#ff7eb6', '#ffd166', '#7cff9e', '#b69cff', '#ff9f5a', '#5ad1ff', '#ff5e7e', '#c3ff5a', '#ffa8e2'];
export const MIN_TEAM_SIZE = 2;
export const MIN_HAT_PLAYERS = 4;

export function maxTeams(playerCount: number): number {
  return Math.max(2, Math.floor(playerCount / MIN_TEAM_SIZE));
}

export function splitIntoTeams(players: string[], teamCount: number, rng: Rng): Team[] {
  const shuffled = shuffle(players, rng);
  const names = shuffle(TEAM_NAMES, rng);
  return range(teamCount).map((i) => ({
    id: `t${i}`,
    name: names[i % names.length],
    color: TEAM_COLORS[i % TEAM_COLORS.length],
    players: shuffled.filter((_, k) => k % teamCount === i),
  }));
}

export function movePlayerToNextTeam(teams: Team[], player: string): Team[] {
  const from = teams.findIndex((t) => t.players.includes(player));
  if (from < 0) return teams;
  const to = (from + 1) % teams.length;
  return teams.map((t, i) => {
    if (i === from) return { ...t, players: t.players.filter((p) => p !== player) };
    if (i === to) return { ...t, players: [...t.players, player] };
    return t;
  });
}

export function renameTeam(teams: Team[], teamId: string, name: string): Team[] {
  return teams.map((t) => (t.id === teamId ? { ...t, name } : t));
}

export function validateTeams(teams: Team[]): string | null {
  for (const t of teams) {
    if (!t.name.trim()) return 'У каждой команды должно быть название';
  }
  for (const t of teams) {
    if (t.players.length < MIN_TEAM_SIZE) return `В команде «${t.name}» меньше двух игроков`;
  }
  const names = teams.map((t) => t.name.trim().toLowerCase());
  if (new Set(names).size !== names.length) return 'Названия команд повторяются';
  return null;
}
