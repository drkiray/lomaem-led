import { useRef, useState, type AnimationEvent, type ReactNode } from 'react';
import { IceCrack } from './IceCrack';

// Re-mounts the screen on route change (fade-in) and then cracks the ice
// behind it — but not on the very first render of the app. The crack starts
// when the screen's own fade-in ends: while the screen is still translucent,
// the frosted panels cannot hide it and it would show through buttons and text.
export function ScreenTransition({ routeKey, children }: { routeKey: string; children: ReactNode }) {
  const firstKey = useRef(routeKey);
  const navigated = useRef(false);
  if (routeKey !== firstKey.current) navigated.current = true;
  const [settledKey, setSettledKey] = useState<string | null>(null);

  const onAnimationEnd = (e: AnimationEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) setSettledKey(routeKey);
  };

  return (
    <>
      {navigated.current && settledKey === routeKey && <IceCrack key={`crack-${routeKey}`} />}
      <div key={routeKey} className="screen-enter" onAnimationEnd={onAnimationEnd}>
        {children}
      </div>
    </>
  );
}
