const MUSIC_URL = `${import.meta.env.BASE_URL}music/bg.mp3`;

let audio: HTMLAudioElement | null = null;

export function setMusicVolume(volume: number): void {
  if (volume <= 0) {
    audio?.pause();
    return;
  }
  try {
    if (!audio) {
      audio = new Audio(MUSIC_URL);
      audio.loop = true;
    }
    audio.volume = Math.min(1, volume);
    if (audio.paused) {
      const played = audio.play();
      // Rejected when autoplay is blocked (retried on next tap) or the file is missing.
      if (played) played.catch(() => {});
    }
  } catch {
    // ignore
  }
}

export function resetMusicForTests(): void {
  audio = null;
}
