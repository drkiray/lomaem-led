import { mulberry32 } from '../lib/random';
import { CRACK_DURATION_S, CRACK_H, CRACK_W, generateCracks } from './cracks';

const points = (d: string) =>
  [...d.matchAll(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)].map((m) => [Number(m[1]), Number(m[2])] as const);
const onEdge = ([x, y]: readonly [number, number]) => x <= 0.5 || x >= CRACK_W - 0.5 || y <= 0.5 || y >= CRACK_H - 0.5;

test('same seed gives the same pattern', () => {
  expect(generateCracks(mulberry32(7))).toEqual(generateCracks(mulberry32(7)));
});

test('patterns vary between screens', () => {
  const shapes = new Set(Array.from({ length: 20 }, (_, i) => generateCracks(mulberry32(i)).map((c) => c.d).join('|')));
  expect(shapes.size).toBe(20);
});

test('nothing is drawn when the screen opens: every crack starts later', () => {
  for (let seed = 0; seed < 100; seed++) {
    for (const c of generateCracks(mulberry32(seed))) expect(c.delay).toBeGreaterThanOrEqual(0.5);
  }
});

test('the whole pattern finishes growing within the animation length', () => {
  expect(CRACK_DURATION_S).toBe(17.5);
  for (let seed = 0; seed < 100; seed++) {
    const cracks = generateCracks(mulberry32(seed));
    for (const c of cracks) {
      expect(c.duration).toBeGreaterThan(0);
      expect(c.delay + c.duration).toBeLessThanOrEqual(CRACK_DURATION_S + 1e-9);
    }
    // and it really takes most of that time, creeping in slowly
    expect(Math.max(...cracks.map((c) => c.delay + c.duration))).toBeGreaterThan(CRACK_DURATION_S * 0.8);
  }
});

test('cracks come in from the screen edges on several sides', () => {
  for (let seed = 0; seed < 100; seed++) {
    const starts = generateCracks(mulberry32(seed)).map((c) => points(c.d)[0]).filter(onEdge);
    expect(starts.length).toBeGreaterThanOrEqual(8);
    const sides = new Set(starts.map(([x, y]) => (x <= 0.5 ? 'L' : x >= CRACK_W - 0.5 ? 'R' : y <= 0.5 ? 'T' : 'B')));
    expect(sides.size).toBe(4);
  }
});

test('a branch starts no earlier than the crack that reaches its fork', () => {
  for (let seed = 0; seed < 50; seed++) {
    const cracks = generateCracks(mulberry32(seed));
    const earliestEdge = Math.min(...cracks.filter((c) => onEdge(points(c.d)[0])).map((c) => c.delay));
    for (const c of cracks) if (!onEdge(points(c.d)[0])) expect(c.delay).toBeGreaterThan(earliestEdge);
  }
});

test('by the end the cracks fill the whole screen', () => {
  const cols = 4;
  const rows = 8;
  for (let seed = 0; seed < 50; seed++) {
    const cells = new Set<string>();
    for (const c of generateCracks(mulberry32(seed))) {
      for (const [x, y] of points(c.d)) {
        if (x < 0 || x > CRACK_W || y < 0 || y > CRACK_H) continue;
        cells.add(`${Math.min(cols - 1, Math.floor((x / CRACK_W) * cols))}:${Math.min(rows - 1, Math.floor((y / CRACK_H) * rows))}`);
      }
    }
    expect(cells.size / (cols * rows)).toBeGreaterThanOrEqual(0.75);
  }
});

test('stays light enough to animate on a phone', () => {
  for (let seed = 0; seed < 100; seed++) expect(generateCracks(mulberry32(seed)).length).toBeLessThanOrEqual(90);
});
