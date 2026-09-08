/**
 * SMPTE Timecode Utilities (24 FPS Non-Drop Frame)
 */

export const FPS = 24;

/**
 * Parses timecode string (HH:MM:SS:FF) into total seconds.
 */
export function timecodeToSeconds(timecode: string): number {
  if (!timecode) return 0;
  const parts = timecode.split(":");
  if (parts.length !== 4) return 0;

  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  const seconds = parseInt(parts[2], 10) || 0;
  const frames = parseInt(parts[3], 10) || 0;

  const totalFrames = ((hours * 3600 + minutes * 60 + seconds) * FPS) + frames;
  return totalFrames / FPS;
}

/**
 * Converts total seconds to SMPTE timecode (HH:MM:SS:FF).
 */
export function secondsToTimecode(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds < 0) return "00:00:00:00";

  const totalFrames = Math.round(totalSeconds * FPS);
  const frames = totalFrames % FPS;
  const allSeconds = Math.floor(totalFrames / FPS);
  
  const seconds = allSeconds % 60;
  const allMinutes = Math.floor(allSeconds / 60);
  
  const minutes = allMinutes % 60;
  const hours = Math.floor(allMinutes / 60);

  const pad = (n: number) => String(n).padStart(2, "0");

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}:${pad(frames)}`;
}

/**
 * Formats seconds into a human-readable visual duration (e.g. 1.2s or 05:12)
 */
export function formatDuration(seconds: number): string {
  return `${seconds.toFixed(2)}s`;
}
