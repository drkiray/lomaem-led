import { resetMusicForTests, setMusicVolume } from './music';

class FakeAudio {
  static instances: FakeAudio[] = [];
  loop = false;
  volume = 1;
  paused = true;
  play = vi.fn(() => {
    this.paused = false;
    return Promise.resolve();
  });
  pause = vi.fn(() => {
    this.paused = true;
  });
  constructor(public src: string) {
    FakeAudio.instances.push(this);
  }
}

beforeEach(() => {
  FakeAudio.instances = [];
  vi.stubGlobal('Audio', FakeAudio);
  resetMusicForTests();
});
afterEach(() => vi.unstubAllGlobals());

test('volume 0 creates nothing', () => {
  setMusicVolume(0);
  expect(FakeAudio.instances).toHaveLength(0);
});

test('positive volume starts looping track from base url', () => {
  setMusicVolume(0.4);
  const a = FakeAudio.instances[0];
  expect(a.src).toMatch(/music\/bg\.mp3$/);
  expect(a.loop).toBe(true);
  expect(a.volume).toBe(0.4);
  expect(a.play).toHaveBeenCalled();
  setMusicVolume(0);
  expect(a.pause).toHaveBeenCalled();
});

test('rejected play (autoplay block / missing file) is swallowed', async () => {
  setMusicVolume(0.4);
  const a = FakeAudio.instances[0];
  a.paused = true;
  a.play.mockImplementationOnce(() => Promise.reject(new Error('NotAllowedError')));
  expect(() => setMusicVolume(0.5)).not.toThrow();
  await Promise.resolve();
});
