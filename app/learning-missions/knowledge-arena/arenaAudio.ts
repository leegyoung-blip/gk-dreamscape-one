"use client";

export type ArenaSoundName = "blaster" | "hurt";

const SOUND_PATHS: Record<ArenaSoundName, string> = {
  blaster: "/activities/learning-missions/knowledge-arena/audio/nova-blaster.wav",
  hurt: "/activities/learning-missions/knowledge-arena/audio/nova-hurt.wav",
};

export function playArenaSound(
  sound: ArenaSoundName,
  masterVolume: number,
  muted: boolean,
  gain = 1,
) {
  if (typeof window === "undefined" || muted || masterVolume <= 0) return;

  const audio = new Audio(SOUND_PATHS[sound]);
  audio.preload = "auto";
  audio.volume = Math.max(0, Math.min(1, (masterVolume / 100) * gain));

  void audio.play().catch(() => {
    // Browsers can reject playback before the first user gesture.
  });
}
