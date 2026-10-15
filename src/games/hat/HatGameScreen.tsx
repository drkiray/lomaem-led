import { useEffect, useReducer, useRef, useState } from 'react';
import { useNav } from '../../app/nav';
import { useFeedback } from '../../audio/useFeedback';
import { HAT_WORDS } from '../../content/hatWords';
import { shuffle } from '../../lib/random';
import { KEYS, loadJSON, removeKey, saveJSON } from '../../lib/storage';
import { useLandscape } from '../../lib/useLandscape';
import { useWakeLock } from '../../lib/useWakeLock';
import { useSettings } from '../../settings/SettingsContext';
import { Button } from '../../ui/Button';
import { FullscreenButton, LandscapePrompt } from '../../ui/LandscapePrompt';
import { Modal } from '../../ui/Modal';
import { Screen } from '../../ui/Screen';
import {
  CountdownView, GameEndView, LastWordView, PlayingView, ReadyView, ReviewView, RoundEndView, RoundIntroView,
} from './HatViews';
import { ROUNDS } from './rounds';
import { hatReducer, restoreHatGame, type HatState } from './state';
import type { HatReplay } from './HatSetupScreen';
import { buildWordSet } from './words';
import './hat.css';

export function HatGameScreen() {
  const { navigate, back } = useNav();
  const [initial] = useState(() => restoreHatGame(loadJSON<unknown>(KEYS.hatGame, null)));
  if (!initial) {
    return (
      <Screen title="Шляпа" onBack={back}>
        <p className="muted center">Нет активной игры.</p>
        <Button size="lg" onClick={() => navigate('hat-setup', { replace: true })}>Новая игра</Button>
      </Screen>
    );
  }
  return <HatGame initial={initial} />;
}

function HatGame({ initial }: { initial: HatState }) {
  const { back, navigate } = useNav();
  const { settings } = useSettings();
  const fx = useFeedback();
  const [state, dispatch] = useReducer(hatReducer, initial);
  const [confirmExit, setConfirmExit] = useState(false);

  useWakeLock(settings.keepAwake);
  const landscape = useLandscape(settings.landscapeGames);

  useEffect(() => {
    saveJSON(KEYS.hatGame, state);
  }, [state]);

  const ticking = state.phase === 'playing' || state.phase === 'lastWord';
  useEffect(() => {
    if (!ticking) return;
    let last = Date.now();
    const id = window.setInterval(() => {
      const now = Date.now();
      dispatch({ type: 'tick', ms: now - last });
      last = now;
    }, 100);
    return () => window.clearInterval(id);
  }, [ticking]);

  const prevPhase = useRef(state.phase);
  useEffect(() => {
    const prev = prevPhase.current;
    prevPhase.current = state.phase;
    const timeRanOut = prev === 'playing' && state.remainingMs <= 0 && (state.phase === 'lastWord' || state.phase === 'review');
    if (timeRanOut) {
      fx.sfx('timeUp');
      fx.vibrate([200, 100, 200]);
    }
  }, [state.phase, state.remainingMs, fx]);

  const guess = () => {
    fx.sfx('correct');
    fx.vibrate(30);
    dispatch({ type: 'guess' });
  };
  const skip = () => {
    fx.sfx('skip');
    dispatch({ type: 'skip' });
  };
  const replay = () => {
    if (state.wordSetup.mode !== 'dictionary') {
      // own words were just played three times over — collect fresh ones
      const replaySetup: HatReplay = { teams: state.teams, mode: state.wordSetup.mode };
      saveJSON(KEYS.hatReplay, replaySetup);
      removeKey(KEYS.hatGame);
      navigate('hat-setup', { replace: true });
      return;
    }
    const words = buildWordSet(state.wordSetup, HAT_WORDS, Math.random, state.words);
    dispatch({ type: 'restart', words, order: shuffle(words, Math.random) });
  };
  const finish = () => {
    removeKey(KEYS.hatGame);
    back();
  };

  return (
    <div className="hat-game">
      <header className="hat-game__header">
        <button type="button" className="icon-btn" aria-label="Назад" onClick={back}>←</button>
        <span className="hat-game__round">Раунд {state.round} · {ROUNDS[state.round].title}</span>
        <div className="game-header__actions">
          <FullscreenButton landscape={landscape} />
          <button type="button" className="icon-btn" aria-label="Завершить" onClick={() => setConfirmExit(true)}>✕</button>
        </div>
      </header>

      {state.phase === 'roundIntro' && <RoundIntroView round={state.round} onStart={() => dispatch({ type: 'beginRound' })} />}
      {state.phase === 'ready' && <ReadyView state={state} onStart={() => dispatch({ type: 'startCountdown' })} />}
      {state.phase === 'countdown' && <CountdownView onDone={() => dispatch({ type: 'startPlaying' })} />}
      {state.phase === 'playing' && <PlayingView state={state} onGuess={guess} onSkip={skip} />}
      {state.phase === 'lastWord' && (
        <LastWordView state={state} onGuess={guess} onMiss={() => dispatch({ type: 'miss' })} />
      )}
      {state.phase === 'review' && (
        <ReviewView
          entries={state.turn}
          skipPenalty={state.config.skipPenalty}
          onToggle={(index) => dispatch({ type: 'toggle', index })}
          onConfirm={() => dispatch({ type: 'confirmTurn' })}
        />
      )}
      {state.phase === 'roundEnd' && (
        <RoundEndView state={state} onNext={() => dispatch({ type: 'nextRound', order: shuffle(state.words, Math.random) })} />
      )}
      {state.phase === 'gameEnd' && <GameEndView state={state} onReplay={replay} onMenu={finish} />}

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
        <p>Счёт этой партии будет удалён.</p>
      </Modal>
      <LandscapePrompt landscape={landscape} />
    </div>
  );
}
