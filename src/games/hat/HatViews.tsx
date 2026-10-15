import { useEffect, useState, type CSSProperties } from 'react';
import { useFeedback } from '../../audio/useFeedback';
import { plural } from '../../lib/plural';
import { Button } from '../../ui/Button';
import { ROUNDS } from './rounds';
import { currentExplainer, currentTeam, turnScore, type HatRound, type HatState, type TurnEntry } from './state';
import type { Team } from './teams';

const teamStyle = (team: Team) => ({ '--team': team.color }) as CSSProperties;
const seconds = (ms: number) => Math.ceil(ms / 1000);

export function ScoreBoard({ state, highlightCurrent = false }: { state: HatState; highlightCurrent?: boolean }) {
  return (
    <ul className="scoreboard">
      {state.teams.map((team, i) => (
        <li key={team.id} style={teamStyle(team)} className={highlightCurrent && i === state.teamIdx ? 'is-current' : ''}>
          <span>{team.name}</span>
          <b>{state.scores[team.id]}</b>
        </li>
      ))}
    </ul>
  );
}

export function RoundIntroView({ round, onStart }: { round: HatRound; onStart: () => void }) {
  const info = ROUNDS[round];
  return (
    <div className="hat-view">
      <div className="hat-view__icon" aria-hidden="true">{info.icon}</div>
      <p className="muted">Раунд {round} из 3</p>
      <h2 className="hat-view__title">{info.title}</h2>
      <p className="hat-view__rules">{info.rules}</p>
      <Button size="lg" onClick={onStart}>Поехали</Button>
    </div>
  );
}

export function ReadyView({ state, onStart }: { state: HatState; onStart: () => void }) {
  const team = currentTeam(state);
  const explainer = currentExplainer(state);
  const guessers = team.players.filter((p) => p !== explainer);
  return (
    <div className="hat-view">
      <span className="team-badge" style={teamStyle(team)}>{team.name}</span>
      <p className="explainer">
        Объясняет <b>{explainer}</b>
      </p>
      <p className="muted">Угадывают: {guessers.join(', ')}</p>
      <p className="muted">
        В шляпе {state.hat.length} {plural(state.hat.length, 'слово', 'слова', 'слов')}
        {state.carryOverMs !== null && ` · остаток времени ${seconds(state.carryOverMs)} сек`}
      </p>
      <ScoreBoard state={state} highlightCurrent />
      <Button size="lg" onClick={onStart}>Старт</Button>
    </div>
  );
}

export function CountdownView({ onDone }: { onDone: () => void }) {
  const [n, setN] = useState(3);
  const fx = useFeedback();
  useEffect(() => {
    if (n === 0) {
      onDone();
      return;
    }
    fx.sfx('countdown');
    const id = window.setTimeout(() => setN(n - 1), 1000);
    return () => window.clearTimeout(id);
    // deps are only `n`: new onDone/fx identities must not restart the countdown
  }, [n]);
  return (
    <div className="countdown" key={n} aria-live="assertive">
      {n > 0 ? n : ''}
    </div>
  );
}

function TimerRing({ remainingMs, totalMs }: { remainingMs: number; totalMs: number }) {
  const r = 52;
  const length = 2 * Math.PI * r;
  const fraction = Math.max(0, Math.min(1, remainingMs / totalMs));
  const secs = seconds(remainingMs);
  return (
    <div className={`timer ${secs <= 10 ? 'timer--low' : ''}`} role="timer" aria-label={`Осталось ${secs} ${plural(secs, 'секунда', 'секунды', 'секунд')}`}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle className="timer__track" cx="60" cy="60" r={r} />
        <circle className="timer__bar" cx="60" cy="60" r={r} strokeDasharray={length}
          strokeDashoffset={length * (1 - fraction)} transform="rotate(-90 60 60)" />
      </svg>
      <span className="timer__value">{secs}</span>
    </div>
  );
}

