import { DEFAULT_TEXT_LINE_HEIGHT } from '@/constants';

export interface TextMetricsResult {
  width: number;
  height: number;
  lineHeight: number;
}

const MIN_WIDTH_FACTOR = 0.6;
const MIN_HEIGHT_FACTOR = 1;

const getFallbackWidth = (text: string, fontSize: number): number => {
  const safeLength = text.length > 0 ? text.length : 1;
  return safeLength * fontSize * MIN_WIDTH_FACTOR;
};

const ensureContext = (): CanvasRenderingContext2D | null => {
  if (typeof document === 'undefined') {
    return null;
  }
  let canvas = (ensureContext as any).canvas as HTMLCanvasElement | undefined;
  let context = (ensureContext as any).context as CanvasRenderingContext2D | undefined;
  if (!canvas) {
    canvas = document.createElement('canvas');
    context = canvas.getContext('2d') ?? undefined;
    (ensureContext as any).canvas = canvas;
    (ensureContext as any).context = context ?? null;
  }
  return context ?? null;
};

export const buildFontString = (fontSize: number, fontFamily: string, fontWeight?: number): string => {
  const weight = fontWeight ?? 400;
  return `${weight} ${fontSize}px ${fontFamily}`;
};

export const measureTextMetrics = (
  text: string,
  fontSize: number,
  fontFamily: string,
  lineHeight: number = DEFAULT_TEXT_LINE_HEIGHT,
  fontWeight?: number,
): TextMetricsResult => {
  const context = ensureContext();
  const normalizedLineHeight = Number.isFinite(lineHeight) && lineHeight > 0 ? lineHeight : DEFAULT_TEXT_LINE_HEIGHT;
  const effectiveLineHeight = fontSize * normalizedLineHeight;
  const lines = text.replace(/\r/g, '').split('\n');
  const safeLines = lines.length > 0 ? lines : [''];

  let maxWidth = 0;

  if (context) {
    context.font = buildFontString(fontSize, fontFamily, fontWeight);
    for (const line of safeLines) {
      const measured = context.measureText(line || ' ');
      maxWidth = Math.max(maxWidth, measured.width);
    }
  } else {
    for (const line of safeLines) {
      maxWidth = Math.max(maxWidth, getFallbackWidth(line, fontSize));
    }
  }

  const width = Math.max(maxWidth, fontSize * MIN_WIDTH_FACTOR);
  const height = Math.max(effectiveLineHeight * safeLines.length, fontSize * MIN_HEIGHT_FACTOR);

  return { width, height, lineHeight: effectiveLineHeight };
};
