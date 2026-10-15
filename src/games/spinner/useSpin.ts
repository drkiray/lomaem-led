import { useCallback, useEffect, useRef } from 'react';
import { WHEEL_CENTER, easeOutQuart } from './geometry';

// Animates the arrow by writing the SVG transform directly each frame and
// calls onTick whenever the arrow crosses a sector border.
export function useSpin(sectorCount: number, onTick: () => void) {
  const arrowRef = useRef<SVGGElement>(null);
  const rotation = useRef(0);
  const frame = useRef<number | null>(null);
  const tick = useRef(onTick);
  tick.current = onTick;

  const setRotation = useCallback((deg: number) => {
    rotation.current = deg;
    arrowRef.current?.setAttribute('transform', `rotate(${deg} ${WHEEL_CENTER} ${WHEEL_CENTER})`);
  }, []);

  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
  }, []);

  const spinTo = useCallback(
    (target: number, durationMs: number) =>
      new Promise<void>((resolve) => {
        const from = rotation.current;
        const size = 360 / sectorCount;
        let lastSector = Math.floor(from / size);
        const start = performance.now();
        const step = (now: number) => {
          const t = Math.min(1, (now - start) / durationMs);
          const deg = from + (target - from) * easeOutQuart(t);
          setRotation(deg);
          const sector = Math.floor(deg / size);
          if (sector !== lastSector) {
            lastSector = sector;
            tick.current();
          }
          if (t < 1) frame.current = requestAnimationFrame(step);
          else {
            frame.current = null;
            resolve();
          }
        };
        frame.current = requestAnimationFrame(step);
      }),
    [sectorCount, setRotation],
  );

  return { arrowRef, spinTo, setRotation };
}
