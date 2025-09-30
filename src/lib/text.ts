import type { Point, StyleClipboardData, TextData } from '@/types';
import {
  DEFAULT_DISABLE_MULTI_STROKE,
  DEFAULT_DISABLE_MULTI_STROKE_FILL,
  DEFAULT_FILL_WEIGHT,
  DEFAULT_HACHURE_ANGLE,
  DEFAULT_HACHURE_GAP,
  DEFAULT_ROUGHNESS,
} from '@/constants';

export const DEFAULT_TEXT_FONT_FAMILY = 'Virgil, "Segoe UI", sans-serif';
export const DEFAULT_TEXT_FONT_SIZE = 32;
export const DEFAULT_TEXT_ALIGN: 'left' | 'center' | 'right' = 'left';
export const TEXT_LINE_HEIGHT_RATIO = 1.25;

export type TextFontOption = { labelKey: string; value: string };

export const TEXT_FONT_OPTIONS: TextFontOption[] = [
  { labelKey: 'sideToolbar.text.fontHand', value: 'Virgil, "Segoe UI", sans-serif' },
  { labelKey: 'sideToolbar.text.fontSans', value: 'Inter, "Segoe UI", sans-serif' },
  { labelKey: 'sideToolbar.text.fontMono', value: '"Cascadia Code", "Fira Code", Consolas, monospace' },
];

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

const getFontString = (fontSize: number, fontFamily: string): string => `${Math.max(1, fontSize)}px ${fontFamily}`;

export const measureTextMetrics = (
  text: string,
  fontSize: number,
  fontFamily: string,
): { width: number; height: number; lineHeight: number; lines: string[] } => {
  const context = ensureMeasureContext();
  const lines = text.split(/\r?\n/);
  const lineHeight = fontSize * TEXT_LINE_HEIGHT_RATIO;
  if (!context) {
    const approximateWidth = Math.max(fontSize * 0.6, ...lines.map(line => line.length * fontSize * 0.6));
    const totalHeight = Math.max(lineHeight, lines.length * lineHeight);
    return { width: approximateWidth, height: totalHeight, lineHeight, lines };
  }

  context.font = getFontString(fontSize, fontFamily);
  let maxWidth = 0;
  lines.forEach(line => {
    const metrics = context.measureText(line || ' ');
    maxWidth = Math.max(maxWidth, metrics.width);
  });
  const safeWidth = Math.max(fontSize * 0.6, maxWidth);
  const totalHeight = Math.max(lineHeight, lines.length * lineHeight);
  return { width: safeWidth, height: totalHeight, lineHeight, lines };
};

export const computeOriginFromAnchor = (
  anchor: Point,
  width: number,
  align: 'left' | 'center' | 'right',
): Point => {
  if (align === 'center') {
    return { x: anchor.x - width / 2, y: anchor.y };
  }
  if (align === 'right') {
    return { x: anchor.x - width, y: anchor.y };
  }
  return { x: anchor.x, y: anchor.y };
};

export const getTextAnchor = (path: TextData): Point => {
  const anchorX = path.textAlign === 'left'
    ? path.x
    : path.textAlign === 'center'
      ? path.x + path.width / 2
      : path.x + path.width;
  return { x: anchorX, y: path.y };
};

export const applyTextMetrics = (
  path: TextData,
  updates: {
    text?: string;
    fontSize?: number;
    fontFamily?: string;
    textAlign?: 'left' | 'center' | 'right';
    anchor?: Point;
  },
): TextData => {
  const nextText = updates.text ?? path.text;
  const nextFontSize = Math.max(1, updates.fontSize ?? path.fontSize);
  const nextFontFamily = updates.fontFamily ?? path.fontFamily;
  const nextAlign = updates.textAlign ?? path.textAlign;
  const metrics = measureTextMetrics(nextText, nextFontSize, nextFontFamily);
  const anchor = updates.anchor ?? getTextAnchor(path);
  const origin = computeOriginFromAnchor(anchor, metrics.width, nextAlign);
  return {
    ...path,
    text: nextText,
    fontSize: nextFontSize,
    fontFamily: nextFontFamily,
    textAlign: nextAlign,
    x: origin.x,
    y: origin.y,
    width: metrics.width,
    height: metrics.height,
    lineHeight: metrics.lineHeight,
  };
};

