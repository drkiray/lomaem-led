export type MusicScene = 'menu' | 'game';

const BASE = import.meta.env.BASE_URL;
const MENU_TRACK = `${BASE}music/bg.mp3`;
export const GAME_TRACKS = [1, 2, 3, 4].map((n) => `${BASE}music/game-${n}.mp3`);

// Menu and game setup loop one track; during a game the four tracks shuffle at a
// low level so the music stays behind the conversation.
const SCENE_LEVEL: Record<MusicScene, number> = { menu: 1, game: 0.3 };

const FADE_IN_S = 2.5; // very first start: ease in so the music doesn't slam on
const CHANGE_S = 0.15; // volume-slider changes: short ramp, avoids zipper clicks
const SCENE_FADE_S = 1.5; // menu ↔ game
const CROSSFADE_S = 4; // game track → next game track
const POLL_MS = 500;

// Web Audio rather than <audio>: a looping AudioBufferSource has no gap at the
// loop point, and it needs no per-element user gesture on iOS.
interface Playing {
  url: string;
  scene: MusicScene;
  source: AudioBufferSourceNode;
  gain: GainNode;
  startedAt: number; // ctx time
  duration: number;
}

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let current: Playing | null = null;
let wantedScene: MusicScene = 'menu';
let wantedVolume = 0;
let target = -1; // master gain target
let token = 0; // bumps on every scene change so stale async work gives up
let advancing = false;
let poll: ReturnType<typeof setInterval> | null = null;
let lastGame = -1;
let upcoming: string | null = null;
const buffers = new Map<string, Promise<AudioBuffer>>();

// Picks a game track index different from the previous one.
export function pickGameTrack(count: number, last: number, rng: () => number = Math.random): number {
  if (count <= 1) return 0;
  if (last < 0) return Math.floor(rng() * count);
  const choice = Math.floor(rng() * (count - 1)); // skip over `last`
  return choice >= last ? choice + 1 : choice;
}

function loadBuffer(url: string): Promise<AudioBuffer> {
  let pending = buffers.get(url);
  if (!pending) {
    pending = fetch(url)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then((data) => ctx!.decodeAudioData(data))
      .catch((e) => {
        buffers.delete(url); // allow a retry
        throw e;
      });
    buffers.set(url, pending);
  }
  return pending;
}

function rampParam(param: AudioParam, value: number, seconds: number): void {
  if (!ctx) return;
  const now = ctx.currentTime;
  param.cancelScheduledValues(now);
  param.setValueAtTime(param.value, now);
  param.linearRampToValueAtTime(value, now + seconds);
}

function rampMaster(volume: number, seconds: number): void {
  if (!master || volume === target) return; // repeated retries must not restart the ramp
  target = volume;
  rampParam(master.gain, volume, seconds);
}

function nextGameUrl(): string {
  lastGame = pickGameTrack(GAME_TRACKS.length, lastGame);
  return GAME_TRACKS[lastGame];
}

function release(url: string): void {
  if (url !== MENU_TRACK) buffers.delete(url); // game tracks are big once decoded
}

function fadeOut(old: Playing, seconds: number): void {
  rampParam(old.gain.gain, 0, seconds);
  setTimeout(() => {
    try {
      old.source.stop();
      old.source.disconnect();
      old.gain.disconnect();
    } catch {
      // already stopped
    }
    if (current?.url !== old.url) release(old.url);
  }, seconds * 1000 + 100);
}

function startTrack(url: string, scene: MusicScene, buffer: AudioBuffer, fadeS: number): void {
  const audio = ctx!;
  const gain = audio.createGain();
  const level = SCENE_LEVEL[scene];
  gain.gain.value = fadeS > 0 ? 0 : level;
  gain.connect(master!);
  const source = audio.createBufferSource();
  source.buffer = buffer;
  source.loop = scene === 'menu';
  source.connect(gain);
  source.start(0);
  if (fadeS > 0) rampParam(gain.gain, level, fadeS);
  const previous = current;
  current = { url, scene, source, gain, startedAt: audio.currentTime, duration: buffer.duration };
  if (previous) fadeOut(previous, fadeS || CHANGE_S);

  if (scene === 'game') {
    upcoming = nextGameUrl();
    void loadBuffer(upcoming).catch(() => {}); // decode ahead so the crossfade is instant
    poll ??= setInterval(tick, POLL_MS);
  } else if (poll) {
    clearInterval(poll);
    poll = null;
  }
}

function tick(): void {
  if (!ctx || ctx.state !== 'running' || !current || current.scene !== 'game' || advancing) return;
  if (ctx.currentTime < current.startedAt + current.duration - CROSSFADE_S) return;
  advancing = true;
  const mine = token;
  const url = upcoming ?? nextGameUrl();
  loadBuffer(url)
    .then((buffer) => {
      if (mine === token && current?.scene === 'game') startTrack(url, 'game', buffer, CROSSFADE_S);
    })
    .catch(() => {
      upcoming = null; // missing/corrupt file: try another next tick
    })
    .finally(() => {
      advancing = false;
    });
}

// Starts (or switches to) the track set for the wanted scene.
async function syncScene(): Promise<void> {
  if (!ctx || !master || current?.scene === wantedScene) return;
  const mine = ++token;
  const scene = wantedScene;
  const first = !current;
  const url = scene === 'menu' ? MENU_TRACK : (upcoming ?? nextGameUrl());
  upcoming = null;
  const buffer = await loadBuffer(url);
  if (mine !== token || !ctx) return;
  startTrack(url, scene, buffer, first ? 0 : SCENE_FADE_S);
  // The very first start fades in slowly, counted from when sound actually begins.
  if (first) {
    target = 0;
    master.gain.value = 0;
    rampMaster(wantedVolume, FADE_IN_S);
  }
}

// Switches between the menu loop and the game playlist (crossfaded).
export function setMusicScene(scene: MusicScene): void {
  if (scene === wantedScene) return;
  wantedScene = scene;
  if (ctx && wantedVolume > 0) void syncScene().catch(() => {});
}

// Resolves true once the music is actually audible, false when it is off or the
// browser blocked it (autoplay policy) — callers retry from a user gesture.
export async function setMusicVolume(volume: number): Promise<boolean> {
  if (volume <= 0) {
    wantedVolume = 0;
    rampMaster(0, CHANGE_S);
    // let the ramp finish before freezing the context
    const audio = ctx;
    if (audio) setTimeout(() => target === 0 && void audio.suspend(), CHANGE_S * 1000 + 50);
    return false;
  }
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return false;
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
      target = 0;
    }
    const audio = ctx;
    // resume() must be called synchronously inside the gesture; without one it stays pending.
    const resumed = audio.state === 'running' ? Promise.resolve() : audio.resume();
    wantedVolume = Math.min(1, volume);
    if (current) rampMaster(wantedVolume, CHANGE_S);
    await syncScene();
    await Promise.race([resumed, new Promise((r) => setTimeout(r, 250))]);
    return audio.state === 'running';
  } catch {
    return false;
  }
}

export function resetMusicForTests(): void {
  if (poll) clearInterval(poll);
  poll = null;
  ctx = null;
  master = null;
  current = null;
  wantedScene = 'menu';
  wantedVolume = 0;
  target = -1;
  token = 0;
  advancing = false;
  lastGame = -1;
  upcoming = null;
  buffers.clear();
}
