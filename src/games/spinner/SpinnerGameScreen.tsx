import { useEffect, useReducer, useRef, useState } from 'react';
import { useNav } from '../../app/nav';
import { useFeedback } from '../../audio/useFeedback';
import { BIRTHDAY_CARDS } from '../../content/birthdayCards';
import { pickSpinPhrase } from '../../content/spinPhrases';
import { SPINNER_CARDS } from '../../content/spinnerCards';
import { KEYS, loadJSON, removeKey, saveJSON } from '../../lib/storage';
import { useLandscape } from '../../lib/useLandscape';
import { useWakeLock } from '../../lib/useWakeLock';
import { useSettings } from '../../settings/SettingsContext';
import { Button } from '../../ui/Button';
import { FullscreenButton, LandscapePrompt } from '../../ui/LandscapePrompt';
import { Modal } from '../../ui/Modal';
import { Screen } from '../../ui/Screen';
import { LEVEL_TITLES, afterAddress, fillTemplate, pickCard, planBirthdayCard, type Level } from './deck';
import { computeStopRotation, normalizeDeg } from './geometry';
import { currentTurn, restoreSpinnerGame, spinnerReducer, type SpinnerState } from './state';
import { buildRoundTurns } from './turns';
import { SpinnerSummaryView } from './SpinnerSummaryView';
import { useFitCard } from './useFitCard';
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
  const [menuOpen, setMenuOpen] = useState(false);
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

  // a fresh call to action for every turn
  const [phrase, setPhrase] = useState(() => pickSpinPhrase(null));
  const turnKey = `${state.level}:${state.turnIndex}:${state.turns.map((t) => t.asker).join()}`;
  const lastTurnKey = useRef(turnKey);
  useEffect(() => {
    if (lastTurnKey.current === turnKey) return;
    lastTurnKey.current = turnKey;
    setPhrase((prev) => pickSpinPhrase(prev));
  }, [turnKey]);

  const turn = currentTurn(state);
  const asker = state.players[turn.asker];
  const answerer = state.players[turn.answerer];
  const card = state.cardId ? ALL_CARDS.find((c) => c.id === state.cardId) ?? null : null;
  const birthdayName = state.birthday ? state.players[state.birthday.index] : '';
  const isBirthdayCard = card?.birthday === true;
  const cardTextRef = useFitCard<HTMLParagraphElement>(state.phase === 'card' ? state.cardId : null);

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

  // «поменять карточку»: another card of the same level and kind instead
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
        <div className="spinner-game__side">
          <FullscreenButton landscape={landscape} />
        </div>
        <h1 className="spinner-game__round">
          Раунд {state.level} <span>«{LEVEL_TITLES[state.level]}»</span>
        </h1>
        <div className="spinner-game__side spinner-game__side--end">
          <button type="button" className="icon-btn" aria-label="Меню игры" onClick={() => setMenuOpen(true)}>
            <svg className="icon-btn__svg" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
            </svg>
          </button>
        </div>
      </header>

      <p className="spinner-game__turn">
        <b>{asker}</b>, {phrase}
      </p>

      <Wheel
        players={state.players}
        activeIndex={turn.asker}
        arrowRef={arrowRef}
        disabled={state.phase !== 'ready'}
        onSpin={spin}
      />

      <Modal
        open={state.phase === 'card' && card !== null}
        title={isBirthdayCard ? 'Вопрос про именинника' : card?.kind === 'action' ? 'Действие' : 'Вопрос'}
        festive={isBirthdayCard}
        className="modal--card"
        hideTitle={!isBirthdayCard}
        actions={<Button size="lg" onClick={() => dispatch({ type: 'cardDone', at: Date.now() })}>Готово</Button>}
        below={
          <button type="button" className="spin-card__reroll" onClick={reroll}>
            <span className="spin-card__reroll-icon" aria-hidden="true">↻</span>
            поменять карточку
          </button>
        }
      >
        {isBirthdayCard && <div className="spin-card__gift" aria-hidden="true">🎁</div>}
        <p className="spin-card__text" key={card?.id} ref={cardTextRef}>
          <span className="spin-card__name">{answerer}</span>, {card ? afterAddress(fillTemplate(card.text, asker, answerer, birthdayName)) : ''}
        </p>
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
              <Button variant="ghost" onClick={finish}>Завершить партию</Button>
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
        open={menuOpen}
        title="Пауза"
        actions={<Button onClick={() => setMenuOpen(false)}>Продолжить</Button>}
      >
        <div className="stack">
          <Button variant="ghost" onClick={back}>Вернуться в меню</Button>
          <Button variant="danger" onClick={() => { setMenuOpen(false); setConfirmExit(true); }}>Завершить партию</Button>
        </div>
      </Modal>

      <Modal
        open={confirmExit}
        title="Завершить партию?"
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirmExit(false)}>Отмена</Button>
            <Button variant="danger" onClick={finish}>Завершить партию</Button>
          </>
        }
      >
        <p>{state.log.length > 0 ? 'Покажем итоги вечера.' : 'Партия ещё не началась — просто выйдем в меню.'}</p>
      </Modal>
      <LandscapePrompt landscape={landscape} />
    </div>
  );
}
