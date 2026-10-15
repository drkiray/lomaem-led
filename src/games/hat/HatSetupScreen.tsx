import { useEffect, useRef, useState } from 'react';
import { useNav } from '../../app/nav';
import { HAT_WORDS } from '../../content/hatWords';
import { shuffle } from '../../lib/random';
import { KEYS, loadJSON, removeKey, saveJSON } from '../../lib/storage';
import { PlayerListInput } from '../../players/PlayerListInput';
import { cleanPlayers, rememberPlayers, validatePlayers } from '../../players/players';
import type { DifficultySetting, TurnSeconds, WordCount } from '../../settings/settings';
import { useSettings } from '../../settings/SettingsContext';
import { Button } from '../../ui/Button';
import { Screen } from '../../ui/Screen';
import { Segmented } from '../../ui/Segmented';
import { Slider } from '../../ui/Slider';
import { Toggle } from '../../ui/Toggle';
import { OwnWordsEntry } from './OwnWordsEntry';
import { createHatGame } from './state';
import { MIN_HAT_PLAYERS, splitIntoTeams, validateTeams, type Team } from './teams';
import { TeamsEditor } from './TeamsEditor';
import { buildWordSet, type WordMode, type WordSetup } from './words';
import './hat.css';

type Step = 'players' | 'teams' | 'words' | 'own';
const MIN_WORDS = 5;

const MODE_OPTIONS: { value: WordMode; label: string }[] = [
  { value: 'dictionary', label: 'Словарь' },
  { value: 'own', label: 'Свои' },
  { value: 'mix', label: 'Микс' },
];
const DIFFICULTY_OPTIONS: { value: DifficultySetting; label: string }[] = [
  { value: 'easy', label: 'Лёгкие' },
  { value: 'medium', label: 'Средние' },
  { value: 'hard', label: 'Сложные' },
  { value: 'mix', label: 'Микс' },
];
const COUNT_OPTIONS: { value: WordCount; label: string }[] = [30, 40, 60].map((v) => ({ value: v as WordCount, label: String(v) }));
const TURN_OPTIONS: { value: TurnSeconds; label: string }[] = [30, 45, 60, 90].map((v) => ({ value: v as TurnSeconds, label: `${v}с` }));
const PREVIOUS: Record<Step, Step | null> = { players: null, teams: 'players', words: 'teams', own: 'words' };

// Written by «Сыграть ещё» after an own/mix game: same teams, fresh words.
export interface HatReplay {
  teams: Team[];
  mode: WordMode;
}

function takeReplay(): HatReplay | null {
  const replay = loadJSON<HatReplay | null>(KEYS.hatReplay, null);
  removeKey(KEYS.hatReplay);
  return replay && Array.isArray(replay.teams) ? replay : null;
}

