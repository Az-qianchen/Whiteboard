/**
 * Utilities for measuring and normalizing text blocks on the canvas.
 */

const DEFAULT_LINE_HEIGHT_RATIO = 1.35;
const DEFAULT_MIN_WIDTH = 120;

let measureCanvas: HTMLCanvasElement | null = null;
let measureContext: CanvasRenderingContext2D | null = null;

const ensureContext = (): CanvasRenderingContext2D | null => {
  if (typeof document === 'undefined') {
    return null;
  }
  if (!measureCanvas) {
    measureCanvas = document.createElement('canvas');
  }
  if (!measureContext) {
    measureContext = measureCanvas.getContext('2d');
  }
  return measureContext;
};

const sanitizeLine = (line: string): string => (line.length === 0 ? ' ' : line);

export interface TextBlockMetrics {
  width: number;
  height: number;
  lines: string[];
}

export interface NormalizedTextOptions {
  fontFamily: string;
  fontSize: number;
  lineHeight?: number;
  minWidth?: number;
}

export const DEFAULT_TEXT_OPTIONS: Required<Omit<NormalizedTextOptions, 'lineHeight' | 'minWidth'>> & {
  lineHeight: number;
  minWidth: number;
} = {
  fontFamily: 'Excalifont, "Segoe UI", sans-serif',
  fontSize: 32,
  lineHeight: 32 * DEFAULT_LINE_HEIGHT_RATIO,
  minWidth: DEFAULT_MIN_WIDTH,
};

export const computeLineHeight = (fontSize: number, lineHeight?: number): number =>
  lineHeight ?? fontSize * DEFAULT_LINE_HEIGHT_RATIO;

const getFontString = (fontSize: number, fontFamily: string): string => `${fontSize}px ${fontFamily}`;

export const measureTextBlock = (
  text: string,
  { fontFamily, fontSize, lineHeight, minWidth }: NormalizedTextOptions,
): TextBlockMetrics => {
  const ctx = ensureContext();
  const lines = text.split(/\r?\n/).map(sanitizeLine);
  const resolvedLineHeight = computeLineHeight(fontSize, lineHeight);

  if (!ctx) {
    const widthFallback = Math.max(minWidth ?? DEFAULT_MIN_WIDTH, fontSize * 0.6 * Math.max(1, ...lines.map(line => line.length)));
    return {
      width: widthFallback,
      height: lines.length * resolvedLineHeight,
      lines,
    };
  }

  ctx.font = getFontString(fontSize, fontFamily);
  let maxWidth = 0;
  for (const line of lines) {
    const measurement = ctx.measureText(line);
    maxWidth = Math.max(maxWidth, measurement.width);
  }

  const min = minWidth ?? DEFAULT_MIN_WIDTH;
  const width = Math.max(maxWidth, min);
  const height = Math.max(resolvedLineHeight, lines.length * resolvedLineHeight);

  return {
    width,
    height,
    lines,
  };
};

export const normalizeTextContent = (
  text: string,
  options: NormalizedTextOptions,
): { metrics: TextBlockMetrics; options: Required<NormalizedTextOptions> } => {
  const normalized: Required<NormalizedTextOptions> = {
    fontFamily: options.fontFamily,
    fontSize: options.fontSize,
    lineHeight: computeLineHeight(options.fontSize, options.lineHeight),
    minWidth: options.minWidth ?? DEFAULT_MIN_WIDTH,
  };

  const metrics = measureTextBlock(text, normalized);

  return { metrics, options: normalized };
};

export const DEFAULTS = {
  FONT_FAMILY: DEFAULT_TEXT_OPTIONS.fontFamily,
  FONT_SIZE: DEFAULT_TEXT_OPTIONS.fontSize,
  LINE_HEIGHT: DEFAULT_TEXT_OPTIONS.lineHeight,
  MIN_WIDTH: DEFAULT_TEXT_OPTIONS.minWidth,
};
