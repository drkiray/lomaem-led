import { useEffect, useReducer, useRef, useState } from 'react';
import { useNav } from '../../app/nav';
import { useFeedback } from '../../audio/useFeedback';
import { SPINNER_CARDS } from '../../content/spinnerCards';
import { KEYS, loadJSON, removeKey, saveJSON } from '../../lib/storage';
import { useWakeLock } from '../../lib/useWakeLock';
import { useSettings } from '../../settings/SettingsContext';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { Screen } from '../../ui/Screen';
import { LEVELS, fillTemplate, pickCard, type Level } from './deck';
import { computeStopRotation, normalizeDeg } from './geometry';
import { currentTurn, restoreSpinnerGame, spinnerReducer, type SpinnerState } from './state';
import { buildRoundTurns } from './turns';
import { useSpin } from './useSpin';
import { Wheel } from './Wheel';
import './spinner.css';

const LEVEL_TITLES: Record<Level, string> = { 1: 'Знакомство', 2: 'Глубже', 3: 'Психология' };

export function SpinnerGameScreen() {
  const { navigate } = useNav();
  const [initial] = useState(() => restoreSpinnerGame(loadJSON<unknown>(KEYS.spinnerGame, null)));
  if (!initial) {
    return (
      <Screen title="Крутилочка" onBack={() => navigate('menu')}>
        <p className="muted center">Нет активной игры.</p>
        <Button size="lg" onClick={() => navigate('spinner-setup', { replace: true })}>Новая игра</Button>
      </Screen>
    );
  }
  return <SpinnerGame initial={initial} />;
}

function SpinnerGame({ initial }: { initial: SpinnerState }) {
  const { navigate, back } = useNav();
  const { settings } = useSettings();
  const fx = useFeedback();
  const [state, dispatch] = useReducer(spinnerReducer, initial);
  const [pendingLevel, setPendingLevel] = useState<Level | null>(null);
  const [confirmExit, setConfirmExit] = useState(false);
  const busy = useRef(false);
  const { arrowRef, spinTo, setRotation } = useSpin(state.players.length, () => fx.sfx('tick'));

  useWakeLock(settings.keepAwake);

  useEffect(() => {
    saveJSON(KEYS.spinnerGame, state);
  }, [state]);

  useEffect(() => {
    setRotation(initial.rotation);
  }, [initial.rotation, setRotation]);

  const turn = currentTurn(state);
  const asker = state.players[turn.asker];
  const answerer = state.players[turn.answerer];
  const card = state.cardId ? SPINNER_CARDS.find((c) => c.id === state.cardId) ?? null : null;

  const spin = async () => {
    if (state.phase !== 'ready' || busy.current) return;
    busy.current = true;
    const seen = loadJSON<string[]>(KEYS.spinnerSeen, []);
    const { card: next, usedIds } = pickCard(SPINNER_CARDS, {
      level: state.level,
      usedIds: state.usedIds,
      seenIds: new Set(seen),
      actionRatio: state.config.actionRatio,
      rng: Math.random,
    });
    const extraTurns = 4 + Math.floor(Math.random() * 2);
    const target = computeStopRotation(state.rotation, turn.answerer, state.players.length, Math.random, extraTurns);
    dispatch({ type: 'spin', rotation: target, cardId: next.id, usedIds });
    fx.sfx('tap');
    await spinTo(target, state.config.spinDurationSec * 1000);
    setRotation(normalizeDeg(target));
    saveJSON(KEYS.spinnerSeen, [...seen, next.id]);
    fx.sfx('stop');
    fx.sfx('card');
    fx.vibrate(60);
    dispatch({ type: 'spinDone' });
    busy.current = false;
  };

  const startRound = (level: Level) =>
    dispatch({ type: 'startRound', level, turns: buildRoundTurns(state.players.length, Math.random) });

  const finish = () => {
    removeKey(KEYS.spinnerGame);
    navigate('menu');
  };

  return (
    <div className="spinner-game">
      <header className="spinner-game__header">
        <button type="button" className="icon-btn" aria-label="Назад" onClick={back}>←</button>
        <div className="level-pills" role="group" aria-label="Раунд">
          {LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              className={`level-pill ${level === state.level ? 'is-active' : ''}`}
              aria-pressed={level === state.level}
              disabled={state.phase !== 'ready'}
              onClick={() => level !== state.level && setPendingLevel(level)}
            >
              {level}
            </button>
          ))}
        </div>
        <button type="button" className="icon-btn" aria-label="Завершить" onClick={() => setConfirmExit(true)}>✕</button>
      </header>

      <p className="spinner-game__level">
        Раунд {state.level}: {LEVEL_TITLES[state.level]} · ход {state.turnIndex + 1} из {state.turns.length}
      </p>
      <p className="spinner-game__turn">
        Крутит: <b>{asker}</b>
      </p>

      <Wheel
        players={state.players}
        activeIndex={turn.asker}
        arrowRef={arrowRef}
        disabled={state.phase !== 'ready'}
        onSpin={spin}
      />
      <p className="muted center">{state.phase === 'ready' ? `${asker}, жми на центр круга` : ' '}</p>

      <Modal
        open={state.phase === 'card' && card !== null}
        title={card?.kind === 'action' ? 'Действие' : 'Вопрос'}
        actions={<Button size="lg" onClick={() => dispatch({ type: 'cardDone' })}>Готово</Button>}
      >
        <p className="spin-card__names"><b>{asker}</b> → <b>{answerer}</b></p>
        <p className="spin-card__text">{card ? fillTemplate(card.text, asker, answerer) : ''}</p>
      </Modal>

      <Modal
        open={state.phase === 'roundEnd'}
        title={`Раунд ${state.level} завершён`}
        actions={
          state.level < 3 ? (
            <>
              <Button variant="ghost" onClick={() => startRound(state.level)}>Ещё круг</Button>
              <Button onClick={() => startRound((state.level + 1) as Level)}>Раунд {state.level + 1}</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={finish}>Завершить игру</Button>
              <Button onClick={() => startRound(3)}>Ещё круг</Button>
            </>
          )
        }
      >
        <p>
          Все покрутили и все ответили.{' '}
          {state.level < 3 ? `Дальше — «${LEVEL_TITLES[(state.level + 1) as Level]}».` : 'Это был самый глубокий уровень.'}
        </p>
      </Modal>

      <Modal
        open={pendingLevel !== null}
        title={`Перейти к раунду ${pendingLevel}?`}
        actions={
          <>
            <Button variant="ghost" onClick={() => setPendingLevel(null)}>Отмена</Button>
            <Button onClick={() => { if (pendingLevel) startRound(pendingLevel); setPendingLevel(null); }}>Перейти</Button>
          </>
        }
      >
        <p>Круг начнётся заново: каждый снова покрутит и ответит.</p>
      </Modal>

      <Modal
        open={confirmExit}
        title="Завершить игру?"
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirmExit(false)}>Отмена</Button>
            <Button variant="danger" onClick={finish}>Завершить игру</Button>
          </>
        }
      >
        <p>Прогресс этой партии будет удалён.</p>
      </Modal>
    </div>
  );
}
