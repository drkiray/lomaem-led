import { DEFAULT_SETTINGS, applyPatch, mergeSettings } from './settings';

test('defaults match spec', () => {
  expect(DEFAULT_SETTINGS.sfxVolume).toBe(0.8);
  expect(DEFAULT_SETTINGS.musicVolume).toBe(0.3);
  expect(DEFAULT_SETTINGS.vibration).toBe(true);
  expect(DEFAULT_SETTINGS.keepAwake).toBe(true);
  expect(DEFAULT_SETTINGS.spinner.actionRatio).toBe(0.3);
  expect(DEFAULT_SETTINGS.hat).toMatchObject({ turnSeconds: 60, skipPenalty: false, lastWordSeconds: 5 });
});

test('applyPatch merges nested groups without dropping siblings', () => {
  const next = applyPatch(DEFAULT_SETTINGS, { hat: { turnSeconds: 30 } });
  expect(next.hat.turnSeconds).toBe(30);
  expect(next.hat.lastWordSeconds).toBe(5);
  expect(next.spinner).toEqual(DEFAULT_SETTINGS.spinner);
});

test('mergeSettings fills missing fields from defaults', () => {
  const merged = mergeSettings({ vibration: false, spinner: { spinDurationSec: 6 } });
  expect(merged.vibration).toBe(false);
  expect(merged.spinner.spinDurationSec).toBe(6);
  expect(merged.spinner.actionRatio).toBe(0.3);
  expect(merged.sfxVolume).toBe(0.8);
});

test('mergeSettings returns defaults for garbage', () => {
  expect(mergeSettings(null)).toEqual(DEFAULT_SETTINGS);
  expect(mergeSettings('abc')).toEqual(DEFAULT_SETTINGS);
});

test('settings saved before v2 get music turned on once; a later choice of 0 sticks', () => {
  expect(mergeSettings({ musicVolume: 0, vibration: false }).musicVolume).toBe(0.3);
  expect(mergeSettings({ musicVolume: 0, vibration: false }).vibration).toBe(false);
  expect(mergeSettings({ version: 2, musicVolume: 0 }).musicVolume).toBe(0);
});
