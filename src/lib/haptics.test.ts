import { vibrate } from './haptics';

test('vibrates only when enabled and supported', () => {
  const fn = vi.fn();
  Object.defineProperty(navigator, 'vibrate', { value: fn, configurable: true });
  vibrate(50, false);
  expect(fn).not.toHaveBeenCalled();
  vibrate([50, 30, 50], true);
  expect(fn).toHaveBeenCalledWith([50, 30, 50]);
});

test('no vibrate API does not throw', () => {
  Object.defineProperty(navigator, 'vibrate', { value: undefined, configurable: true });
  expect(() => vibrate(50, true)).not.toThrow();
});
