import { DEFAULT_TEXT_LINE_HEIGHT } from '@/constants';

export const resolveLineHeight = (fontSize: number, rawLineHeight?: number): number => {
  if (!Number.isFinite(rawLineHeight) || rawLineHeight === undefined || rawLineHeight <= 0) {
    return fontSize * DEFAULT_TEXT_LINE_HEIGHT;
  }

  if (rawLineHeight > 0 && rawLineHeight <= 10) {
    return fontSize * rawLineHeight;
  }

  return rawLineHeight;
};

export interface TextLeading {
  top: number;
  bottom: number;
}

export interface TextMetricsResult {
  width: number;
  height: number;
  lineHeight: number;
  leading: TextLeading;
}

export interface TextLayoutResult extends TextMetricsResult {
  lines: string[];
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

interface GlyphMetrics {
  ascent: number;
  descent: number;
  height: number;
}

const measureGlyphMetrics = (
  context: CanvasRenderingContext2D | null,
  fontSize: number,
): GlyphMetrics => {
  if (context) {
    const metrics = context.measureText('Hg');
    const ascent = metrics.actualBoundingBoxAscent ?? 0;
    const descent = metrics.actualBoundingBoxDescent ?? 0;
    const height = ascent + descent;

    if (height > 0) {
      return { ascent, descent, height };
    }
  }

  const fallbackAscent = fontSize * 0.8;
  const fallbackDescent = fontSize * 0.2;
  return {
    ascent: fallbackAscent,
    descent: fallbackDescent,
    height: fallbackAscent + fallbackDescent,
  };
};

const measureLineWidth = (
  context: CanvasRenderingContext2D | null,
  value: string,
  fontSize: number,
): number => {
  if (context) {
    const content = value.length > 0 ? value : ' ';
    return context.measureText(content).width;
  }
  return getFallbackWidth(value, fontSize);
};

const trimLineEnd = (value: string): string => {
  if (value.length === 0) {
    return '';
  }
  const trimmed = value.replace(/\s+$/u, '');
  return trimmed.length > 0 ? trimmed : value;
};

const isWhitespace = (value: string): boolean => /\s/u.test(value);

export const buildFontString = (fontSize: number, fontFamily: string, fontWeight?: number): string => {
  const weight = fontWeight ?? 400;
  return `${weight} ${fontSize}px ${fontFamily}`;
};

export const layoutText = (
  text: string,
  fontSize: number,
  fontFamily: string,
  lineHeight: number = DEFAULT_TEXT_LINE_HEIGHT,
  fontWeight?: number,
  maxWidth?: number,
): TextLayoutResult => {
  const context = ensureContext();
  if (context) {
    context.font = buildFontString(fontSize, fontFamily, fontWeight);
  }

  const safeLineHeight = resolveLineHeight(fontSize, lineHeight);
  const widthLimit = typeof maxWidth === 'number' && maxWidth > 0 ? maxWidth : undefined;
  const glyph = measureGlyphMetrics(context, fontSize);
  const extraLeading = Math.max(safeLineHeight - glyph.height, 0);
  const leadingTop = extraLeading > 0 ? extraLeading / 2 : 0;
  const leadingBottom = extraLeading > 0 ? extraLeading - leadingTop : 0;

  const paragraphs = text.replace(/\r/g, '').split('\n');
  const safeParagraphs = paragraphs.length > 0 ? paragraphs : [''];

  const lines: string[] = [];
  let maxLineWidth = 0;

  const pushLine = (value: string) => {
    const normalized = value;
    const measuredWidth = measureLineWidth(context, normalized, fontSize);
    maxLineWidth = Math.max(maxLineWidth, measuredWidth);
    lines.push(normalized);
  };

  for (const paragraph of safeParagraphs) {
    if (!widthLimit) {
      pushLine(paragraph);
      continue;
    }

    if (paragraph.length === 0) {
      pushLine('');
      continue;
    }

    let currentLine = '';
    for (const grapheme of Array.from(paragraph)) {
      const nextLine = currentLine + grapheme;
      const nextWidth = measureLineWidth(context, nextLine, fontSize);

      if (nextWidth > widthLimit && currentLine !== '') {
        const finalized = trimLineEnd(currentLine);
        pushLine(finalized);
        currentLine = isWhitespace(grapheme) ? '' : grapheme;

        if (currentLine) {
          const singleWidth = measureLineWidth(context, currentLine, fontSize);
          if (singleWidth > widthLimit) {
            pushLine(currentLine);
            currentLine = '';
          }
        }
        continue;
      }

      if (nextWidth > widthLimit) {
        pushLine(grapheme);
        currentLine = '';
        continue;
      }

      currentLine = nextLine;
    }

    if (currentLine.length > 0) {
      const finalized = trimLineEnd(currentLine);
      pushLine(finalized);
    }
  }

  if (lines.length === 0) {
    pushLine('');
  }

  const effectiveWidth = Math.max(
    widthLimit ?? maxLineWidth,
    fontSize * MIN_WIDTH_FACTOR,
  );

  const effectiveLineCount = lines.length > 0 ? lines.length : 1;
  const effectiveHeight = Math.max(
    safeLineHeight * effectiveLineCount,
    fontSize * MIN_HEIGHT_FACTOR,
  );

  return {
    lines,
    width: effectiveWidth,
    height: effectiveHeight,
    lineHeight: safeLineHeight,
    leading: {
      top: leadingTop,
      bottom: leadingBottom,
    },
  };
};

export const measureTextMetrics = (
  text: string,
  fontSize: number,
  fontFamily: string,
  lineHeight: number = DEFAULT_TEXT_LINE_HEIGHT,
  fontWeight?: number,
): TextMetricsResult => {
  const layout = layoutText(text, fontSize, fontFamily, lineHeight, fontWeight);
  return {
    width: layout.width,
    height: layout.height,
    lineHeight: layout.lineHeight,
    leading: layout.leading,
  };
};
