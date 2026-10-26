import { useEffect } from 'react';

// Writes the real viewport height into --app-h. Chrome on Android can keep a
// stale 100dvh after fullscreen or rotation (the game became taller than the
// screen until it was reopened), so it is re-measured on every such change,
// and again a little later because the new size often lands after the event.
export function useViewportHeight(): void {
  useEffect(() => {
    const root = document.documentElement;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const measure = () => {
      const h = window.visualViewport?.height ?? window.innerHeight;
      if (h > 0) root.style.setProperty('--app-h', `${Math.round(h)}px`);
    };
    const update = () => {
      measure();
      timers.push(setTimeout(measure, 150), setTimeout(measure, 500));
    };
    measure();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    document.addEventListener('fullscreenchange', update);
    window.visualViewport?.addEventListener('resize', update);
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      document.removeEventListener('fullscreenchange', update);
      window.visualViewport?.removeEventListener('resize', update);
      root.style.removeProperty('--app-h');
    };
  }, []);
}
