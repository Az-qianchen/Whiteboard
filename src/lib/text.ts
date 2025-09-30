/**
 * Utilities for working with text metrics and default typography values.
 */

export const DEFAULT_FONT_FAMILY = 'Inter, system-ui, sans-serif';
export const DEFAULT_FONT_SIZE = 32;
export const DEFAULT_TEXT_LINE_HEIGHT = 1.25;

let measureCanvas: HTMLCanvasElement | null = null;
let measureContext: CanvasRenderingContext2D | null = null;

const ensureMeasureContext = (): CanvasRenderingContext2D | null => {
  if (measureContext) {
    return measureContext;
  }
  measureCanvas = document.createElement('canvas');
  measureContext = measureCanvas.getContext('2d');
  return measureContext;
};

export const buildFontString = (fontSize: number, fontFamily: string): string => {
  const trimmedFamily = fontFamily && fontFamily.trim().length > 0
    ? fontFamily
    : DEFAULT_FONT_FAMILY;
  return `${Math.max(fontSize, 1)}px ${trimmedFamily}`;
};

export const measureTextWidth = (text: string, font: string): number => {
  const context = ensureMeasureContext();
  if (!context) {
    return text.length * 7;
  }
  context.font = font;
  return context.measureText(text).width;
};

export interface TextMetricsResult {
  width: number;
  height: number;
  lineCount: number;
}

export const measureTextMetrics = (
  text: string,
  fontSize: number,
  fontFamily: string,
  lineHeight: number = DEFAULT_TEXT_LINE_HEIGHT,
): TextMetricsResult => {
  const normalizedText = text.replace(/\r\n/g, '\n');
  const lines = normalizedText.split('\n');
  const font = buildFontString(fontSize, fontFamily);
  const widestLine = lines.reduce((max, line) => {
    const width = measureTextWidth(line || ' ', font);
    return Math.max(max, width);
  }, 0);

  const totalHeight = Math.max(lines.length, 1) * fontSize * lineHeight;

  return {
    width: widestLine,
    height: totalHeight,
    lineCount: Math.max(lines.length, 1),
  };
};

