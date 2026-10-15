const CRACKS = [
  'M50 48 L42 30 L45 18 L38 0',
  'M50 48 L63 36 L70 22 L82 10 L100 4',
  'M50 48 L72 52 L86 60 L100 58',
  'M50 48 L58 66 L54 80 L62 100',
  'M50 48 L34 60 L22 58 L10 72 L0 70',
  'M50 48 L28 42 L14 30 L0 34',
  'M42 30 L30 26',
  'M70 22 L76 30',
  'M58 66 L68 74',
  'M22 58 L18 48',
];

export function IceCrack() {
  return (
    <svg className="ice-crack" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {CRACKS.map((d) => (
        <path key={d} d={d} pathLength={1} vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}
