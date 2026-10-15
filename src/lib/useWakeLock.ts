import { useEffect } from 'react';

// Keeps the screen on while `active`. The browser drops the lock when the tab
// is hidden, so it is re-requested whenever the page becomes visible again.
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !navigator.wakeLock) return;
    let sentinel: WakeLockSentinel | null = null;
    let disposed = false;

    const request = async () => {
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (disposed) void lock.release().catch(() => {});
        else sentinel = lock;
      } catch {
        // denied (battery saver) — nothing to do
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void request();
    };

    void request();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', onVisibility);
      if (sentinel) void sentinel.release().catch(() => {});
    };
  }, [active]);
}
