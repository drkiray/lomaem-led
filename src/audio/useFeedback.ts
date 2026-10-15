import { useMemo } from 'react';
import { vibrate } from '../lib/haptics';
import { useSettings } from '../settings/SettingsContext';
import { playSfx, type SfxName } from './sfx';

export function useFeedback() {
  const { settings } = useSettings();
  const { sfxVolume, vibration } = settings;
  return useMemo(
    () => ({
      sfx: (name: SfxName) => playSfx(name, sfxVolume),
      vibrate: (pattern: number | number[]) => vibrate(pattern, vibration),
    }),
    [sfxVolume, vibration],
  );
}
