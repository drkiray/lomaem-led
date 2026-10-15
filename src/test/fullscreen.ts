// Fake Fullscreen + Screen Orientation APIs (jsdom has neither).
export function stubFullscreen({ lockFails = false } = {}) {
  const root = document.documentElement as HTMLElement & { requestFullscreen?: unknown };
  let current: Element | null = null;
  const change = () => document.dispatchEvent(new Event('fullscreenchange'));
  const requestFullscreen = vi.fn(async () => {
    current = root;
    change();
  });
  const exitFullscreen = vi.fn(async () => {
    current = null;
    change();
  });
  const lock = vi.fn(() => (lockFails ? Promise.reject(new Error('not supported')) : Promise.resolve()));
  const unlock = vi.fn();
  Object.defineProperty(root, 'requestFullscreen', { value: requestFullscreen, configurable: true });
  Object.defineProperty(document, 'exitFullscreen', { value: exitFullscreen, configurable: true });
  Object.defineProperty(document, 'fullscreenElement', { get: () => current, configurable: true });
  Object.defineProperty(screen, 'orientation', { value: { lock, unlock }, configurable: true });
  return {
    requestFullscreen, exitFullscreen, lock, unlock,
    leave: () => {
      current = null;
      change();
    },
  };
}

export function unstubFullscreen() {
  for (const [target, key] of [
    [document.documentElement, 'requestFullscreen'], [document, 'exitFullscreen'],
    [document, 'fullscreenElement'], [screen, 'orientation'],
  ] as const) {
    Object.defineProperty(target, key, { value: undefined, configurable: true });
  }
}
