const MUSIC_URL = `${import.meta.env.BASE_URL}music/bg.mp3`;

// Played through Web Audio rather than <audio loop>: an element restarts with an
// audible gap at the loop point, a looping AudioBufferSource does not.
let ctx: AudioContext | null = null;
let gain: GainNode | null = null;
let source: AudioBufferSourceNode | null = null;
let buffer: Promise<AudioBuffer> | null = null;
let target = -1; // volume the gain is ramping to / sitting at
let wanted = 0; // latest requested volume (may change while the file loads)

const FADE_IN_S = 2.5; // first start: ease in so the music doesn't slam on
const CHANGE_S = 0.15; // later volume changes: short ramp, avoids zipper clicks

function rampTo(volume: number, seconds: number): void {
  if (!ctx || !gain || volume === target) return; // repeated retries must not restart the ramp
  target = volume;
  const g = gain.gain;
  const now = ctx.currentTime;
  g.cancelScheduledValues(now);
  g.setValueAtTime(g.value, now);
  g.linearRampToValueAtTime(volume, now + seconds);
}

function loadBuffer(audio: AudioContext): Promise<AudioBuffer> {
  buffer ??= fetch(MUSIC_URL)
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
    .then((data) => audio.decodeAudioData(data))
    .catch((e) => {
      buffer = null; // allow a retry on the next gesture
      throw e;
    });
  return buffer;
}

// Resolves true once the track is actually audible, false when it is off or the
// browser blocked it (autoplay policy) — callers retry from a user gesture.
export async function setMusicVolume(volume: number): Promise<boolean> {
  if (volume <= 0) {
    rampTo(0, CHANGE_S);
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
      gain = ctx.createGain();
      gain.gain.value = 0;
      gain.connect(ctx.destination);
      target = 0;
    }
    const audio = ctx;
    // resume() must be called synchronously inside the gesture; without one it stays pending.
    const resumed = audio.state === 'running' ? Promise.resolve() : audio.resume();
    wanted = Math.min(1, volume);
    if (source) rampTo(wanted, CHANGE_S);
    if (!source) {
      const decoded = await loadBuffer(audio);
      if (!source) {
        source = audio.createBufferSource();
        source.buffer = decoded;
        source.loop = true;
        source.connect(gain!);
        source.start(0);
        // The first start fades in slowly, counted from when sound actually begins.
        target = 0;
        rampTo(wanted, FADE_IN_S);
      }
    }
    await Promise.race([resumed, new Promise((r) => setTimeout(r, 250))]);
    return audio.state === 'running';
  } catch {
    return false;
  }
}

export function resetMusicForTests(): void {
  ctx = null;
  gain = null;
  source = null;
  buffer = null;
  target = -1;
  wanted = 0;
}
