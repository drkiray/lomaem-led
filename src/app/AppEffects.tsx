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

// Keeps background music in sync with settings; the first tap anywhere
// retries playback because Chrome blocks audio before a user gesture.
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
      fx.sfx(clickSound(el));
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [fx]);

  useEffect(() => {
    setMusicVolume(musicVolume);
    const retry = () => setMusicVolume(musicVolume);
    window.addEventListener('pointerdown', retry, { once: true });
    return () => window.removeEventListener('pointerdown', retry);
  }, [musicVolume]);

  return null;
}
