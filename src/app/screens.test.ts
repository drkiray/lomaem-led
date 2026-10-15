import { SCREENS, showsCrack } from './screens';

test('the ice cracks everywhere except during play', () => {
  expect(showsCrack('spinner-game')).toBe(false);
  expect(showsCrack('hat-game')).toBe(false);
  for (const route of Object.keys(SCREENS) as (keyof typeof SCREENS)[]) {
    if (route !== 'spinner-game' && route !== 'hat-game') expect(showsCrack(route)).toBe(true);
  }
});
