/**
 * 本文件包含了与文本测量和处理相关的函数。
 */

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d')!;

const DEFAULT_LINE_HEIGHT_RATIO = 1.25;
const FALLBACK_ASCENT_RATIO = 0.8;
const FALLBACK_DESCENT_RATIO = 0.2;

const LINE_HEIGHT_OVERRIDES: Record<string, number> = {
  excalifont: 1.25,
  'xiaolai sc': 1.3,
  kalam: 1.3,
  lora: 1.35,
  'noto sans sc': 1.2,
  'roboto mono': 1.2,
};

const sanitizeFontFamily = (fontFamily: string): string => {
  const primary = fontFamily.split(',')[0] ?? fontFamily;
  return primary.trim().replace(/^['"]|['"]$/g, '');
};

export interface TextMeasurement {
  width: number;
  height: number;
  baseline: number;
  lineHeight: number;
}

/**
 * 获取某个字体的行高倍数配置。
 * 行高会影响包围盒高度与编辑器内文本的排版。
 */
export const getLineHeightMultiplier = (fontFamily: string): number => {
  const key = sanitizeFontFamily(fontFamily).toLowerCase();
  return LINE_HEIGHT_OVERRIDES[key] ?? DEFAULT_LINE_HEIGHT_RATIO;
};

/**
 * 使用 2D 画布上下文测量给定文本的尺寸与排版指标。
 * @param text - 要测量的文本字符串。
 * @param fontSize - 字体大小（像素）。
 * @param fontFamily - 字体系列。
 * @returns 包含宽度、高度、基线与行高的对象。
 */
export function measureText(text: string, fontSize: number, fontFamily: string): TextMeasurement {
  const family = sanitizeFontFamily(fontFamily);
  const familyWithQuotes = family.includes(' ') ? `'${family}'` : family;
  ctx.font = `${fontSize}px ${familyWithQuotes}`;

  const lines = text.split('\n');
  const lineCount = Math.max(lines.length, 1);

  let maxWidth = 0;
  let maxAscent = 0;
  let maxDescent = 0;

  const fallbackAscent = fontSize * FALLBACK_ASCENT_RATIO;
  const fallbackDescent = fontSize * FALLBACK_DESCENT_RATIO;

  for (const rawLine of lines) {
    const line = rawLine.length > 0 ? rawLine : 'M';
    const metrics = ctx.measureText(line);
    const boundingWidth = (metrics.actualBoundingBoxLeft ?? 0) + (metrics.actualBoundingBoxRight ?? 0);
    const measuredWidth = Math.max(metrics.width, boundingWidth);
    if (measuredWidth > maxWidth) {
      maxWidth = measuredWidth;
    }

    const ascent = metrics.actualBoundingBoxAscent ?? fallbackAscent;
    if (ascent > maxAscent) {
      maxAscent = ascent;
    }
    const descent = metrics.actualBoundingBoxDescent ?? fallbackDescent;
    if (descent > maxDescent) {
      maxDescent = descent;
    }
  }

  if (maxAscent === 0) maxAscent = fallbackAscent;
  if (maxDescent === 0) maxDescent = fallbackDescent;

  const baseHeight = maxAscent + maxDescent;
  const lineHeightMultiplier = getLineHeightMultiplier(family);
  const lineHeight = baseHeight * lineHeightMultiplier;
  const leading = Math.max(lineHeight - baseHeight, 0);
  const baseline = maxAscent + leading / 2;
  const height = baseHeight + leading + (lineCount - 1) * lineHeight;

  return {
    width: maxWidth,
    height,
    baseline,
    lineHeight,
  };
}
