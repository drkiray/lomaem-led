import { useState } from 'react';
import { CRACK_H, CRACK_W, generateCracks } from './cracks';

// A fresh random fracture on every mount; ScreenTransition re-mounts it per route.
export function IceCrack() {
  const [cracks] = useState(() => generateCracks(Math.random));
  return (
    <svg className="ice-crack" viewBox={`0 0 ${CRACK_W} ${CRACK_H}`} preserveAspectRatio="xMidYMid slice"
      aria-hidden="true">
      {cracks.map((c, i) => (
        <path key={i} d={c.d} pathLength={1} vectorEffect="non-scaling-stroke" strokeWidth={c.width}
          style={{ animationDelay: `${c.delay}s` }} />
      ))}
    </svg>
  );
}
