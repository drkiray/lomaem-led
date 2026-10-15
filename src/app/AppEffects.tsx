import { useEffect } from 'react';
import { setMusicVolume } from '../audio/music';
import { useSettings } from '../settings/SettingsContext';

// Keeps background music in sync with settings; the first tap anywhere
// retries playback because Chrome blocks audio before a user gesture.
export function AppEffects() {
  const { musicVolume } = useSettings().settings;

  useEffect(() => {
    setMusicVolume(musicVolume);
    const retry = () => setMusicVolume(musicVolume);
    window.addEventListener('pointerdown', retry, { once: true });
    return () => window.removeEventListener('pointerdown', retry);
  }, [musicVolume]);

  return null;
}
