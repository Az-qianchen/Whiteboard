import type { TextData } from '@/types';

let measureCanvas: HTMLCanvasElement | null = null;
let measureContext: CanvasRenderingContext2D | null = null;

const ensureMeasureContext = (): CanvasRenderingContext2D | null => {
  if (typeof document === 'undefined') {
    return null;
  }
  if (!measureCanvas) {
    measureCanvas = document.createElement('canvas');
    measureContext = measureCanvas.getContext('2d');
  }
  return measureContext;
};

export interface TextMetricsOptions {
  fontFamily: string;
  fontSize: number;
  lineHeight?: number;
}

export interface MeasuredTextSize {
  width: number;
  height: number;
  lineHeight: number;
}

const FALLBACK_CHAR_WIDTH = 0.6;

export const measureTextSize = (text: string, options: TextMetricsOptions): MeasuredTextSize => {
  const { fontFamily, fontSize } = options;
  const lineHeightRatio = options.lineHeight ?? 1.25;
  const effectiveFontSize = Math.max(1, fontSize);
  const lines = text.split(/\r?\n/);
  const ctx = ensureMeasureContext();
  let maxWidth = 0;

  if (ctx) {
    ctx.font = `${effectiveFontSize}px ${fontFamily}`;
    maxWidth = lines.reduce((width, line) => {
      const content = line.length === 0 ? ' ' : line;
      const metrics = ctx.measureText(content);
      return Math.max(width, metrics.width);
    }, 0);
  }

  if (!ctx || maxWidth === 0) {
    maxWidth = lines.reduce((width, line) => {
      const contentLength = line.length === 0 ? 1 : line.length;
      return Math.max(width, contentLength * effectiveFontSize * FALLBACK_CHAR_WIDTH);
    }, effectiveFontSize * FALLBACK_CHAR_WIDTH);
  }

  const lineHeight = lineHeightRatio * effectiveFontSize;
  const totalHeight = Math.max(lineHeight, lines.length * lineHeight);

  return {
    width: maxWidth,
    height: totalHeight,
    lineHeight,
  };
};

export const getTextAnchorX = (text: TextData): number => {
  switch (text.textAlign) {
    case 'center':
      return text.x + text.width / 2;
    case 'right':
      return text.x + text.width;
    case 'left':
    default:
      return text.x;
  }
};
