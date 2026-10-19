import { GAME_TRACKS, pickGameTrack, resetMusicForTests, setMusicScene, setMusicVolume } from './music';

function stubWebAudio(state: 'running' | 'suspended' = 'running') {
  const mkParam = () => ({ value: 0, cancelScheduledValues: vi.fn(), setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() });
  const nodes: { gain: ReturnType<typeof mkParam>; connect: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }[] = [];
  type Src = {
    loop: boolean;
    buffer: { duration: number } | null;
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  };
  const sources: Src[] = [];
  const ctx = {
    state,
    currentTime: 0,
    destination: {},
    resume: vi.fn(() => {
      ctx.state = 'running';
      return Promise.resolve();
    }),
    suspend: vi.fn(() => Promise.resolve()),
    decodeAudioData: vi.fn(() => Promise.resolve({ duration: 100 })),
    createGain: () => {
      const n = { gain: mkParam(), connect: vi.fn(), disconnect: vi.fn() };
      nodes.push(n);
      return n;
    },
    createBufferSource: () => {
      const s: Src = { loop: false, buffer: null, start: vi.fn(), stop: vi.fn(), connect: vi.fn(), disconnect: vi.fn() };
      sources.push(s);
      return s;
    },
  };
  vi.stubGlobal('AudioContext', vi.fn(function () { return ctx; }));
  const fetchMock = vi.fn((_url: string): Promise<Response> => Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(1)) } as Response));
  vi.stubGlobal('fetch', fetchMock);
  // nodes[0] is the master gain; every later gain belongs to one track
  return { ctx, nodes, sources, fetchMock, master: () => nodes[0] };
}

beforeEach(() => resetMusicForTests());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

test('volume 0 creates nothing', async () => {
  const { sources } = stubWebAudio();
  expect(await setMusicVolume(0)).toBe(false);
  expect(sources).toHaveLength(0);
});

test('menu: one gapless looping source from the base url, faded in once', async () => {
  const { sources, master, fetchMock } = stubWebAudio();
  expect(await setMusicVolume(0.4)).toBe(true);
  expect(fetchMock.mock.calls[0][0]).toMatch(/music\/bg\.mp3$/);
  expect(sources).toHaveLength(1);
  expect(sources[0].loop).toBe(true);
  expect(sources[0].start).toHaveBeenCalled();
  expect(master().gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(0.4, 2.5); // slow first fade
  expect(await setMusicVolume(0.4)).toBe(true);
  expect(master().gain.linearRampToValueAtTime).toHaveBeenCalledTimes(1); // retries don't restart the fade
  expect(await setMusicVolume(0.7)).toBe(true);
  expect(sources).toHaveLength(1); // volume change reuses the running source
  expect(master().gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(0.7, 0.15); // quick, no long fade
});

test('entering a game crossfades from the menu loop to a quiet, non-looping game track', async () => {
  const { sources, nodes, fetchMock } = stubWebAudio();
  await setMusicVolume(0.5);
  setMusicScene('game');
  await vi.waitFor(() => expect(sources).toHaveLength(2));
  expect(fetchMock.mock.calls.some((c) => GAME_TRACKS.includes(c[0]))).toBe(true);
  expect(sources[1].loop).toBe(false);
  const menuGain = nodes[1].gain;
  const gameGain = nodes[2].gain;
  expect(menuGain.linearRampToValueAtTime).toHaveBeenLastCalledWith(0, 1.5); // menu fades out
  expect(gameGain.linearRampToValueAtTime).toHaveBeenLastCalledWith(0.3, 1.5); // game fades in, quietly
  setMusicScene('menu');
  await vi.waitFor(() => expect(sources).toHaveLength(3));
  expect(sources[2].loop).toBe(true);
});

test('a game track hands over to a different one shortly before it ends', async () => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] });
  const { ctx, sources, fetchMock } = stubWebAudio();
  await setMusicVolume(0.5);
  setMusicScene('game');
  await vi.waitFor(() => expect(sources).toHaveLength(2));
  const firstUrl = fetchMock.mock.calls.map((c) => c[0]).filter((u) => GAME_TRACKS.includes(u))[0];
  ctx.currentTime = 50;
  await vi.advanceTimersByTimeAsync(600);
  expect(sources).toHaveLength(2); // 50 s into a 100 s track: nothing yet
  ctx.currentTime = 97; // inside the last 4 s
  await vi.advanceTimersByTimeAsync(600);
  expect(sources).toHaveLength(3);
  expect(sources[2].loop).toBe(false);
  const loaded = fetchMock.mock.calls.map((c) => c[0]).filter((u) => GAME_TRACKS.includes(u));
  expect(new Set(loaded).size).toBeGreaterThan(1);
  expect(loaded[0]).toBe(firstUrl);
});

test('pickGameTrack never repeats the previous index and reaches every other one', () => {
  for (let last = -1; last < 4; last++) {
    const seen = new Set<number>();
    for (let i = 0; i <= 100; i++) {
      const pick = pickGameTrack(4, last, () => i / 100.0001);
      expect(pick).toBeGreaterThanOrEqual(0);
      expect(pick).toBeLessThan(4);
      expect(pick).not.toBe(last);
      seen.add(pick);
    }
    expect(seen.size).toBe(last < 0 ? 4 : 3);
  }
  expect(pickGameTrack(1, 0)).toBe(0);
});

test('blocked autoplay resolves false and a later gesture starts it', async () => {
  const { ctx } = stubWebAudio('suspended');
  ctx.resume.mockImplementationOnce(() => new Promise(() => {})); // pending until a gesture, like Chrome
  expect(await setMusicVolume(0.4)).toBe(false);
  expect(await setMusicVolume(0.4)).toBe(true);
});

test('missing file or missing Web Audio support never throws', async () => {
  stubWebAudio().fetchMock.mockImplementation(() => Promise.resolve({ ok: false } as Response));
  await expect(setMusicVolume(0.4)).resolves.toBe(false);
  vi.stubGlobal('AudioContext', undefined);
  resetMusicForTests();
  await expect(setMusicVolume(0.4)).resolves.toBe(false);
});

test('turning the volume to 0 suspends playback', async () => {
  const { ctx, master } = stubWebAudio();
  await setMusicVolume(0.4);
  await setMusicVolume(0);
  expect(master().gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(0, 0.15);
  await new Promise((r) => setTimeout(r, 250));
  expect(ctx.suspend).toHaveBeenCalled();
});
