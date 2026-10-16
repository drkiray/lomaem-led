import { useState } from 'react';
import { useNav } from '../../app/nav';
import { KEYS, saveJSON } from '../../lib/storage';
import { PlayerListInput } from '../../players/PlayerListInput';
import { cleanPlayers, rememberPlayers, validatePlayers } from '../../players/players';
import { useSettings } from '../../settings/SettingsContext';
import { DEFAULT_SETTINGS } from '../../settings/settings';
import { Button } from '../../ui/Button';
import { Screen } from '../../ui/Screen';
import { Slider } from '../../ui/Slider';
import { createSpinnerGame } from './state';
import { buildRoundTurns } from './turns';
import './spinner.css';

const SOFT_MAX_PLAYERS = 30;

export function SpinnerSetupScreen() {
  const { back, navigate } = useNav();
  const { settings } = useSettings();
  const [players, setPlayers] = useState<string[]>(['', '']);
  const [spinDurationSec, setSpinDurationSec] = useState(settings.spinner.spinDurationSec);
  const [submitted, setSubmitted] = useState(false);

  const error = validatePlayers(players, 2);
  const count = cleanPlayers(players).length;

  const start = () => {
    setSubmitted(true);
    if (error) return;
    const names = cleanPlayers(players);
    rememberPlayers(names);
    const game = createSpinnerGame(names, { spinDurationSec, actionRatio: DEFAULT_SETTINGS.spinner.actionRatio }, buildRoundTurns(names.length, Math.random));
    saveJSON(KEYS.spinnerGame, game);
    navigate('spinner-game', { replace: true });
  };

  return (
    <Screen title="Крутилочка" onBack={back}>
      <p className="muted">Впишите всех, кто играет. Стрелка решает, кому отвечать, а крутят все по очереди.</p>
      <PlayerListInput players={players} onChange={setPlayers} />
      {count > SOFT_MAX_PLAYERS && (
        <p className="muted">Больше 30 игроков — имена на круге будут совсем мелкими.</p>
      )}
      <details className="setup-options">
        <summary>Настройки партии</summary>
        <Slider label="Длительность кручения" min={2} max={8} step={1} value={spinDurationSec}
          format={(v) => `${v} сек`} onChange={setSpinDurationSec} />
      </details>
      {submitted && error && <p className="error" role="alert">{error}</p>}
      <Button size="lg" onClick={start}>Начать</Button>
    </Screen>
  );
}
