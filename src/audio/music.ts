const MUSIC_URL = `${import.meta.env.BASE_URL}music/bg.mp3`;

// Played through Web Audio rather than <audio loop>: an element restarts with an
// audible gap at the loop point, a looping AudioBufferSource does not.
let ctx: AudioContext | null = null;
let gain: GainNode | null = null;
let source: AudioBufferSourceNode | null = null;
let buffer: Promise<AudioBuffer> | null = null;

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
    if (gain) gain.gain.value = 0;
    void ctx?.suspend();
    return false;
  }
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return false;
      ctx = new Ctor();
      gain = ctx.createGain();
      gain.connect(ctx.destination);
    }
    const audio = ctx;
    // resume() must be called synchronously inside the gesture; without one it stays pending.
    const resumed = audio.state === 'running' ? Promise.resolve() : audio.resume();
    gain!.gain.value = Math.min(1, volume);
    if (!source) {
      const decoded = await loadBuffer(audio);
      if (!source) {
        source = audio.createBufferSource();
        source.buffer = decoded;
        source.loop = true;
        source.connect(gain!);
        source.start(0);
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
}
