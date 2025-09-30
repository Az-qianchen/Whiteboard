/**
 * Create a stable signature representing the current whiteboard document.
 *
 * @param revision - Incrementing revision number for frame mutations.
 * @param backgroundColor - Current canvas background color.
 * @param fps - Current playback speed.
 * @returns Serialized signature string for change detection.
 */
export const createDocumentSignature = (revision: number, backgroundColor: string, fps: number): string => {
  return `${revision}:${backgroundColor}:${fps}`;
};
