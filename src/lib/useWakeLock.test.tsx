import { act, renderHook } from '@testing-library/react';
import { useWakeLock } from './useWakeLock';

function stubWakeLock(request: () => Promise<{ release: () => Promise<void> }>) {
  Object.defineProperty(navigator, 'wakeLock', { value: { request: vi.fn(request) }, configurable: true });
  return (navigator as unknown as { wakeLock: { request: ReturnType<typeof vi.fn> } }).wakeLock.request;
}

afterEach(() => {
  Object.defineProperty(navigator, 'wakeLock', { value: undefined, configurable: true });
});

test('requests lock when active and releases on unmount', async () => {
  const release = vi.fn(() => Promise.resolve());
  const request = stubWakeLock(() => Promise.resolve({ release }));
  const { unmount } = renderHook(() => useWakeLock(true));
  await act(async () => {});
  expect(request).toHaveBeenCalledWith('screen');
  unmount();
  expect(release).toHaveBeenCalled();
});

test('does nothing when inactive', () => {
  const request = stubWakeLock(() => Promise.resolve({ release: vi.fn() }));
  renderHook(() => useWakeLock(false));
  expect(request).not.toHaveBeenCalled();
});

test('rejected request and missing API do not throw', async () => {
  stubWakeLock(() => Promise.reject(new Error('battery saver')));
  renderHook(() => useWakeLock(true));
  await act(async () => {});
  Object.defineProperty(navigator, 'wakeLock', { value: undefined, configurable: true });
  expect(() => renderHook(() => useWakeLock(true))).not.toThrow();
});

test('re-acquires lock when tab becomes visible again', async () => {
  const request = stubWakeLock(() => Promise.resolve({ release: vi.fn(() => Promise.resolve()) }));
  renderHook(() => useWakeLock(true));
  await act(async () => {});
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  await act(async () => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(request).toHaveBeenCalledTimes(2);
});
