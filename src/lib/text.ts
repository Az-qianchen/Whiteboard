/**
 * Utilities for working with text measurement and defaults.
 */

import type { TextData } from '@/types';

const getCanvasContext = (() => {
  let canvas: HTMLCanvasElement | null = null;
  let context: CanvasRenderingContext2D | null = null;
  return () => {
    if (typeof document === 'undefined') {
      return null;
    }
    if (!canvas) {
      canvas = document.createElement('canvas');
      context = canvas.getContext('2d');
    }
    return context;
  };
})();

export const DEFAULT_FONT_FAMILY = 'Inter, system-ui, sans-serif';
export const DEFAULT_FONT_SIZE = 24;
export const DEFAULT_TEXT_LINE_HEIGHT = 1.35;

export const getFontString = (fontFamily: string, fontSize: number): string => `normal ${fontSize}px ${fontFamily}`;

const approximateTextWidth = (text: string, fontSize: number): number => {
  const averageCharWidth = fontSize * 0.6;
  return text.length * averageCharWidth;
};

export const measureTextLine = (text: string, fontFamily: string, fontSize: number): number => {
  const ctx = getCanvasContext();
  if (!ctx) {
    return approximateTextWidth(text, fontSize);
  }
  ctx.font = getFontString(fontFamily, fontSize);
  const metrics = ctx.measureText(text || ' ');
  return metrics.width;
};

export const measureTextBlock = (
  text: string,
  fontFamily: string,
  fontSize: number,
  lineHeight: number,
): { width: number; height: number; lineCount: number } => {
  const lines = text.split(/\r?\n/);
  const lineCount = Math.max(1, lines.length);
  const widths = lines.map(line => measureTextLine(line, fontFamily, fontSize));
  const width = widths.length === 0 ? measureTextLine('', fontFamily, fontSize) : Math.max(...widths);
  const height = lineCount * fontSize * lineHeight;
  return { width, height, lineCount };
};

export const getTextAnchorPoint = (path: TextData): { x: number; y: number } => {
  switch (path.textAlign) {
    case 'center':
      return { x: path.x + path.width / 2, y: path.y };
    case 'right':
      return { x: path.x + path.width, y: path.y };
    case 'left':
    default:
      return { x: path.x, y: path.y };
  }
};

export const normalizeFontFamily = (value: string | number | undefined): string => {
  if (typeof value === 'number') {
    switch (value) {
      case 1:
        return 'Virgil, "Comic Sans MS", cursive';
      case 2:
        return 'Helvetica, Arial, sans-serif';
      case 3:
        return 'Cascadia Code, Menlo, monospace';
      default:
        return DEFAULT_FONT_FAMILY;
    }
  }
  if (!value || value.trim().length === 0) {
    return DEFAULT_FONT_FAMILY;
  }
  return value;
};

