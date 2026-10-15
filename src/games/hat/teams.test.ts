import { mulberry32 } from '../../lib/random';
import { maxTeams, movePlayerToNextTeam, renameTeam, splitIntoTeams, validateTeams } from './teams';

const players = ['Аня', 'Боря', 'Вика', 'Гоша', 'Даша', 'Егор', 'Женя'];

test('splits players evenly into teams with distinct names and colors', () => {
  const teams = splitIntoTeams(players, 2, mulberry32(1));
  expect(teams.map((t) => t.players.length).sort()).toEqual([3, 4]);
  expect(teams.flatMap((t) => t.players).sort()).toEqual([...players].sort());
  expect(new Set(teams.map((t) => t.name)).size).toBe(2);
  expect(new Set(teams.map((t) => t.color)).size).toBe(2);
  expect(teams.map((t) => t.id)).toEqual(['t0', 't1']);
});

test('maxTeams keeps at least two per team', () => {
  expect(maxTeams(4)).toBe(2);
  expect(maxTeams(7)).toBe(3);
  expect(maxTeams(3)).toBe(2);
});

test('tap moves a player to the next team, cycling', () => {
  const teams = splitIntoTeams(players, 3, mulberry32(2));
  const player = teams[2].players[0];
  const moved = movePlayerToNextTeam(teams, player);
  expect(moved[2].players).not.toContain(player);
  expect(moved[0].players).toContain(player);
});

test('rename', () => {
  const teams = splitIntoTeams(players, 2, mulberry32(3));
  expect(renameTeam(teams, 't1', 'Звёзды')[1].name).toBe('Звёзды');
});

test('validation', () => {
  const teams = splitIntoTeams(['a', 'b', 'c', 'd'], 2, mulberry32(4));
  expect(validateTeams(teams)).toBeNull();
  const lonely = movePlayerToNextTeam(teams, teams[0].players[0]);
  expect(validateTeams(lonely)).toMatch(/меньше двух игроков/);
  expect(validateTeams(renameTeam(teams, 't0', '  '))).toBe('У каждой команды должно быть название');
  expect(validateTeams(renameTeam(teams, 't0', teams[1].name.toUpperCase()))).toBe('Названия команд повторяются');
});
