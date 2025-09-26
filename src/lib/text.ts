/**
 * Utility helpers for working with text metrics. Kept DOM free of side effects
 * so the functions can be reused by rendering and export code alike.
 */

import { DEFAULT_TEXT_LINE_HEIGHT } from '@/constants';

export interface TextMeasurementOptions {
  fontSize: number;
  fontFamily: string;
  lineHeight?: number;
}

export interface TextMeasurement {
  width: number;
  height: number;
  baseline: number;
  lineHeight: number;
}

let cachedContext: CanvasRenderingContext2D | null = null;

const getMeasurementContext = (): CanvasRenderingContext2D | null => {
  if (cachedContext) {
    return cachedContext;
  }
  if (typeof document === 'undefined') {
    return null;
  }
  const canvas = document.createElement('canvas');
  cachedContext = canvas.getContext('2d');
  return cachedContext;
};

const fallbackMeasure = (text: string, fontSize: number, lineHeightRatio: number): TextMeasurement => {
  const lines = text.split(/\r?\n/);
  const width = Math.max(...lines.map((line) => line.length)) * fontSize * 0.6;
  const lineHeightPx = fontSize * lineHeightRatio;
  const height = Math.max(lineHeightPx, lines.length * lineHeightPx);
  const baseline = fontSize * 0.8;
  return { width, height, baseline, lineHeight: lineHeightPx };
};

export const measureTextDimensions = (
  text: string,
  { fontSize, fontFamily, lineHeight = DEFAULT_TEXT_LINE_HEIGHT }: TextMeasurementOptions,
): TextMeasurement => {
  const ctx = getMeasurementContext();
  const lineHeightRatio = lineHeight ?? DEFAULT_TEXT_LINE_HEIGHT;
  const lineHeightPx = fontSize * lineHeightRatio;
  if (!ctx) {
    return fallbackMeasure(text, fontSize, lineHeightRatio);
  }

  ctx.font = `${fontSize}px ${fontFamily}`;
  const lines = text.split(/\r?\n/);
  let maxWidth = 0;
  for (const line of lines) {
    const measured = ctx.measureText(line || ' ');
    maxWidth = Math.max(maxWidth, measured.width);
  }
  const height = Math.max(lineHeightPx, lines.length * lineHeightPx);
  const baseline = fontSize * 0.8;
  return { width: maxWidth, height, baseline, lineHeight: lineHeightPx };
};