export const createTextPath = (
  params: {
    id: string;
    text: string;
    anchor: Point;
    color: string;
    fontSize: number;
    fontFamily: string;
    textAlign: 'left' | 'center' | 'right';
    opacity?: number;
    base?: Partial<TextData>;
  },
): TextData => {
  const {
    id,
    text,
    anchor,
    color,
    fontSize,
    fontFamily,
    textAlign,
    opacity,
    base = {},
  } = params;

  const blankPath: TextData = {
    id,
    tool: 'text',
    text,
    fontSize,
    fontFamily,
    textAlign,
    color,
    fill: 'transparent',
    fillGradient: null,
    fillStyle: 'solid',
    strokeWidth: 0,
    strokeLineDash: undefined,
    strokeLineCapStart: 'butt',
    strokeLineCapEnd: 'butt',
    strokeLineJoin: 'round',
    endpointSize: undefined,
    endpointFill: 'hollow',
    isRough: false,
    opacity: opacity ?? base.opacity ?? 1,
    rotation: base.rotation ?? 0,
    scaleX: base.scaleX ?? 1,
    scaleY: base.scaleY ?? 1,
    isVisible: base.isVisible ?? true,
    isLocked: base.isLocked ?? false,
    roughness: base.roughness ?? DEFAULT_ROUGHNESS,
    bowing: base.bowing ?? 0,
    fillWeight: base.fillWeight ?? DEFAULT_FILL_WEIGHT,
    hachureAngle: base.hachureAngle ?? DEFAULT_HACHURE_ANGLE,
    hachureGap: base.hachureGap ?? DEFAULT_HACHURE_GAP,
    curveTightness: base.curveTightness ?? 0,
    curveStepCount: base.curveStepCount ?? 0,
    preserveVertices: base.preserveVertices ?? false,
    disableMultiStroke: base.disableMultiStroke ?? DEFAULT_DISABLE_MULTI_STROKE,
    disableMultiStrokeFill: base.disableMultiStrokeFill ?? DEFAULT_DISABLE_MULTI_STROKE_FILL,
    blur: base.blur ?? 0,
    shadowEnabled: base.shadowEnabled ?? false,
    shadowOffsetX: base.shadowOffsetX ?? 0,
    shadowOffsetY: base.shadowOffsetY ?? 0,
    shadowBlur: base.shadowBlur ?? 0,
    shadowColor: base.shadowColor ?? 'rgba(0,0,0,0.25)',
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    lineHeight: fontSize * TEXT_LINE_HEIGHT_RATIO,
  };

  return applyTextMetrics(blankPath, { anchor });
};

export const applyTextStyle = (path: TextData, style: StyleClipboardData): TextData => {
  let next: TextData = path;
  if (style.color) {
    next = { ...next, color: style.color };
  }
  if (style.opacity != null) {
    next = { ...next, opacity: style.opacity };
  }
  const updates: {
    fontSize?: number;
    fontFamily?: string;
    textAlign?: 'left' | 'center' | 'right';
  } = {};
  if (style.fontSize != null) {
    updates.fontSize = style.fontSize;
  }
  if (style.fontFamily) {
    updates.fontFamily = style.fontFamily;
  }
  if (style.textAlign) {
    updates.textAlign = style.textAlign;
  }
  if (Object.keys(updates).length > 0) {
    const anchor = getTextAnchor(next);
    next = applyTextMetrics(next, { ...updates, anchor });
  }
  return next;
};

export const mapExcalidrawFontFamily = (value: string | number | undefined): string => {
  if (typeof value === 'number') {
    switch (value) {
      case 1:
        return 'Virgil, "Segoe UI", sans-serif';
      case 2:
        return 'Inter, "Segoe UI", sans-serif';
      case 3:
        return '"Cascadia Code", "Fira Code", Consolas, monospace';
      default:
        return DEFAULT_TEXT_FONT_FAMILY;
    }
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }
  return DEFAULT_TEXT_FONT_FAMILY;
};
