import { mulberry32 } from '../lib/random';
import { CRACK_H, CRACK_W, generateCracks } from './cracks';

const points = (d: string) =>
  [...d.matchAll(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)].map((m) => [Number(m[1]), Number(m[2])]);

test('same seed gives the same pattern', () => {
  expect(generateCracks(mulberry32(7))).toEqual(generateCracks(mulberry32(7)));
});

test('patterns vary between transitions', () => {
  const shapes = new Set(Array.from({ length: 20 }, (_, i) => generateCracks(mulberry32(i)).map((c) => c.d).join('|')));
  expect(shapes.size).toBe(20);
});

test('every pattern has a few visible cracks starting inside the screen', () => {
  for (let seed = 0; seed < 200; seed++) {
    const cracks = generateCracks(mulberry32(seed));
    expect(cracks.length).toBeGreaterThanOrEqual(2);
    expect(cracks.length).toBeLessThanOrEqual(24);
    for (const c of cracks) {
      const pts = points(c.d);
      expect(pts.length).toBeGreaterThanOrEqual(2);
      const [x, y] = pts[0];
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(CRACK_W);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(CRACK_H);
      expect(c.width).toBeGreaterThan(0);
      expect(c.delay).toBeGreaterThanOrEqual(0);
    }
  }
});

test('origins are spread over the screen, not one fixed spot', () => {
  const origins = Array.from({ length: 60 }, (_, i) => points(generateCracks(mulberry32(i))[0].d)[0]);
  const xs = origins.map(([x]) => x);
  const ys = origins.map(([, y]) => y);
  expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(CRACK_W * 0.6);
  expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(CRACK_H * 0.6);
});
