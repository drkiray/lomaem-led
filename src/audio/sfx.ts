export type SfxName = 'tick' | 'card' | 'correct' | 'skip' | 'timeUp' | 'countdown' | 'tap' | 'toggle' | 'select' | 'back';

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

// Recorded samples (public/sfx; see CREDITS.md). Several files for one name are
// picked at random; `hits` replays the sample at offsets (s), each optionally
// re-pitched by `hitPitches` (semitones) — that's how one kalimba note becomes a melody.
// Until a sample is decoded — or if it fails to load — the synth recipe plays.
interface Sample {
  files: string[];
  gain: number;
  jitter?: number; // ± random playback-rate spread, keeps rapid repeats from sounding mechanical
  pitches?: number[]; // semitone offsets; one is picked per play (never the same twice in a row)
  hits?: number[];
  hitPitches?: number[]; // semitones per hit (same order as `hits`)
}

export const SFX_SAMPLES: Record<SfxName, Sample> = {
  tick: { files: ['spin-tick'], gain: 0.5, jitter: 0.08 },
  card: { files: ['card'], gain: 0.7 },
  // kalimba arpeggio C–E–G going up: «угадали»
  correct: { files: ['select'], gain: 0.8, hits: [0, 0.09, 0.18], hitPitches: [0, 4, 7] },
  // soft low wood knock: «пропуск»
  skip: { files: ['toggle'], gain: 0.9, hitPitches: [-7] },
  // kalimba phrase falling G–E–C–G(low): «время вышло»
  timeUp: { files: ['select'], gain: 1, hits: [0, 0.3, 0.6, 0.95], hitPitches: [7, 4, 0, -5] },
  // quiet wood tick: 3-2-1
  countdown: { files: ['toggle'], gain: 0.7, hitPitches: [-2] },
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

// Maps a horizontal position (0 = left edge, 1 = right edge) onto the scale:
// left is the highest note, right the lowest, like a kalimba laid out in front of you.
export function pitchAt(pitches: number[], position: number): number {
  const sorted = [...pitches].sort((a, b) => b - a);
  const clamped = Math.min(1, Math.max(0, position));
  return sorted[Math.min(sorted.length - 1, Math.floor(clamped * sorted.length))];
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
    const unique = new Set(Object.values(SFX_SAMPLES).flatMap((sample) => sample.files));
    for (const file of unique) {
      fetch(SAMPLE_URL(file))
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
        .then((data) => audio.decodeAudioData(data))
        .then((buf) => void buffers.set(file, buf))
        .catch(() => {}); // missing file → synth fallback
    }
  } catch {
    loading = false;
  }
}

function playSample(audio: AudioContext, name: SfxName, volume: number, position?: number): boolean {
  const { files, gain, jitter, pitches, hits = [0], hitPitches } = SFX_SAMPLES[name];
  const ready = files.filter((f) => buffers.has(f));
  if (!ready.length) return false;
  const buffer = buffers.get(ready[Math.floor(Math.random() * ready.length)])!;
  let rate = 1;
  if (pitches) {
    const semitones = position === undefined ? pickPitch(pitches, lastPitch.get(name)) : pitchAt(pitches, position);
    lastPitch.set(name, semitones);
    rate = 2 ** (semitones / 12);
  }
  const now = audio.currentTime;
  hits.forEach((hit, i) => {
    const src = audio.createBufferSource();
    const g = audio.createGain();
    src.buffer = buffer;
    src.playbackRate.value = rate * 2 ** ((hitPitches?.[i] ?? 0) / 12) * (jitter ? 1 + (Math.random() * 2 - 1) * jitter : 1);
    g.gain.value = Math.min(1, volume * gain);
    src.connect(g);
    g.connect(audio.destination);
    src.start(now + hit);
  });
  return true;
}

// `position` (0–1 across the pressed control) picks the note for pitched sounds; omitted → random.
export function playSfx(name: SfxName, volume: number, position?: number): void {
  if (volume <= 0) return;
  try {
    const audio = getContext();
    if (!audio) return;
    preloadSfx();
    if (playSample(audio, name, volume, position)) return;
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
