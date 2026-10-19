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
  const [showCredits, setShowCredits] = useState(false);

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
        <Toggle label="Крутилочка горизонтально во весь экран" checked={settings.landscapeGames}
          onChange={(v) => update({ landscapeGames: v })} />
      </Section>

      <Section title="Крутилочка">
        <Slider label="Длительность кручения" min={2} max={8} step={1} value={settings.spinner.spinDurationSec}
          format={sec} onChange={(v) => update({ spinner: { spinDurationSec: v } })} />
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
      <Button variant="ghost" onClick={() => setShowCredits(true)}>Авторы звукового сопровождения</Button>

      <Modal
        open={showCredits}
        title="Авторы звукового сопровождения"
        actions={<Button onClick={() => setShowCredits(false)}>Закрыть</Button>}
      >
        <p>
          Звуковые эффекты — «Interface Sounds» от Kenney (<a href="https://kenney.nl" target="_blank" rel="noreferrer">kenney.nl</a>),
          лицензия CC0 1.0 Universal (общественное достояние):{' '}
          <a href="https://creativecommons.org/publicdomain/zero/1.0/" target="_blank" rel="noreferrer">creativecommons.org/publicdomain/zero/1.0</a>.
        </p>
        <p>
          Фоновая музыка — «Exotic Beauty», автор FreeGroove, с{' '}
          <a href="https://pixabay.com" target="_blank" rel="noreferrer">Pixabay</a>; используется по{' '}
          <a href="https://pixabay.com/service/license-summary/" target="_blank" rel="noreferrer">лицензии Pixabay</a>.
        </p>
        <p>
          Часть звуков — с <a href="https://freesound.org" target="_blank" rel="noreferrer">Freesound</a>:
          «kalimba-c-note» (foochie_foochie), «paper» (1bob), «woodblock-soft» (hollandm) — CC0;
          «fluffing-and-patting-pillow» (lorraine004) —{' '}
          <a href="https://creativecommons.org/licenses/by-nc/4.0/" target="_blank" rel="noreferrer">CC BY-NC 4.0</a>.
        </p>
        <p>Звуки и музыка сжаты в mp3, звуки обрезаны и выровнены по громкости, музыка смонтирована для бесшовного зацикливания.</p>
      </Modal>

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
