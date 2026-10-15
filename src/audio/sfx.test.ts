import { SFX_RECIPES, playSfx, resetSfxForTests } from './sfx';

function stubAudioContext() {
  const oscillators: unknown[] = [];
  const param = () => ({ setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() });
  // `function` (not arrow) so it can be called with `new`; returning an object from a constructor yields that object.
  const ctor = vi.fn(function () {
    return {
      currentTime: 0,
      state: 'running',
      resume: vi.fn(() => Promise.resolve()),
      destination: {},
      createOscillator: () => {
        const osc = { type: 'sine', frequency: param(), connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
        oscillators.push(osc);
        return osc;
      },
      createGain: () => ({ gain: param(), connect: vi.fn() }),
    };
  });
  vi.stubGlobal('AudioContext', ctor);
  return { ctor, oscillators };
}

afterEach(() => {
  vi.unstubAllGlobals();
  resetSfxForTests();
});

test('volume 0 never creates an AudioContext', () => {
  const { ctor } = stubAudioContext();
  playSfx('tick', 0);
  expect(ctor).not.toHaveBeenCalled();
});

test('missing Web Audio support does not throw', () => {
  vi.stubGlobal('AudioContext', undefined);
  expect(() => playSfx('correct', 1)).not.toThrow();
});

test('plays one oscillator per tone in recipe', () => {
  const { oscillators } = stubAudioContext();
  playSfx('timeUp', 0.5);
  expect(oscillators).toHaveLength(SFX_RECIPES.timeUp.length);
});
