import type { RefObject } from 'react';
import {
  WHEEL_CENTER, WHEEL_RADIUS, WHEEL_SIZE, fitLabel, labelPlacement, sectorColor, sectorPath,
} from './geometry';
import './spinner.css';

interface Props {
  players: string[];
  activeIndex: number;
  arrowRef: RefObject<SVGGElement>;
  disabled: boolean;
  onSpin: () => void;
}

const C = WHEEL_CENTER;
const TIP = C - WHEEL_RADIUS * 0.8;
const ARROW_PATH = `M${C} ${TIP} L${C + 16} ${C - 20} L${C + 7} ${C - 18} L${C + 7} ${C + 40} L${C - 7} ${C + 40} L${C - 7} ${C - 18} L${C - 16} ${C - 20} Z`;

export function Wheel({ players, activeIndex, arrowRef, disabled, onSpin }: Props) {
  const n = players.length;

  return (
    <div className="wheel">
      <svg className="wheel__svg" viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`} aria-hidden="true">
        <defs>
          <filter id="wheel-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {players.map((name, i) => {
          const label = labelPlacement(i, n);
          const { text, fontSize } = fitLabel(name, n);
          return (
            <g key={i} className="wheel__sector">
              <path d={sectorPath(i, n)} fill={sectorColor(i, n)} />
              <text
                className="wheel__label"
                x={label.x}
                y={C}
                transform={label.transform}
                textAnchor={label.anchor}
                dominantBaseline="middle"
                fontSize={fontSize}
              >
                {text}
              </text>
            </g>
          );
        })}
        <path className="wheel__active" d={sectorPath(activeIndex, n)} filter="url(#wheel-glow)" />
        <circle className="wheel__rim" cx={C} cy={C} r={WHEEL_RADIUS} />
        <g ref={arrowRef} className="wheel__arrow" filter="url(#wheel-glow)">
          <path d={ARROW_PATH} />
        </g>
      </svg>
      <button type="button" className="wheel__hub" aria-label="Крутить" disabled={disabled} onClick={onSpin}>
        <svg className="wheel__hub-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 12a8 8 0 1 1-2.34-5.66" />
          <path d="M20 4v4.5h-4.5" />
        </svg>
      </button>
    </div>
  );
}
