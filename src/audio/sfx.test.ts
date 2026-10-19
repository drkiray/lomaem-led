import { SFX_RECIPES, SFX_SAMPLES, playSfx, resetSfxForTests } from './sfx';

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

test('plays the decoded sample instead of the synth, replaying timeUp as two hits', async () => {
  const { oscillators } = stubAudioContext();
  const sources: { start: ReturnType<typeof vi.fn> }[] = [];
  const decoded = {} as AudioBuffer;
  const ctor = (window as unknown as { AudioContext: ReturnType<typeof vi.fn> }).AudioContext;
  const base = ctor();
  ctor.mockImplementation(function () {
    return {
      ...base,
      decodeAudioData: vi.fn(() => Promise.resolve(decoded)),
      createBufferSource: () => {
        const src = { buffer: null, playbackRate: { value: 1 }, connect: vi.fn(), start: vi.fn() };
        sources.push(src);
        return src;
      },
    };
  });
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(1)) })));
  playSfx('timeUp', 1); // first call kicks off loading, synth plays meanwhile
  expect(oscillators.length).toBeGreaterThan(0);
  await vi.waitFor(() => {
    oscillators.length = 0;
    playSfx('timeUp', 1);
    expect(sources).toHaveLength(2);
  });
  expect(oscillators).toHaveLength(0);
});

test('a failed sample fetch keeps the synth fallback', async () => {
  const { oscillators } = stubAudioContext();
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))));
  playSfx('tap', 1);
  await Promise.resolve();
  playSfx('tap', 1);
  expect(oscillators).toHaveLength(2);
});

test('every sfx name has both a synth recipe and a sample entry', () => {
  expect(Object.keys(SFX_SAMPLES).sort()).toEqual(Object.keys(SFX_RECIPES).sort());
});
