/**
 * Utility helpers for measuring and normalizing text metrics.
 */
import { DEFAULT_TEXT_PADDING_X, DEFAULT_TEXT_PADDING_Y, MIN_TEXT_BOX_WIDTH } from '@/constants';

let measureCanvas: HTMLCanvasElement | null = null;
let measureContext: CanvasRenderingContext2D | null = null;

const getContext = (): CanvasRenderingContext2D | null => {
  if (typeof document === 'undefined') {
    return null;
  }
  if (!measureCanvas) {
    measureCanvas = document.createElement('canvas');
    measureContext = measureCanvas.getContext('2d');
  }
  return measureContext;
};

const approximateWidth = (text: string, fontSize: number): number => {
  if (!text.length) return fontSize * 0.6;
  const averageCharWidth = fontSize * 0.6;
  return text.length * averageCharWidth;
};

export interface MeasureTextOptions {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  paddingX?: number;
  paddingY?: number;
  minWidth?: number;
}

export interface TextDimensions {
  width: number;
  height: number;
  lineCount: number;
  lineHeightPx: number;
  maxLineWidth: number;
}

export const measureTextDimensions = (
  text: string,
  {
    fontFamily,
    fontSize,
    lineHeight,
    paddingX = DEFAULT_TEXT_PADDING_X,
    paddingY = DEFAULT_TEXT_PADDING_Y,
    minWidth = MIN_TEXT_BOX_WIDTH,
  }: MeasureTextOptions,
): TextDimensions => {
  const lines = text.split(/\r?\n/);
  const context = getContext();
  if (context) {
    context.font = `${fontSize}px ${fontFamily}`;
  }

  let maxLineWidth = 0;
  for (const line of lines) {
    let width = 0;
    if (context) {
      width = context.measureText(line || '\u200B').width;
    } else {
      width = approximateWidth(line, fontSize);
    }
    if (width > maxLineWidth) {
      maxLineWidth = width;
    }
  }

  const lineCount = Math.max(lines.length, 1);
  const lineHeightPx = fontSize * lineHeight;
  const contentHeight = lineCount * lineHeightPx;
  const contentWidth = Math.max(maxLineWidth, minWidth - paddingX * 2);

  const width = Math.max(minWidth, contentWidth + paddingX * 2);
  const height = contentHeight + paddingY * 2;

  return { width, height, lineCount, lineHeightPx, maxLineWidth: contentWidth };
};
