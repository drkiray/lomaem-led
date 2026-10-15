import { useCallback, useEffect, useRef, useState } from 'react';

type LockableOrientation = ScreenOrientation & {
  lock?: (orientation: 'landscape') => Promise<void>;
  unlock?: () => void;
};

const orientation = () => (typeof screen !== 'undefined' ? (screen.orientation as LockableOrientation | undefined) : undefined);
const supported = () => typeof document.documentElement.requestFullscreen === 'function';
const isFullscreen = () => Boolean(document.fullscreenElement);

export interface Landscape {
  /** show the «turn the phone» prompt (needs a tap: fullscreen requires a user gesture) */
  offer: boolean;
  /** fullscreen is possible but off — e.g. after the back gesture left it */
  canEnter: boolean;
  enter: () => Promise<void>;
  decline: () => void;
}

// Fullscreen + landscape lock for a game screen. Chrome only allows the
// orientation lock while fullscreen; everything is undone when the game unmounts.
export function useLandscape(enabled: boolean): Landscape {
  const [full, setFull] = useState(isFullscreen);
  const [answered, setAnswered] = useState(false);
  const entered = useRef(false);

  useEffect(() => {
    const onChange = () => setFull(isFullscreen());
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useEffect(
    () => () => {
      if (!entered.current) return;
      try {
        orientation()?.unlock?.();
      } catch {
        // not locked
      }
      if (isFullscreen()) void document.exitFullscreen().catch(() => {});
    },
    [],
  );

  const enter = useCallback(async () => {
    setAnswered(true);
    try {
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      entered.current = true;
      await orientation()?.lock?.('landscape');
    } catch {
      // denied, or no orientation lock (desktop) — play as is
    }
  }, []);

  const decline = useCallback(() => setAnswered(true), []);

  const canEnter = enabled && supported() && !full;
  return { offer: canEnter && !answered, canEnter, enter, decline };
}
