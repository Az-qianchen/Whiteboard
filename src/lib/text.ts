/**
 * Helpers for measuring and working with text elements on the canvas.
 */

export const DEFAULT_TEXT_LINE_HEIGHT = 1.25;

type MeasurementContextGetter = (() => CanvasRenderingContext2D | null) & {
  cache: CanvasRenderingContext2D | null;
};

const getMeasurementContext: MeasurementContextGetter = (() => {
  if (typeof document === 'undefined') {
    return null;
  }
  const existing = getMeasurementContext.cache;
  if (existing) {
    return existing;
  }
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (context) {
    getMeasurementContext.cache = context;
  }
  return context;
}) as MeasurementContextGetter;

getMeasurementContext.cache = null;

const FALLBACK_CHAR_WIDTH_RATIO = 0.6;

const splitLines = (text: string): string[] => {
  if (text.length === 0) {
    return [''];
  }
  return text.replace(/\r\n/g, '\n').split('\n');
};

export const measureTextDimensions = (
  text: string,
  fontFamily: string,
  fontSize: number,
  lineHeight: number = DEFAULT_TEXT_LINE_HEIGHT,
) => {
  const lines = splitLines(text);
  const context = getMeasurementContext();
  let maxWidth = 0;

  if (context) {
    context.font = `${fontSize}px ${fontFamily}`;
    maxWidth = lines.reduce((acc, line) => {
      const metrics = context.measureText(line || ' ');
      return Math.max(acc, metrics.width);
    }, 0);
  } else {
    maxWidth = lines.reduce((acc, line) => {
      const estimated = (line.length || 1) * fontSize * FALLBACK_CHAR_WIDTH_RATIO;
      return Math.max(acc, estimated);
    }, 0);
  }

  const totalLines = Math.max(1, lines.length);
  const height = totalLines * fontSize * lineHeight;

  return {
    width: maxWidth,
    height,
    lines,
    lineHeightPx: fontSize * lineHeight,
  };
};

