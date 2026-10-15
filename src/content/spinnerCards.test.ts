import { LEVELS, fillTemplate } from '../games/spinner/deck';
import { SPINNER_CARDS } from './spinnerCards';

const BANNED = /секс|алкогол|выпе|выпи|пьян|бухл|интим|голы[йеx]|наркот|постел/i;

test.each(LEVELS)('level %i has ~40 cards with ~30% actions', (level) => {
  const cards = SPINNER_CARDS.filter((c) => c.level === level);
  expect(cards.length).toBeGreaterThanOrEqual(40);
  const actions = cards.filter((c) => c.kind === 'action').length / cards.length;
  expect(actions).toBeGreaterThanOrEqual(0.25);
  expect(actions).toBeLessThanOrEqual(0.35);
});

test('ids and texts are unique', () => {
  expect(new Set(SPINNER_CARDS.map((c) => c.id)).size).toBe(SPINNER_CARDS.length);
  expect(new Set(SPINNER_CARDS.map((c) => c.text)).size).toBe(SPINNER_CARDS.length);
});

test('no 18+ content', () => {
  for (const c of SPINNER_CARDS) expect(c.text).not.toMatch(BANNED);
});

test('no seating references', () => {
  for (const c of SPINNER_CARDS) expect(c.text).not.toMatch(/сосед|слева|справа/i);
});

test('only known placeholders, all substituted', () => {
  for (const c of SPINNER_CARDS) {
    const filled = fillTemplate(c.text, 'А', 'Б');
    expect(filled).not.toMatch(/[{}]/);
  }
});

// Names are not declined, so a placeholder must never sit where Russian needs
// an oblique case («с Маша», «Сделай Маша комплимент»).
const OBLIQUE_BEFORE_NAME =
  /(^|[\s(])(с|со|для|у|о|об|к|ко|честь|качество|опиши|сделай|предложи|подари|скажи|видишь|научи|покажи)\s+\{(asker|answerer)\}/i;

test('names only appear in nominative-safe positions', () => {
  const bad = SPINNER_CARDS.filter((c) => OBLIQUE_BEFORE_NAME.test(c.text)).map((c) => c.text);
  expect(bad).toEqual([]);
});

test('questions end with a question mark', () => {
  for (const c of SPINNER_CARDS.filter((c) => c.kind === 'question')) expect(c.text.trim().endsWith('?')).toBe(true);
});
