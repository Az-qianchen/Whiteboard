import type { Frame } from '@/types';

/**
 * Create a stable signature representing the current whiteboard document.
 *
 * @param frames - All frames in the document.
 * @param backgroundColor - Current canvas background color.
 * @param fps - Current playback speed.
 * @returns Serialized signature string for change detection.
 */
export const createDocumentSignature = (frames: Frame[], backgroundColor: string, fps: number): string => {
  return JSON.stringify({ frames, backgroundColor, fps });
};
