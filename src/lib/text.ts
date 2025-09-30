import { TextData } from '@/types';

let canvas: HTMLCanvasElement | null = null;
let context: CanvasRenderingContext2D | null = null;

const ensureContext = () => {
  if (typeof document === 'undefined') {
    return null;
  }
  if (!canvas) {
    canvas = document.createElement('canvas');
    context = canvas.getContext('2d');
  }
  return context;
};

export const DEFAULT_TEXT_FONT_FAMILY = 'Inter, "Segoe UI", system-ui, sans-serif';
export const DEFAULT_TEXT_FONT_SIZE = 24;
export const DEFAULT_TEXT_LINE_HEIGHT = 1.25;
const APPROX_CHARACTER_WIDTH = 0.6;

const buildFontString = (fontSize: number, fontFamily: string) => `${fontSize}px ${fontFamily}`;

const approximateWidth = (text: string, fontSize: number) => {
  const longestLine = text.split(/\r?\n/).reduce((acc, line) => Math.max(acc, line.length), 0);
  return Math.max(1, longestLine * fontSize * APPROX_CHARACTER_WIDTH);
};

export interface TextBounds {
  width: number;
  height: number;
  lineCount: number;
  lineHeightPx: number;
}

export const measureTextBounds = (
  text: string,
  fontSize: number,
  fontFamily: string,
  lineHeight: number,
): TextBounds => {
  const lines = text.split(/\r?\n/);
  const ctx = ensureContext();
  if (!ctx) {
    const width = approximateWidth(text, fontSize);
    const height = Math.max(fontSize, lines.length * fontSize * lineHeight);
    return { width, height, lineCount: lines.length, lineHeightPx: fontSize * lineHeight };
  }

  ctx.font = buildFontString(fontSize, fontFamily);
  const lineWidths = lines.map(line => ctx.measureText(line || '\u200B').width);
  const width = Math.max(...lineWidths, 1);
  const lineHeightPx = fontSize * lineHeight;
  const height = Math.max(fontSize, lines.length * lineHeightPx);
  return { width, height, lineCount: lines.length, lineHeightPx };
};

export const getTextAnchorX = (data: Pick<TextData, 'x' | 'width' | 'textAlign'>): number => {
  switch (data.textAlign) {
    case 'center':
      return data.x + data.width / 2;
    case 'right':
      return data.x + data.width;
    case 'left':
    default:
      return data.x;
  }
};

