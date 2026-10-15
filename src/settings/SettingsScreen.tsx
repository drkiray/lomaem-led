import { useState, type ReactNode } from 'react';
import { useNav } from '../app/nav';
import { KEYS, removeKey } from '../lib/storage';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Screen } from '../ui/Screen';
import { Segmented } from '../ui/Segmented';
import { Slider } from '../ui/Slider';
import { Toggle } from '../ui/Toggle';
import type { DifficultySetting, TurnSeconds, WordCount } from './settings';
import { useSettings } from './SettingsContext';

const pct = (v: number) => `${Math.round(v * 100)}%`;
const sec = (v: number) => `${v} сек`;

const TURN_OPTIONS: { value: TurnSeconds; label: string }[] = [30, 45, 60, 90].map((v) => ({
  value: v as TurnSeconds,
  label: `${v}с`,
}));
const WORD_COUNT_OPTIONS: { value: WordCount; label: string }[] = [30, 40, 60].map((v) => ({
  value: v as WordCount,
  label: String(v),
}));
const DIFFICULTY_OPTIONS: { value: DifficultySetting; label: string }[] = [
  { value: 'easy', label: 'Лёгкие' },
  { value: 'medium', label: 'Средние' },
  { value: 'hard', label: 'Сложные' },
  { value: 'mix', label: 'Микс' },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="settings-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function SettingsScreen() {
  const { back } = useNav();
  const { settings, update, reset } = useSettings();
  const [confirmReset, setConfirmReset] = useState(false);
  const [historyCleared, setHistoryCleared] = useState(false);

  return (
    <Screen title="Настройки" onBack={back}>
      <Section title="Звук и вибрация">
        <Slider label="Звуковые эффекты" min={0} max={1} step={0.05} value={settings.sfxVolume} format={pct}
          onChange={(v) => update({ sfxVolume: v })} />
        <Slider label="Музыка" min={0} max={1} step={0.05} value={settings.musicVolume} format={pct}
          onChange={(v) => update({ musicVolume: v })} />
        <Toggle label="Вибрация" checked={settings.vibration} onChange={(v) => update({ vibration: v })} />
      </Section>

      <Section title="Экран">
        <Toggle label="Не гасить экран во время игры" checked={settings.keepAwake}
          onChange={(v) => update({ keepAwake: v })} />
      </Section>

      <Section title="Крутилочка">
        <Slider label="Длительность кручения" min={2} max={8} step={1} value={settings.spinner.spinDurationSec}
          format={sec} onChange={(v) => update({ spinner: { spinDurationSec: v } })} />
        <Slider label="Доля действий" min={0} max={0.6} step={0.1} value={settings.spinner.actionRatio}
          format={pct} onChange={(v) => update({ spinner: { actionRatio: v } })} />
        <Button variant="ghost" onClick={() => { removeKey(KEYS.spinnerSeen); setHistoryCleared(true); }}>
          {historyCleared ? 'История очищена ✓' : 'Сбросить историю вопросов'}
        </Button>
      </Section>

      <Section title="Шляпа">
        <Segmented label="Время хода" options={TURN_OPTIONS} value={settings.hat.turnSeconds}
          onChange={(v) => update({ hat: { turnSeconds: v } })} />
        <Toggle label="Штраф за пропуск (−1)" checked={settings.hat.skipPenalty}
          onChange={(v) => update({ hat: { skipPenalty: v } })} />
        <Slider label="Время на последнее слово" min={0} max={10} step={1} value={settings.hat.lastWordSeconds}
          format={(v) => (v === 0 ? 'выкл' : sec(v))} onChange={(v) => update({ hat: { lastWordSeconds: v } })} />
        <Segmented label="Сложность слов" options={DIFFICULTY_OPTIONS} value={settings.hat.difficulty}
          onChange={(v) => update({ hat: { difficulty: v } })} />
        <Segmented label="Слов в игре" options={WORD_COUNT_OPTIONS} value={settings.hat.wordCount}
          onChange={(v) => update({ hat: { wordCount: v } })} />
        <Slider label="Своих слов на игрока" min={3} max={10} step={1} value={settings.hat.wordsPerPlayer}
          onChange={(v) => update({ hat: { wordsPerPlayer: v } })} />
      </Section>

      <Button variant="danger" onClick={() => setConfirmReset(true)}>Сбросить все настройки</Button>

      <Modal
        open={confirmReset}
        title="Сбросить все настройки?"
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>Отмена</Button>
            <Button variant="danger" onClick={() => { reset(); setConfirmReset(false); }}>Сбросить</Button>
          </>
        }
      >
        <p>Громкость, вибрация и параметры игр вернутся к значениям по умолчанию.</p>
      </Modal>
    </Screen>
  );
}
