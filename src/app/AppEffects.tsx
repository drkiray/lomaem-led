import { useEffect } from 'react';
import { setMusicVolume } from '../audio/music';
import { preloadSfx } from '../audio/sfx';
import { useSettings } from '../settings/SettingsContext';

// Keeps background music in sync with settings; the first tap anywhere
// retries playback because Chrome blocks audio before a user gesture.
// Sound-effect samples are decoded up front so the very first tick isn't synth.
export function AppEffects() {
  const { musicVolume } = useSettings().settings;

  useEffect(() => preloadSfx(), []);

  useEffect(() => {
    setMusicVolume(musicVolume);
    const retry = () => setMusicVolume(musicVolume);
    window.addEventListener('pointerdown', retry, { once: true });
    return () => window.removeEventListener('pointerdown', retry);
  }, [musicVolume]);

  return null;
}
