import { useState, type AnimationEvent, type ReactNode } from 'react';
import { IceCrack } from './IceCrack';

// Re-mounts the screen on route change (fade-in) and then slowly cracks the
// ice behind it. The crack starts
// when the screen's own fade-in ends: while the screen is still translucent,
// the frosted panels cannot hide it and it would show through buttons and text.
export function ScreenTransition({ routeKey, crack = true, children }: {
  routeKey: string;
  /** false on screens where the cracking would distract (games in play) */
  crack?: boolean;
  children: ReactNode;
}) {
  const [settledKey, setSettledKey] = useState<string | null>(null);

  const onAnimationEnd = (e: AnimationEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) setSettledKey(routeKey);
  };

  return (
    <>
      {crack && settledKey === routeKey && <IceCrack key={`crack-${routeKey}`} />}
      <div key={routeKey} className="screen-enter" onAnimationEnd={onAnimationEnd}>
        {children}
      </div>
    </>
  );
}
