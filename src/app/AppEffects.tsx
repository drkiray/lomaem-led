import { useEffect } from 'react';
import { setMusicVolume } from '../audio/music';
import { preloadSfx, type SfxName } from '../audio/sfx';
import { useFeedback } from '../audio/useFeedback';
import { useSettings } from '../settings/SettingsContext';

function clickSound(el: HTMLElement): SfxName {
  if (el.matches('.game-card')) return 'select';
  if (/^(Назад|Завершить|Удалить)/.test(el.getAttribute('aria-label') ?? '')) return 'back';
  return 'tap';
}

// Keeps background music in sync with settings; any tap or key press retries
// playback until it starts, because browsers block audio before a user gesture.
// Sound-effect samples are decoded up front so the very first tick isn't synth.
export function AppEffects() {
  const { musicVolume } = useSettings().settings;

  const fx = useFeedback();

  useEffect(() => preloadSfx(), []);

  // One click sound for every button, so screens don't wire it up one by one.
  // Controls with their own sound opt out via `data-sfx="none"` (or are skipped here).
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest<HTMLElement>('button, summary');
      if (!el || (el as HTMLButtonElement).disabled || el.closest('[data-sfx="none"]')) return;
      if (el.matches('[role="switch"], .segmented__item')) return; // play the toggle sound themselves
      // A real pointer press (detail > 0) tells us where on the button it landed;
      // that picks the kalimba note. Keyboard activation has no position → random note.
      const rect = el.getBoundingClientRect();
      const position = e.detail > 0 && rect.width > 0 ? (e.clientX - rect.left) / rect.width : undefined;
      fx.sfx(clickSound(el), position);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [fx]);

  useEffect(() => {
    let stopped = false;
    // Browsers only allow audio after a real gesture: `pointerdown` doesn't count
    // for touch, so listen to the events that do and keep trying until play() sticks.
    const gestures = ['pointerup', 'touchend', 'click', 'keydown'] as const;
    const detach = () => gestures.forEach((g) => window.removeEventListener(g, attempt, true));
    function attempt() {
      void setMusicVolume(musicVolume).then((playing) => {
        if (playing && !stopped) detach();
      });
    }
    attempt();
    if (musicVolume > 0) gestures.forEach((g) => window.addEventListener(g, attempt, true));
    return () => {
      stopped = true;
      detach();
    };
  }, [musicVolume]);

  return null;
}
