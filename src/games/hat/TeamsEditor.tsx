import type { CSSProperties } from 'react';
import { range } from '../../lib/random';
import { Button } from '../../ui/Button';
import { Segmented } from '../../ui/Segmented';
import { TEAM_NAMES, maxTeams, movePlayerToNextTeam, renameTeam, splitIntoTeams, type Team } from './teams';

interface Props {
  teams: Team[];
  onChange: (teams: Team[]) => void;
}

export function TeamsEditor({ teams, onChange }: Props) {
  const players = teams.flatMap((t) => t.players);
  const max = Math.min(maxTeams(players.length), TEAM_NAMES.length);
  const options = range(max - 1).map((i) => ({ value: i + 2, label: String(i + 2) }));

  return (
    <div className="stack">
      {options.length > 1 && (
        <Segmented label="Сколько команд" options={options} value={teams.length}
          onChange={(n) => onChange(splitIntoTeams(players, n, Math.random))} />
      )}
      <Button variant="ghost" onClick={() => onChange(splitIntoTeams(players, teams.length, Math.random))}>
        🔀 Перемешать
      </Button>
      <p className="muted">Нажми на игрока, чтобы перевести его в следующую команду. Название можно поменять.</p>
      {teams.map((team, i) => (
        <section key={team.id} className="team-card" style={{ '--team': team.color } as CSSProperties}>
          <input
            className="input team-card__name"
            aria-label={`Название команды ${i + 1}`}
            value={team.name}
            maxLength={20}
            onChange={(e) => onChange(renameTeam(teams, team.id, e.target.value))}
          />
          <div className="team-card__players">
            {team.players.map((p) => (
              <button key={p} type="button" className="chip" onClick={() => onChange(movePlayerToNextTeam(teams, p))}>
                {p}
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
