import type { AnyPath, TextElement, WhiteboardData } from '@/types';

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

const normalizeTextElement = (path: AnyPath): AnyPath => {
  if (path.tool !== 'text') {
    return path;
  }

  const textPath = path as TextElement;
  return {
    ...textPath,
    type: 'text',
    lineHeight: textPath.lineHeight ?? 1.2,
    letterSpacing: textPath.letterSpacing ?? 0,
    align: textPath.align ?? textPath.textAlign ?? 'left',
  };
};

export const normalizeDocumentForRead = (doc: WhiteboardData): WhiteboardData => {
  if (Array.isArray(doc.frames)) {
    return {
      ...doc,
      frames: doc.frames.map((frame) => ({
        ...frame,
        paths: frame.paths.map((path) => normalizeTextElement(path)),
      })),
    };
  }

  if (Array.isArray(doc.paths)) {
    return {
      ...doc,
      paths: doc.paths.map((path) => normalizeTextElement(path)),
    };
  }

  return doc;
};

export const normalizeDocumentForWrite = (doc: WhiteboardData): WhiteboardData => {
  return normalizeDocumentForRead(doc);
};
