import { useEffect, useReducer, useRef, useState } from 'react';
import { useNav } from '../../app/nav';
import { useFeedback } from '../../audio/useFeedback';
import { BIRTHDAY_CARDS } from '../../content/birthdayCards';
import { SPINNER_CARDS } from '../../content/spinnerCards';
import { KEYS, loadJSON, removeKey, saveJSON } from '../../lib/storage';
import { useLandscape } from '../../lib/useLandscape';
import { useWakeLock } from '../../lib/useWakeLock';
import { useSettings } from '../../settings/SettingsContext';
import { Button } from '../../ui/Button';
import { FullscreenButton, LandscapePrompt } from '../../ui/LandscapePrompt';
import { Modal } from '../../ui/Modal';
import { Screen } from '../../ui/Screen';
import { LEVELS, LEVEL_TITLES, fillTemplate, pickCard, planBirthdayCard, type Level } from './deck';
import { computeStopRotation, normalizeDeg } from './geometry';
import { currentTurn, restoreSpinnerGame, spinnerReducer, type SpinnerState } from './state';
import { buildRoundTurns } from './turns';
import { SpinnerSummaryView } from './SpinnerSummaryView';
import { useSpin } from './useSpin';
import { Wheel } from './Wheel';
import './spinner.css';

const ALL_CARDS = [...SPINNER_CARDS, ...BIRTHDAY_CARDS];

export function SpinnerGameScreen() {
  const { navigate, back } = useNav();
  const [initial] = useState(() => restoreSpinnerGame(loadJSON<unknown>(KEYS.spinnerGame, null)));
  if (!initial) {
    return (
      <Screen title="Крутилочка" onBack={back}>
        <p className="muted center">Нет активной игры.</p>
        <Button size="lg" onClick={() => navigate('spinner-setup', { replace: true })}>Новая игра</Button>
      </Screen>
    );
  }
  return <SpinnerGame initial={initial} />;
}

function SpinnerGame({ initial }: { initial: SpinnerState }) {
  const { back, navigate } = useNav();
  const { settings } = useSettings();
  const fx = useFeedback();
  const [state, dispatch] = useReducer(spinnerReducer, initial);
  const [pendingLevel, setPendingLevel] = useState<Level | null>(null);
  const [confirmExit, setConfirmExit] = useState(false);
  const busy = useRef(false);
  const { arrowRef, spinTo, setRotation } = useSpin(state.players.length, () => fx.sfx('tick'));

  useWakeLock(settings.keepAwake);
  const landscape = useLandscape(settings.landscapeGames);

  useEffect(() => {
    saveJSON(KEYS.spinnerGame, state);
  }, [state]);

  useEffect(() => {
    setRotation(initial.rotation);
  }, [initial.rotation, setRotation]);

  const turn = currentTurn(state);
  const asker = state.players[turn.asker];
  const answerer = state.players[turn.answerer];
  const card = state.cardId ? ALL_CARDS.find((c) => c.id === state.cardId) ?? null : null;
  const birthdayName = state.birthday ? state.players[state.birthday.index] : '';
  const isBirthdayCard = card?.birthday === true;

  const spin = async () => {
    if (state.phase !== 'ready' || busy.current) return;
    busy.current = true;
    const seen = loadJSON<string[]>(KEYS.spinnerSeen, []);
    const plan = state.birthday ? planBirthdayCard(state.birthday, turn, Math.random) : null;
    const { card: next, usedIds } = pickCard(plan?.useBirthday ? BIRTHDAY_CARDS : SPINNER_CARDS, {
      level: state.level,
      usedIds: state.usedIds,
      seenIds: new Set(seen),
      actionRatio: state.config.actionRatio,
      rng: Math.random,
    });
    const extraTurns = 4 + Math.floor(Math.random() * 2);
    const target = computeStopRotation(state.rotation, turn.answerer, state.players.length, Math.random, extraTurns);
    dispatch({ type: 'spin', rotation: target, cardId: next.id, usedIds, birthday: plan?.plan });
    await spinTo(target, state.config.spinDurationSec * 1000);
    setRotation(normalizeDeg(target));
    saveJSON(KEYS.spinnerSeen, [...seen, next.id]);
    fx.sfx('card');
    fx.vibrate(60);
    dispatch({ type: 'spinDone', at: Date.now() });
    busy.current = false;
  };

  // «не хочу отвечать»: another card of the same level and kind instead
  const reroll = () => {
    if (state.phase !== 'card' || !card) return;
    const seen = loadJSON<string[]>(KEYS.spinnerSeen, []);
    const { card: next, usedIds } = pickCard(card.birthday ? BIRTHDAY_CARDS : SPINNER_CARDS, {
      level: state.level,
      usedIds: state.usedIds,
      seenIds: new Set(seen),
      actionRatio: state.config.actionRatio,
      rng: Math.random,
      kind: card.kind,
    });
    saveJSON(KEYS.spinnerSeen, [...seen, next.id]);
    dispatch({ type: 'reroll', cardId: next.id, usedIds });
  };

  const startRound = (level: Level) =>
    dispatch({
      type: 'startRound',
      level,
      // the chain goes on: whoever just answered (or is about to spin) opens the round
      turns: buildRoundTurns(state.players.length, Math.random, state.phase === 'roundEnd' ? turn.answerer : turn.asker),
    });

  const leave = () => {
    removeKey(KEYS.spinnerGame);
    back();
  };

  // With anything played, the game ends on the summary; an empty game just closes.
  const finish = () => {
    setConfirmExit(false);
    if (state.log.length === 0) leave();
    else dispatch({ type: 'finish', at: Date.now() });
  };

  if (state.phase === 'summary') {
    return (
      <SpinnerSummaryView
        state={state}
        onMenu={leave}
        onNewGame={() => {
          removeKey(KEYS.spinnerGame);
          navigate('spinner-setup', { replace: true });
        }}
      />
    );
  }

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
        <div className="game-header__actions">
          <FullscreenButton landscape={landscape} />
          <button type="button" className="icon-btn" aria-label="Завершить" onClick={() => setConfirmExit(true)}>✕</button>
        </div>
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
      <p className="muted center spinner-game__hint">{state.phase === 'ready' ? `${asker}, жми на центр круга` : ' '}</p>

      <Modal
        open={state.phase === 'card' && card !== null}
        title={isBirthdayCard ? 'Вопрос про именинника' : card?.kind === 'action' ? 'Действие' : 'Вопрос'}
        festive={isBirthdayCard}
        actions={<Button size="lg" onClick={() => dispatch({ type: 'cardDone', at: Date.now() })}>Готово</Button>}
      >
        {isBirthdayCard && <div className="spin-card__gift" aria-hidden="true">🎁</div>}
        <p className="spin-card__names"><b>{asker}</b> → <b>{answerer}</b></p>
        <p className="spin-card__text" key={card?.id}>{card ? fillTemplate(card.text, asker, answerer, birthdayName) : ''}</p>
        <button type="button" className="spin-card__reroll" onClick={reroll}>
          <span className="spin-card__reroll-icon" aria-hidden="true">↻</span>
          {card?.kind === 'action' ? 'не хочу делать' : 'не хочу отвечать'}
        </button>
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
        <p>{state.log.length > 0 ? 'Покажем итоги вечера.' : 'Партия ещё не началась — просто выйдем в меню.'}</p>
      </Modal>
      <LandscapePrompt landscape={landscape} />
    </div>
  );
}
