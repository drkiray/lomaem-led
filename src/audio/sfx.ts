export type SfxName = 'tick' | 'stop' | 'card' | 'correct' | 'skip' | 'timeUp' | 'countdown' | 'tap' | 'toggle' | 'select' | 'back';

interface Tone {
  freq: number;
  dur: number;
  type?: OscillatorType;
  delay?: number;
  gain?: number;
  slideTo?: number;
}

export const SFX_RECIPES: Record<SfxName, Tone[]> = {
  tick: [{ freq: 1800, dur: 0.025, type: 'square', gain: 0.2 }],
  stop: [
    { freq: 660, dur: 0.12, type: 'triangle' },
    { freq: 990, dur: 0.18, type: 'triangle', delay: 0.1 },
  ],
  card: [{ freq: 520, dur: 0.25, type: 'sine', slideTo: 880 }],
  correct: [
    { freq: 784, dur: 0.1, type: 'triangle' },
    { freq: 1047, dur: 0.16, type: 'triangle', delay: 0.09 },
  ],
  skip: [{ freq: 330, dur: 0.18, type: 'sawtooth', slideTo: 220, gain: 0.35 }],
  timeUp: [
    { freq: 880, dur: 0.2, type: 'square', gain: 0.45 },
    { freq: 880, dur: 0.2, type: 'square', gain: 0.45, delay: 0.3 },
    { freq: 660, dur: 0.5, type: 'square', gain: 0.45, delay: 0.6 },
  ],
  countdown: [{ freq: 600, dur: 0.12, type: 'sine' }],
  tap: [{ freq: 420, dur: 0.05, type: 'sine', gain: 0.5 }],
  toggle: [{ freq: 520, dur: 0.06, type: 'triangle', gain: 0.5 }],
  select: [{ freq: 660, dur: 0.12, type: 'sine', slideTo: 880, gain: 0.5 }],
  back: [{ freq: 440, dur: 0.1, type: 'sine', slideTo: 330, gain: 0.5 }],
};

// Recorded samples (public/sfx, Kenney «Interface Sounds», CC0). Several files
// for one name are picked at random; `hits` replays the sample at offsets (s).
// Until a sample is decoded — or if it fails to load — the synth recipe plays.
interface Sample {
  files: string[];
  gain: number;
  jitter?: number; // ± random playback-rate spread, keeps rapid repeats from sounding mechanical
  pitches?: number[]; // semitone offsets; one is picked per play (never the same twice in a row)
  hits?: number[];
}

export const SFX_SAMPLES: Record<SfxName, Sample> = {
  tick: { files: ['spin-tick'], gain: 0.5, jitter: 0.08 },
  stop: { files: ['stop'], gain: 0.8 },
  card: { files: ['card'], gain: 0.7 },
  correct: { files: ['correct'], gain: 0.8 },
  skip: { files: ['skip'], gain: 0.7 },
  timeUp: { files: ['timeUp'], gain: 1, hits: [0, 0.55] },
  countdown: { files: ['countdown'], gain: 0.8 },
  tap: { files: ['tap'], gain: 0.5 },
  toggle: { files: ['toggle'], gain: 0.9 },
  // kalimba C note re-pitched along a pentatonic scale: any sequence sounds consonant
  select: { files: ['select'], gain: 0.6, pitches: [-5, -3, 0, 2, 4, 7, 9, 12] },
  back: { files: ['back'], gain: 0.6 },
};

// Picks a semitone offset different from the previous one.
export function pickPitch(pitches: number[], last: number | undefined, rng: () => number = Math.random): number {
  const options = pitches.length > 1 ? pitches.filter((p) => p !== last) : pitches;
  return options[Math.floor(rng() * options.length)];
}

const lastPitch = new Map<SfxName, number>();

const SAMPLE_URL = (file: string) => `${import.meta.env.BASE_URL}sfx/${file}.mp3`;

let ctx: AudioContext | null = null;
const buffers = new Map<string, AudioBuffer>();
let loading = false;

function getContext(): AudioContext | null {
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  // Chrome starts the context suspended until a user gesture; every sfx is triggered by one.
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

// Fetches and decodes every sample once; safe to call repeatedly.
export function preloadSfx(): void {
  if (loading) return;
  try {
    const audio = getContext();
    if (!audio?.decodeAudioData || typeof fetch !== 'function') return;
    loading = true;
    for (const { files } of Object.values(SFX_SAMPLES)) {
      for (const file of files) {
        fetch(SAMPLE_URL(file))
          .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
          .then((data) => audio.decodeAudioData(data))
          .then((buf) => void buffers.set(file, buf))
          .catch(() => {}); // missing file → synth fallback
      }
    }
  } catch {
    loading = false;
  }
}

function playSample(audio: AudioContext, name: SfxName, volume: number): boolean {
  const { files, gain, jitter, pitches, hits = [0] } = SFX_SAMPLES[name];
  const ready = files.filter((f) => buffers.has(f));
  if (!ready.length) return false;
  const buffer = buffers.get(ready[Math.floor(Math.random() * ready.length)])!;
  let rate = 1;
  if (pitches) {
    const semitones = pickPitch(pitches, lastPitch.get(name));
    lastPitch.set(name, semitones);
    rate = 2 ** (semitones / 12);
  }
  const now = audio.currentTime;
  for (const hit of hits) {
    const src = audio.createBufferSource();
    const g = audio.createGain();
    src.buffer = buffer;
    src.playbackRate.value = rate * (jitter ? 1 + (Math.random() * 2 - 1) * jitter : 1);
    g.gain.value = Math.min(1, volume * gain);
    src.connect(g);
    g.connect(audio.destination);
    src.start(now + hit);
  }
  return true;
}

export function playSfx(name: SfxName, volume: number): void {
  if (volume <= 0) return;
  try {
    const audio = getContext();
    if (!audio) return;
    preloadSfx();
    if (playSample(audio, name, volume)) return;
    const now = audio.currentTime;
    for (const tone of SFX_RECIPES[name]) {
      const start = now + (tone.delay ?? 0);
      const end = start + tone.dur;
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = tone.type ?? 'sine';
      osc.frequency.setValueAtTime(tone.freq, start);
      if (tone.slideTo) osc.frequency.exponentialRampToValueAtTime(tone.slideTo, end);
      const peak = Math.max(0.0001, volume * (tone.gain ?? 0.6) * 0.5);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(peak, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start(start);
      osc.stop(end + 0.02);
    }
  } catch {
    // audio is decorative — never break the game over it
  }
}

export function resetSfxForTests(): void {
  ctx = null;
  buffers.clear();
  lastPitch.clear();
  loading = false;
}
