export type SfxName = 'tick' | 'stop' | 'card' | 'correct' | 'skip' | 'timeUp' | 'countdown' | 'tap';

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
};

let ctx: AudioContext | null = null;

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

export function playSfx(name: SfxName, volume: number): void {
  if (volume <= 0) return;
  try {
    const audio = getContext();
    if (!audio) return;
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
}
