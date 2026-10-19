import { resetMusicForTests, setMusicVolume } from './music';

function stubWebAudio(state: 'running' | 'suspended' = 'running') {
  const param = { value: 0, cancelScheduledValues: vi.fn(), setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() };
  const node = { gain: param, connect: vi.fn() };
  const sources: { loop: boolean; buffer: unknown; start: ReturnType<typeof vi.fn>; connect: ReturnType<typeof vi.fn> }[] = [];
  const ctx = {
    state,
    currentTime: 0,
    destination: {},
    resume: vi.fn(() => {
      ctx.state = 'running';
      return Promise.resolve();
    }),
    suspend: vi.fn(() => Promise.resolve()),
    decodeAudioData: vi.fn(() => Promise.resolve({ decoded: true })),
    createGain: () => node,
    createBufferSource: () => {
      const s = { loop: false, buffer: null, start: vi.fn(), connect: vi.fn() };
      sources.push(s);
      return s;
    },
  };
  vi.stubGlobal('AudioContext', vi.fn(function () { return ctx; }));
  const fetchMock = vi.fn((_url: string): Promise<Response> => Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(1)) } as Response));
  vi.stubGlobal('fetch', fetchMock);
  return { ctx, node, sources, fetchMock };
}

beforeEach(() => resetMusicForTests());
afterEach(() => vi.unstubAllGlobals());

test('volume 0 creates nothing', async () => {
  const { sources } = stubWebAudio();
  expect(await setMusicVolume(0)).toBe(false);
  expect(sources).toHaveLength(0);
});

test('positive volume starts one gapless looping source from the base url', async () => {
  const { sources, node, fetchMock } = stubWebAudio();
  expect(await setMusicVolume(0.4)).toBe(true);
  expect(fetchMock.mock.calls[0][0]).toMatch(/music\/bg\.mp3$/);
  expect(sources).toHaveLength(1);
  expect(sources[0].loop).toBe(true);
  expect(sources[0].start).toHaveBeenCalled();
  // first start fades in from silence over a couple of seconds
  expect(node.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(0.4, 2.5);
  expect(await setMusicVolume(0.4)).toBe(true);
  expect(node.gain.linearRampToValueAtTime).toHaveBeenCalledTimes(1); // retries don't restart the fade
  expect(await setMusicVolume(0.7)).toBe(true);
  expect(sources).toHaveLength(1); // volume change reuses the running source
  expect(node.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(0.7, 0.15); // quick, no long fade
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
  const { ctx, node } = stubWebAudio();
  await setMusicVolume(0.4);
  await setMusicVolume(0);
  expect(node.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(0, 0.15);
  await new Promise((r) => setTimeout(r, 250));
  expect(ctx.suspend).toHaveBeenCalled();
});
