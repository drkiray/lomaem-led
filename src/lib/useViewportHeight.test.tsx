import { renderHook } from '@testing-library/react';
import { useViewportHeight } from './useViewportHeight';

test('keeps --app-h in sync with the real viewport height', () => {
  vi.useFakeTimers();
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
  const { unmount } = renderHook(() => useViewportHeight());
  const appH = () => document.documentElement.style.getPropertyValue('--app-h');
  expect(appH()).toBe('800px');
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 390 });
  document.dispatchEvent(new Event('fullscreenchange'));
  expect(appH()).toBe('390px');
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 360 }); // size settles late
  vi.advanceTimersByTime(600);
  expect(appH()).toBe('360px');
  unmount();
  expect(appH()).toBe('');
  vi.useRealTimers();
});
