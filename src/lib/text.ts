import type { TextData } from '@/types';

export const MIN_TEXT_WIDTH = 40;

const getCanvasContext = (): CanvasRenderingContext2D | null => {
  if (typeof document === 'undefined') return null;
  const existing = (getCanvasContext as unknown as { canvas?: HTMLCanvasElement }).canvas;
  if (existing) {
    return existing.getContext('2d');
  }
  const canvas = document.createElement('canvas');
  (getCanvasContext as unknown as { canvas?: HTMLCanvasElement }).canvas = canvas;
  return canvas.getContext('2d');
};

const measureText = (text: string, font: string): number => {
  const ctx = getCanvasContext();
  if (!ctx) {
    return text.length * 0.6 * parseFloat(font) || text.length * 10;
  }
  ctx.font = font;
  return ctx.measureText(text).width;
};

export interface TextLayoutInput {
  text: string;
  width: number;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
}

export interface TextLayoutResult {
  lines: string[];
  height: number;
  width: number;
}

const breakToken = (token: string, maxWidth: number, font: string): string[] => {
  if (!token) return [''];
  const result: string[] = [];
  let current = '';
  for (const char of token) {
    const candidate = current + char;
    const width = measureText(candidate, font);
    if (width <= maxWidth || current === '') {
      current = candidate;
    } else {
      result.push(current);
      current = char;
    }
  }
  if (current) {
    result.push(current);
  }
  return result;
};

export const sanitizeText = (value: string): string => value.replace(/\r\n?/g, '\n');

export const layoutText = ({ text, width, fontFamily, fontSize, lineHeight }: TextLayoutInput): TextLayoutResult => {
  const safeWidth = Math.max(width, MIN_TEXT_WIDTH);
  const font = `${fontSize}px ${fontFamily}`;
  const paragraphs = sanitizeText(text).split('\n');
  const lines: string[] = [];
  let maxMeasuredWidth = 0;

  paragraphs.forEach((paragraph, index) => {
    if (paragraph.length === 0) {
      lines.push('');
      return;
    }
    const tokens = paragraph.match(/(\s+|\S+)/g) ?? [''];
    let line = '';

    tokens.forEach(token => {
      const candidate = line + token;
      const measured = measureText(candidate, font);
      if (measured <= safeWidth || line === '') {
        line = candidate;
        maxMeasuredWidth = Math.max(maxMeasuredWidth, measured);
        return;
      }

      const trimmedLine = line.trimEnd();
      if (trimmedLine.length > 0) {
        lines.push(trimmedLine);
      }

      const nextToken = token.trimStart();
      const tokenWidth = measureText(nextToken, font);
      if (nextToken && tokenWidth > safeWidth) {
        const pieces = breakToken(nextToken, safeWidth, font);
        pieces.forEach((piece, idx) => {
          if (idx < pieces.length - 1) {
            lines.push(piece);
          } else {
            line = piece;
            maxMeasuredWidth = Math.max(maxMeasuredWidth, measureText(piece, font));
          }
        });
      } else {
        line = nextToken;
        maxMeasuredWidth = Math.max(maxMeasuredWidth, measureText(line, font));
      }
    });

    lines.push(line.trimEnd());

    if (index < paragraphs.length - 1 && paragraph.length === 0) {
      lines.push('');
    }
  });

  if (lines.length === 0) {
    lines.push('');
  }

  const computedHeight = Math.max(lines.length, 1) * fontSize * lineHeight;

  return {
    lines,
    height: Math.max(computedHeight, fontSize * lineHeight),
    width: Math.max(safeWidth, maxMeasuredWidth),
  };
};

export const applyTextLayoutToPath = (path: TextData): TextData => {
  const layout = layoutText({
    text: path.text,
    width: path.width,
    fontFamily: path.fontFamily,
    fontSize: path.fontSize,
    lineHeight: path.lineHeight,
  });
  return {
    ...path,
    width: Math.max(path.width, MIN_TEXT_WIDTH),
    height: layout.height,
  };
};