export function PlayingView({ state, onGuess, onSkip }: { state: HatState; onGuess: () => void; onSkip: () => void }) {
  const guessed = state.turn.filter((e) => e.guessed).length;
  return (
    <div className="hat-view">
      <span className="team-badge" style={teamStyle(currentTeam(state))}>
        {currentExplainer(state)} · {currentTeam(state).name}
      </span>
      <TimerRing remainingMs={state.remainingMs} totalMs={state.config.turnSeconds * 1000} />
      <div className="word-card" aria-live="polite">{state.hat[0]}</div>
      <div className="hat-play__actions">
        <Button variant="ghost" onClick={onSkip}>Пропуск</Button>
        <Button onClick={onGuess}>Угадали ✓</Button>
      </div>
      <p className="muted">Угадано за ход: {guessed}</p>
    </div>
  );
}

export function LastWordView({ state, onGuess, onMiss }: { state: HatState; onGuess: () => void; onMiss: () => void }) {
  return (
    <div className="hat-view">
      <h2 className="hat-view__title">Время вышло!</h2>
      <p className="muted">Последняя попытка: {seconds(state.lastWordMs)} сек</p>
      <div className="word-card">{state.hat[0]}</div>
      <div className="hat-play__actions">
        <Button variant="ghost" onClick={onMiss}>Не успели</Button>
        <Button onClick={onGuess}>Угадали ✓</Button>
      </div>
    </div>
  );
}

export function ReviewView({ entries, skipPenalty, onToggle, onConfirm }: {
  entries: TurnEntry[];
  skipPenalty: boolean;
  onToggle: (index: number) => void;
  onConfirm: () => void;
}) {
  const score = turnScore(entries, skipPenalty);
  return (
    <div className="hat-view">
      <h2 className="hat-view__title">Итоги хода</h2>
      <p className="muted">Нажми на слово, чтобы исправить ошибку.</p>
      {entries.length === 0 ? (
        <p className="muted">За этот ход слов не было.</p>
      ) : (
        <ul className="review">
          {entries.map((e, i) => (
            <li key={i}>
              <button type="button" role="checkbox" aria-checked={e.guessed}
                className={`review__item ${e.guessed ? 'is-guessed' : ''}`} onClick={() => onToggle(i)}>
                <span className="review__mark" aria-hidden="true">{e.guessed ? '✓' : '✕'}</span>
                <span className="review__word">{e.word}</span>
                {e.skipped && !e.guessed && <span className="review__tag">пропуск</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="review__score">За ход: {score > 0 ? `+${score}` : score}</p>
      <Button size="lg" onClick={onConfirm}>Передать ход</Button>
    </div>
  );
}

export function RoundEndView({ state, onNext }: { state: HatState; onNext: () => void }) {
  const next = ROUNDS[(state.round + 1) as HatRound];
  return (
    <div className="hat-view">
      <h2 className="hat-view__title">Раунд {state.round} завершён!</h2>
      <ScoreBoard state={state} />
      {state.carryOverMs !== null && (
        <p className="muted">
          Команда «{currentTeam(state).name}» начнёт следующий раунд: осталось {seconds(state.carryOverMs)} сек
        </p>
      )}
      <Button size="lg" onClick={onNext}>Дальше: {next.title}</Button>
    </div>
  );
}

export function GameEndView({ state, onReplay, onMenu }: { state: HatState; onReplay: () => void; onMenu: () => void }) {
  const best = Math.max(...state.teams.map((t) => state.scores[t.id]));
  const winners = state.teams.filter((t) => state.scores[t.id] === best);
  const sorted = { ...state, teams: [...state.teams].sort((a, b) => state.scores[b.id] - state.scores[a.id]) };
  return (
    <div className="hat-view">
      <div className="hat-view__icon" aria-hidden="true">🎩</div>
      <p className="winner">{winners.length > 1 ? 'Ничья! 🤝' : `Победили «${winners[0].name}»! 🏆`}</p>
      <ScoreBoard state={sorted} />
      <Button size="lg" onClick={onReplay}>Сыграть ещё</Button>
      <Button variant="ghost" onClick={onMenu}>В меню</Button>
    </div>
  );
}
