import { useState } from 'react';
import { useNav } from '../../app/nav';
import { KEYS, saveJSON } from '../../lib/storage';
import { PlayerListInput } from '../../players/PlayerListInput';
import { cleanPlayers, loadLastBirthday, rememberBirthday, rememberPlayers, validatePlayers } from '../../players/players';
import { useSettings } from '../../settings/SettingsContext';
import { DEFAULT_SETTINGS } from '../../settings/settings';
import { Button } from '../../ui/Button';
import { Screen } from '../../ui/Screen';
import { Slider } from '../../ui/Slider';
import { Toggle } from '../../ui/Toggle';
import { createBirthdayPlan } from './deck';
import { createSpinnerGame } from './state';
import { buildRoundTurns } from './turns';
import './spinner.css';

const SOFT_MAX_PLAYERS = 30;

export function SpinnerSetupScreen() {
  const { back, navigate } = useNav();
  const { settings } = useSettings();
  const [players, setPlayers] = useState<string[]>(['', '']);
  const [spinDurationSec, setSpinDurationSec] = useState(settings.spinner.spinDurationSec);
  const [birthday, setBirthday] = useState(false);
  const [birthdayName, setBirthdayName] = useState('');
  const [lastBirthday] = useState(loadLastBirthday);
  const [submitted, setSubmitted] = useState(false);

  // the birthday person plays too: always the first player on the wheel
  const [birthdayClean] = cleanPlayers([birthdayName]);
  const everyone = birthday ? [birthdayName, ...players] : players;
  const error = birthday && !birthdayClean ? 'Впишите имя именинника' : validatePlayers(everyone, 2);
  const count = cleanPlayers(everyone).length;

  const start = () => {
    setSubmitted(true);
    if (error) return;
    rememberPlayers(cleanPlayers(players));
    rememberBirthday(birthday ? birthdayClean : '');
    const names = cleanPlayers(everyone);
    const game = createSpinnerGame(
      names,
      { spinDurationSec, actionRatio: DEFAULT_SETTINGS.spinner.actionRatio },
      buildRoundTurns(names.length, Math.random),
      birthday ? createBirthdayPlan(0, Math.random) : null,
    );
    saveJSON(KEYS.spinnerGame, game);
    navigate('spinner-game', { replace: true });
  };

  return (
    <Screen title="Крутилочка" onBack={back}>
      <p className="muted">Впишите всех, кто играет. Первый крутит случайный игрок, а дальше спрашивает тот, кто только что отвечал. Телефон можно не передавать — положите его в центр стола.</p>
      <PlayerListInput
        players={players}
        onChange={setPlayers}
        extra={birthday && birthdayClean ? 1 : 0}
        lastExtra={lastBirthday ? 1 : 0}
        leading={birthday && (
          <>
            <span className="players__num" aria-hidden="true">🎂</span>
            <input
              className="input input--birthday"
              value={birthdayName}
              placeholder="Имя именинника"
              aria-label="Имя именинника"
              maxLength={20}
              autoCapitalize="words"
              enterKeyHint="next"
              onChange={(e) => setBirthdayName(e.target.value)}
            />
          </>
        )}
        onRestoreLast={() => {
          setBirthday(lastBirthday !== '');
          setBirthdayName(lastBirthday);
        }}
      />
      {count > SOFT_MAX_PLAYERS && (
        <p className="muted">Больше 30 игроков — имена на круге будут совсем мелкими.</p>
      )}
      <details className="setup-options">
        <summary>Настройки партии</summary>
        <Slider label="Длительность кручения" min={2} max={8} step={1} value={spinDurationSec}
          format={(v) => `${v} сек`} onChange={setSpinDurationSec} />
        <Toggle label="Именинник" checked={birthday} onChange={setBirthday} />
      </details>
      {submitted && error && <p className="error" role="alert">{error}</p>}
      <Button size="lg" onClick={start}>Начать</Button>
    </Screen>
  );
}
