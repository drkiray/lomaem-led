import { useEffect, useRef, useState } from 'react';
import { Button } from '../ui/Button';

// How long the fake loading bar runs; keep in sync with .splash__fill in global.css.
// A timer (not animationend) so it still finishes under prefers-reduced-motion.
export const SPLASH_LOAD_MS = 1300;

// First screen of every launch. Its real job is to collect the first tap:
// browsers only let audio start after a user gesture, so the music begins here.
export function Splash({ onStart }: { onStart: () => void }) {
  const [ready, setReady] = useState(false);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setReady(true), SPLASH_LOAD_MS);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (ready) button.current?.focus({ preventScroll: true });
  }, [ready]);

  return (
    <main className="splash">
      <h1 className="logo">
        Ломаем <span>Лёд</span>
      </h1>
      <div className="splash__stage">
        {ready ? (
          <Button ref={button} size="lg" className="splash__go" onClick={onStart}>Поиграем?</Button>
        ) : (
          <div className="splash__bar" role="progressbar" aria-label="Загрузка">
            <div className="splash__fill" />
          </div>
        )}
      </div>
    </main>
  );
}
