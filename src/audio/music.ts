const MUSIC_URL = `${import.meta.env.BASE_URL}music/bg.mp3`;

let audio: HTMLAudioElement | null = null;

// Resolves true once the track is actually playing, false when it is off or the
// browser blocked it (autoplay policy) — callers retry from a user gesture.
export function setMusicVolume(volume: number): Promise<boolean> {
  if (volume <= 0) {
    audio?.pause();
    return Promise.resolve(false);
  }
  try {
    if (!audio) {
      audio = new Audio(MUSIC_URL);
      audio.loop = true;
    }
    audio.volume = Math.min(1, volume);
    if (!audio.paused) return Promise.resolve(true);
    const played = audio.play();
    // Rejected when autoplay is blocked or the file is missing.
    return played ? played.then(() => true, () => false) : Promise.resolve(true);
  } catch {
    return Promise.resolve(false);
  }
}

export function resetMusicForTests(): void {
  audio = null;
}