export function HatSetupScreen() {
  const { back, navigate } = useNav();
  const { hat } = useSettings().settings;
  const [replay] = useState(takeReplay);
  const [step, setStep] = useState<Step>(replay ? 'words' : 'players');
  const [players, setPlayers] = useState<string[]>(() => replay?.teams.flatMap((t) => t.players) ?? ['', '', '', '']);
  const [teams, setTeams] = useState<Team[]>(replay?.teams ?? []);
  const [mode, setMode] = useState<WordMode>(replay?.mode ?? 'dictionary');
  const [difficulty, setDifficulty] = useState<DifficultySetting>(hat.difficulty);
  const [wordCount, setWordCount] = useState<WordCount>(hat.wordCount);
  const [wordsPerPlayer, setWordsPerPlayer] = useState(hat.wordsPerPlayer);
  const [turnSeconds, setTurnSeconds] = useState<TurnSeconds>(hat.turnSeconds);
  const [skipPenalty, setSkipPenalty] = useState(hat.skipPenalty);
  const [lastWordSeconds, setLastWordSeconds] = useState(hat.lastWordSeconds);
  const [error, setError] = useState<string | null>(null);

  // Past the first step one extra history entry sits on top of hat-setup, so
  // the Android back gesture steps back inside the wizard instead of leaving
  // it and losing the teams or the secretly entered words.
  const guarded = useRef(false);
  const onGuardPopped = useRef<(() => void) | null>(null);
  const stepRef = useRef(step);
  stepRef.current = step;

  useEffect(() => {
    if (step === 'players' || guarded.current) return;
    window.history.pushState({ route: 'hat-setup', guard: true }, '');
    guarded.current = true;
  }, [step]);

  useEffect(() => {
    const onPop = () => {
      if (!guarded.current) return;
      guarded.current = false;
      const pending = onGuardPopped.current;
      onGuardPopped.current = null;
      if (pending) return pending();
      setError(null);
      setStep(PREVIOUS[stepRef.current] ?? 'players');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const goTo = (next: Step) => {
    setError(null);
    setStep(next);
  };
  const goBack = () => {
    if (guarded.current) window.history.back();
    else back();
  };

  const toTeams = () => {
    const err = validatePlayers(players, MIN_HAT_PLAYERS);
    if (err) return setError(err);
    const names = cleanPlayers(players);
    rememberPlayers(names);
    setTeams(splitIntoTeams(names, 2, Math.random));
    goTo('teams');
  };

  const toWords = () => {
    const err = validateTeams(teams);
    if (err) return setError(err);
    goTo('words');
  };

  const start = (ownWords: string[]) => {
    const wordSetup: WordSetup = { mode, difficulty, count: wordCount, ownWords };
    const words = buildWordSet(wordSetup, HAT_WORDS, Math.random);
    if (words.length < MIN_WORDS) {
      setStep('words');
      setError(`Слишком мало слов: нужно хотя бы ${MIN_WORDS}`);
      return;
    }
    const game = createHatGame({
      teams: teams.map((t) => ({ ...t, name: t.name.trim() })),
      words,
      order: shuffle(words, Math.random),
      config: { turnSeconds, skipPenalty, lastWordSeconds },
      wordSetup,
    });
    saveJSON(KEYS.hatGame, game);
    const launch = () => navigate('hat-game', { replace: true });
    if (!guarded.current) return launch();
    // drop the guard first so back from the game lands on the menu
    onGuardPopped.current = launch;
    window.history.back();
  };

  return (
    <Screen title="Шляпа" onBack={goBack}>
      {step === 'players' && (
        <>
          <p className="muted">Впишите всех игроков — минимум четверо. На следующем шаге разобьём на команды.</p>
          <PlayerListInput players={players} onChange={setPlayers} />
          {error && <p className="error" role="alert">{error}</p>}
          <Button size="lg" onClick={toTeams}>Дальше</Button>
        </>
      )}

      {step === 'teams' && (
        <>
          <TeamsEditor teams={teams} onChange={setTeams} />
          {error && <p className="error" role="alert">{error}</p>}
          <Button size="lg" onClick={toWords}>Дальше</Button>
        </>
      )}

      {step === 'words' && (
        <>
          <Segmented label="Откуда слова" options={MODE_OPTIONS} value={mode} onChange={setMode} />
          {mode !== 'own' && (
            <>
              <Segmented label="Сложность" options={DIFFICULTY_OPTIONS} value={difficulty} onChange={setDifficulty} />
              <Segmented label="Слов в игре" options={COUNT_OPTIONS} value={wordCount} onChange={setWordCount} />
            </>
          )}
          {mode !== 'dictionary' && (
            <Slider label="Слов от каждого игрока" min={3} max={10} step={1} value={wordsPerPlayer}
              onChange={setWordsPerPlayer} />
          )}
          <details className="setup-options">
            <summary>Настройки партии</summary>
            <Segmented label="Время хода" options={TURN_OPTIONS} value={turnSeconds} onChange={setTurnSeconds} />
            <Toggle label="Штраф за пропуск (−1)" checked={skipPenalty} onChange={setSkipPenalty} />
            <Slider label="Время на последнее слово" min={0} max={10} step={1} value={lastWordSeconds}
              format={(v) => (v === 0 ? 'выкл' : `${v} сек`)} onChange={setLastWordSeconds} />
          </details>
          {error && <p className="error" role="alert">{error}</p>}
          {mode === 'dictionary' ? (
            <Button size="lg" onClick={() => start([])}>Начать игру</Button>
          ) : (
            <Button size="lg" onClick={() => goTo('own')}>Вписать слова</Button>
          )}
        </>
      )}

      {step === 'own' && (
        <OwnWordsEntry players={teams.flatMap((t) => t.players)} perPlayer={wordsPerPlayer} onDone={start} />
      )}
    </Screen>
  );
}
