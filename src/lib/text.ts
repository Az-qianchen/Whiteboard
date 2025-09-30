/**
 * Text measurement utilities shared between the text tool and layout logic.
 */

export interface TextBlockMetrics {
  width: number;
  height: number;
  lineCount: number;
}

let measurementCanvas: HTMLCanvasElement | null = null;

const ensureContext = (): CanvasRenderingContext2D | null => {
  if (typeof document === 'undefined') {
    return null;
  }
  if (!measurementCanvas) {
    measurementCanvas = document.createElement('canvas');
  }
  return measurementCanvas.getContext('2d');
};

const FALLBACK_CHAR_WIDTH_RATIO = 0.6;

export const splitTextIntoLines = (text: string): string[] => {
  if (!text) {
    return [''];
  }
  return text.replace(/\r\n?/g, '\n').split('\n');
};

export const measureTextBlock = (
  text: string,
  fontSize: number,
  fontFamily: string,
  lineHeight: number,
): TextBlockMetrics => {
  const lines = splitTextIntoLines(text);
  const ctx = ensureContext();
  if (!ctx) {
    const fallbackWidth = Math.max(...lines.map(line => line.length)) * fontSize * FALLBACK_CHAR_WIDTH_RATIO;
    const fallbackHeight = Math.max(1, lines.length) * fontSize * lineHeight;
    return { width: fallbackWidth, height: fallbackHeight, lineCount: Math.max(1, lines.length) };
  }

  ctx.font = `${fontSize}px ${fontFamily}`;
  let maxWidth = 0;
  for (const line of lines) {
    const metrics = ctx.measureText(line || ' ');
    if (metrics.width > maxWidth) {
      maxWidth = metrics.width;
    }
  }

  const effectiveLineCount = Math.max(1, lines.length);
  const height = effectiveLineCount * fontSize * lineHeight;
  return { width: maxWidth, height, lineCount: effectiveLineCount };
};
