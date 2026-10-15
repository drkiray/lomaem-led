import { useEffect, useRef, type ReactNode } from 'react';
import { IceCrack } from './IceCrack';

// Re-mounts the screen on route change (fade-in) and flashes a faint ice
// crack behind it — but not on the very first render of the app.
export function ScreenTransition({ routeKey, children }: { routeKey: string; children: ReactNode }) {
  const isFirst = useRef(true);
  const showCrack = !isFirst.current;
  useEffect(() => {
    isFirst.current = false;
  }, []);

  return (
    <>
      {showCrack && <IceCrack key={`crack-${routeKey}`} />}
      <div key={routeKey} className="screen-enter">
        {children}
      </div>
    </>
  );
}
