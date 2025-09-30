/**
 * Utility helpers for text measurement and layout.
 */
import type { TextAlignment } from '@/types';

interface TextMetricsResult {
  width: number;
  height: number;
  baseline: number;
}

const MEASUREMENT_CANVAS = typeof document !== 'undefined'
  ? document.createElement('canvas')
  : null;

const FALLBACK_FONT = '16px sans-serif';

const getContext = (): CanvasRenderingContext2D | null => {
  if (!MEASUREMENT_CANVAS) {
    return null;
  }
  const context = MEASUREMENT_CANVAS.getContext('2d');
  if (!context) {
    return null;
  }
  return context;
};

const sanitizeLine = (line: string): string => (line.length > 0 ? line : ' ');

/**
 * Measure the dimensions of a block of text rendered with the given font options.
 */
export const measureTextDimensions = (
  text: string,
  {
    fontSize,
    fontFamily,
    lineHeight,
  }: {
    fontSize: number;
    fontFamily: string;
    lineHeight: number;
  },
): TextMetricsResult => {
  const context = getContext();
  const lines = text.split('\n');

  if (!context) {
    const fallbackHeight = Math.max(fontSize, 1) * Math.max(lineHeight, 1);
    return {
      width: Math.max(fontSize * 0.6, 1),
      height: Math.max(fallbackHeight * lines.length, fallbackHeight),
      baseline: fontSize * 0.8,
    };
  }

  context.font = `${fontSize}px ${fontFamily}`;
  context.textBaseline = 'alphabetic';

  let maxWidth = 0;
  let maxAscent = 0;
  let maxDescent = 0;

  for (const rawLine of lines) {
    const line = sanitizeLine(rawLine);
    const metrics = context.measureText(line);
    maxWidth = Math.max(maxWidth, metrics.width);
    const ascent = metrics.actualBoundingBoxAscent ?? fontSize * 0.8;
    const descent = metrics.actualBoundingBoxDescent ?? fontSize * 0.2;
    maxAscent = Math.max(maxAscent, ascent);
    maxDescent = Math.max(maxDescent, descent);
  }

  const lineHeightPx = fontSize * lineHeight;
  const height = Math.max(lineHeightPx, maxAscent + maxDescent);
  const totalHeight = lines.length > 0 ? height + (lines.length - 1) * lineHeightPx : height;

  return {
    width: Math.max(maxWidth, 1),
    height: Math.max(totalHeight, 1),
    baseline: Math.min(height, maxAscent),
  };
};

/**
 * Map text alignment to SVG text-anchor attribute values.
 */
export const textAlignmentToAnchor = (alignment: TextAlignment): 'start' | 'middle' | 'end' => {
  switch (alignment) {
    case 'center':
      return 'middle';
    case 'right':
      return 'end';
    case 'left':
    default:
      return 'start';
  }
};

/**
 * Build the CSS font string for the textarea editor so the preview matches the canvas.
 */
export const buildFontString = (
  fontSize: number,
  fontFamily: string,
): string => `${fontSize}px ${fontFamily}` || FALLBACK_FONT;
