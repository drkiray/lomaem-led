import { useState } from 'react';
import { CRACK_H, CRACK_W, generateCracks } from './cracks';

// Stroke width in box units: the 100×200 box is ~4.5 CSS px per unit on a
// phone, so this is ~1px. (vector-effect: non-scaling-stroke would keep the
// width exact but makes Chrome ignore pathLength, turning the growing line
// into a dotted one drawn all at once.)
const STROKE_UNITS = 0.24;

// A fresh random fracture on every mount; ScreenTransition re-mounts it per route.
// Each line grows on its own schedule, so the ice cracks slowly from the edges.
export function IceCrack() {
  const [cracks] = useState(() => generateCracks(Math.random));
  return (
    <svg className="ice-crack" viewBox={`0 0 ${CRACK_W} ${CRACK_H}`} preserveAspectRatio="xMidYMid slice"
      aria-hidden="true">
      {cracks.map((c, i) => (
        <path key={i} d={c.d} pathLength={1} strokeWidth={c.width * STROKE_UNITS}
          style={{ animationDelay: `${c.delay}s`, animationDuration: `${c.duration}s` }} />
      ))}
    </svg>
  );
}
