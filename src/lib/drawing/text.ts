/**
 * 文本工具相关的排版测量与辅助方法。
 * 负责根据字体和字号计算真实的行高、基线以及文本包围盒尺寸，
 * 以确保 SVG 渲染与 HTML 覆盖编辑器之间的视觉一致性。
 */

import type { TextData } from '@/types';

const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
const ctx = canvas ? canvas.getContext('2d') : null;

const DEFAULT_LINE_HEIGHT_RATIO = 1.25;
const FALLBACK_ASCENT_RATIO = 0.8;
const FALLBACK_DESCENT_RATIO = 0.2;
const METRIC_SAMPLE_TEXT = 'Mgyp';

const LINE_HEIGHT_OVERRIDES: Record<string, number> = {
  excalifont: 1.25,
  'xiaolai sc': 1.3,
  kalam: 1.3,
  lora: 1.35,
  'noto sans sc': 1.2,
  'roboto mono': 1.2,
};

const createFallbackMetrics = () => {
  const leading = Math.max(0, DEFAULT_LINE_HEIGHT_RATIO - (FALLBACK_ASCENT_RATIO + FALLBACK_DESCENT_RATIO));
  return {
    baselineRatio: FALLBACK_ASCENT_RATIO + leading / 2,
    lineHeightRatio: DEFAULT_LINE_HEIGHT_RATIO,
    ascentRatio: FALLBACK_ASCENT_RATIO,
    descentRatio: FALLBACK_DESCENT_RATIO,
    leadingRatio: leading,
  } satisfies FontMetrics;
};

const FALLBACK_FONT_METRICS = createFallbackMetrics();

const sanitizeFontFamily = (fontFamily: string): string => {
  const primary = fontFamily.split(',')[0] ?? fontFamily;
  return primary.trim().replace(/^['"]|['"]$/g, '');
};

const wrapFontFamily = (fontFamily: string): string => {
  return fontFamily.includes(' ') ? `'${fontFamily}'` : fontFamily;
};

const getFontKey = (fontFamily: string): string => sanitizeFontFamily(fontFamily).toLowerCase();

export interface FontMetrics {
  /** 基线到行框顶部的距离与字号的比值。 */
  baselineRatio: number;
  /** 单行文本的高度与字号的比值。 */
  lineHeightRatio: number;
  /** 字形实际上升部（不含额外行距）与字号的比值。 */
  ascentRatio: number;
  /** 字形实际下降部（不含额外行距）与字号的比值。 */
  descentRatio: number;
  /** 顶部与底部额外行距（leading）的总比值。 */
  leadingRatio: number;
}

const fontMetricsCache = new Map<string, FontMetrics>();

const computeFontMetrics = (fontFamily: string): FontMetrics => {
  const key = getFontKey(fontFamily);
  if (fontMetricsCache.has(key)) {
    return fontMetricsCache.get(key)!;
  }

  if (!ctx) {
    fontMetricsCache.set(key, FALLBACK_FONT_METRICS);
    return FALLBACK_FONT_METRICS;
  }

  const size = 100;
  const sanitizedFamily = sanitizeFontFamily(fontFamily);
  ctx.font = `${size}px ${wrapFontFamily(sanitizedFamily)}`;

  const measurement = ctx.measureText(METRIC_SAMPLE_TEXT);
  const rawAscent = measurement.actualBoundingBoxAscent ?? measurement.fontBoundingBoxAscent ?? size * FALLBACK_ASCENT_RATIO;
  const rawDescent = measurement.actualBoundingBoxDescent ?? measurement.fontBoundingBoxDescent ?? size * FALLBACK_DESCENT_RATIO;
  const measuredLineHeight = rawAscent + rawDescent;

  const overrideRatio = LINE_HEIGHT_OVERRIDES[key] ?? DEFAULT_LINE_HEIGHT_RATIO;
  const overrideLineHeight = overrideRatio * size;
  const lineHeight = Math.max(measuredLineHeight, overrideLineHeight);
  const leading = Math.max(0, lineHeight - measuredLineHeight);

  const baseline = rawAscent + leading / 2;

  const metrics: FontMetrics = {
    baselineRatio: baseline / size,
    lineHeightRatio: lineHeight / size,
    ascentRatio: rawAscent / size,
    descentRatio: rawDescent / size,
    leadingRatio: leading / size,
  };

  fontMetricsCache.set(key, metrics);
  return metrics;
};

export const getFontMetrics = (fontFamily: string): FontMetrics => computeFontMetrics(fontFamily);

export const getLineHeightMultiplier = (fontFamily: string): number => getFontMetrics(fontFamily).lineHeightRatio;

export interface TextMeasurement {
  width: number;
  height: number;
  baseline: number;
  lineHeight: number;
}

const approximateWidth = (text: string, fontSize: number) => {
  const averageWidthFactor = 0.55;
  return text.length * fontSize * averageWidthFactor;
};

export const measureText = (text: string, fontSize: number, fontFamily: string): TextMeasurement => {
  const sanitizedFamily = sanitizeFontFamily(fontFamily);
  const metrics = getFontMetrics(sanitizedFamily);
  const lineHeight = metrics.lineHeightRatio * fontSize;
  const baseline = metrics.baselineRatio * fontSize;

  const lines = text.split('\n');
  const lineCount = Math.max(lines.length, 1);

  let maxWidth = 0;
  if (ctx) {
    ctx.font = `${fontSize}px ${wrapFontFamily(sanitizedFamily)}`;
    for (const rawLine of lines) {
      const line = rawLine.length > 0 ? rawLine : ' ';
      const measurement = ctx.measureText(line);
      const left = measurement.actualBoundingBoxLeft ?? 0;
      const right = measurement.actualBoundingBoxRight ?? measurement.width;
      const measuredWidth = Math.max(measurement.width, left + right);
      if (measuredWidth > maxWidth) {
        maxWidth = measuredWidth;
      }
    }
  } else {
    maxWidth = lines.reduce((acc, current) => {
      const candidate = approximateWidth(current, fontSize);
      return candidate > acc ? candidate : acc;
    }, 0);
  }

  return {
    width: maxWidth,
    height: lineCount * lineHeight,
    baseline,
    lineHeight,
  };
};

export type CreateTextShapeInput = Omit<TextData, 'tool' | 'width' | 'height' | 'baseline' | 'lineHeight'>;

export const createTextShape = (input: CreateTextShapeInput): TextData => {
  const measurement = measureText(input.text, input.fontSize, input.fontFamily);
  return {
    ...input,
    tool: 'text',
    width: measurement.width,
    height: measurement.height,
    baseline: measurement.baseline,
    lineHeight: measurement.lineHeight,
  };
};

export const updateTextShapeMetrics = (
  shape: TextData,
  overrides: Partial<Pick<TextData, 'text' | 'fontSize' | 'fontFamily'>> = {},
): TextData => {
  const nextText = overrides.text ?? shape.text;
  const nextFontSize = overrides.fontSize ?? shape.fontSize;
  const nextFontFamily = overrides.fontFamily ?? shape.fontFamily;
  const measurement = measureText(nextText, nextFontSize, nextFontFamily);

  return {
    ...shape,
    ...overrides,
    width: measurement.width,
    height: measurement.height,
    baseline: measurement.baseline,
    lineHeight: measurement.lineHeight,
  };
};

