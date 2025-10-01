import type { TextData } from '@/types';

const measurementCanvas: HTMLCanvasElement | null = typeof document !== 'undefined' ? document.createElement('canvas') : null;
const measurementContext = measurementCanvas ? measurementCanvas.getContext('2d') : null;

const ensureContext = (fontSize: number, fontFamily: string): CanvasRenderingContext2D | null => {
  if (!measurementContext) return null;
  measurementContext.font = `${fontSize}px ${fontFamily}`;
  return measurementContext;
};

export const TEXT_PADDING = 8;

const normalizeText = (text: string): string => text.replace(/\r\n/g, '\n');

const breakToken = (
  token: string,
  maxWidth: number,
  fontSize: number,
  fontFamily: string,
  ctx: CanvasRenderingContext2D,
): string[] => {
  if (maxWidth <= 0) return [token];
  const result: string[] = [];
  let current = '';
  for (const char of token) {
    const next = current + char;
    if (ctx.measureText(next).width > maxWidth && current) {
      result.push(current);
      current = char.trimStart();
    } else {
      current = next;
    }
  }
  if (current) {
    result.push(current);
  }
  return result.length > 0 ? result : [''];
};

export const layoutText = (
  text: string,
  maxWidth: number,
  fontSize: number,
  fontFamily: string,
): string[] => {
  const ctx = ensureContext(fontSize, fontFamily);
  const normalized = normalizeText(text);
  if (!ctx) {
    return normalized.split('\n');
  }

  const lines: string[] = [];
  const paragraphs = normalized.split('\n');

  paragraphs.forEach((paragraph, paragraphIndex) => {
    if (paragraph.length === 0) {
      lines.push('');
      return;
    }

    const segments = paragraph.match(/(\s+|\S+)/g) ?? [''];
    let currentLine = '';

    segments.forEach(segment => {
      const tentative = currentLine + segment;
      if (maxWidth > 0 && ctx.measureText(tentative).width > maxWidth && currentLine.trim().length > 0) {
        lines.push(currentLine.trimEnd());
        const trimmedSegment = segment.trimStart();
        if (trimmedSegment.length === 0) {
          currentLine = '';
          return;
        }
        const broken = breakToken(trimmedSegment, maxWidth, fontSize, fontFamily, ctx);
        broken.forEach((piece, index) => {
          if (index === broken.length - 1) {
            currentLine = piece;
          } else {
            lines.push(piece.trimEnd());
          }
        });
      } else if (maxWidth > 0 && ctx.measureText(tentative).width > maxWidth) {
        const broken = breakToken(segment.trim(), maxWidth, fontSize, fontFamily, ctx);
        broken.forEach((piece, index) => {
          if (index === 0) {
            lines.push(piece.trimEnd());
          } else if (index === broken.length - 1) {
            currentLine = piece;
          } else {
            lines.push(piece.trimEnd());
          }
        });
        if (broken.length === 0) {
          currentLine = '';
        }
      } else {
        currentLine = tentative;
      }
    });

    lines.push(currentLine.trimEnd());
    if (paragraphIndex === paragraphs.length - 1 && normalized.endsWith('\n')) {
      lines.push('');
    }
  });

  return lines;
};

export const computeTextHeight = (
  lines: string[],
  fontSize: number,
  lineHeight: number,
): number => {
  if (lines.length === 0) return fontSize * lineHeight;
  return Math.max(fontSize * lineHeight * lines.length, fontSize * lineHeight);
};

export const measureTextContent = (
  text: string,
  data: Pick<TextData, 'fontSize' | 'fontFamily' | 'lineHeight' | 'width'>,
) => {
  const contentWidth = Math.max(0, data.width - TEXT_PADDING * 2);
  const lines = layoutText(text, contentWidth, data.fontSize, data.fontFamily);
  const height = computeTextHeight(lines, data.fontSize, data.lineHeight) + TEXT_PADDING * 2;
  return { lines, height };
};
