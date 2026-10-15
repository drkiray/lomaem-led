import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { KEYS, loadJSON, saveJSON } from '../lib/storage';
import { DEFAULT_SETTINGS, applyPatch, mergeSettings, type Settings, type SettingsPatch } from './settings';

interface SettingsApi {
  settings: Settings;
  update: (patch: SettingsPatch) => void;
  reset: () => void;
}

const SettingsContext = createContext<SettingsApi | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => mergeSettings(loadJSON<unknown>(KEYS.settings, null)));

  useEffect(() => {
    saveJSON(KEYS.settings, settings);
  }, [settings]);

  const update = useCallback((patch: SettingsPatch) => setSettings((s) => applyPatch(s, patch)), []);
  const reset = useCallback(() => setSettings(DEFAULT_SETTINGS), []);
  const value = useMemo(() => ({ settings, update, reset }), [settings, update, reset]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsApi {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('useSettings must be used inside SettingsProvider');
  return value;
}
