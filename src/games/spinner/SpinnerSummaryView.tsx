import { plural } from '../../lib/plural';
import { Button } from '../../ui/Button';
import { Screen } from '../../ui/Screen';
import { LEVEL_TITLES } from './deck';
import type { SpinnerState } from './state';
import { formatDuration, summarize } from './summary';

interface Props {
  state: SpinnerState;
  onMenu: () => void;
  onNewGame: () => void;
}

export function SpinnerSummaryView({ state, onMenu, onNewGame }: Props) {
  const s = summarize(state);
  const stats: [number | string, string][] = [
    [s.questions, plural(s.questions, 'вопрос', 'вопроса', 'вопросов')],
    [s.actions, plural(s.actions, 'действие', 'действия', 'действий')],
    [s.rounds, `${plural(s.rounds, 'круг', 'круга', 'кругов')} пройдено`],
    [s.deepest ? LEVEL_TITLES[s.deepest] : '—', 'самый глубокий уровень'],
  ];
  return (
    <Screen title="Итоги вечера" onBack={onMenu}>
      <div className="summary">
        <div className="summary__hero">
          <div className="summary__hero-icon" aria-hidden="true">🎉</div>
          <p className="summary__hero-title">Вот это был разговор!</p>
          <p className="muted">
            {state.players.length} {plural(state.players.length, 'игрок', 'игрока', 'игроков')} · {formatDuration(s.durationMs)} вместе
          </p>
        </div>

        <ul className="summary__stats">
          {stats.map(([value, label]) => (
            <li key={label} className="summary__stat">
              <b>{value}</b>
              <span>{label}</span>
            </li>
          ))}
        </ul>

        {s.awards.length > 0 && (
          <ul className="summary__awards" aria-label="Номинации">
            {s.awards.map((a) => (
              <li key={a.title} className="summary__award">
                <span className="summary__award-icon" aria-hidden="true">{a.icon}</span>
                <div>
                  <p className="summary__award-title">{a.title}</p>
                  <p className="summary__award-name">{a.name}</p>
                  <p className="muted">{a.detail}</p>
                  {a.quote && <p className="summary__quote">«{a.quote}»</p>}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="summary__actions">
          <Button variant="ghost" onClick={onMenu}>В меню</Button>
          <Button onClick={onNewGame}>Новая игра</Button>
        </div>
      </div>
    </Screen>
  );
}
