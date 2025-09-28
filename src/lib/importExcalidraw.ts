/**
 * Imports Excalidraw JSON and converts it into internal AnyPath objects.
 */

import type { AnyPath, RectangleData, EllipseData, VectorPathData, Anchor, ImageData, TextData } from '@/types';
import {
  DEFAULT_ROUGHNESS,
  DEFAULT_BOWING,
  DEFAULT_FILL_WEIGHT,
  DEFAULT_HACHURE_ANGLE,
  DEFAULT_HACHURE_GAP,
  DEFAULT_CURVE_TIGHTNESS,
  DEFAULT_CURVE_STEP_COUNT,
  DEFAULT_TEXT_FONT_FAMILY,
  DEFAULT_TEXT_FONT_SIZE,
  DEFAULT_TEXT_LINE_HEIGHT,
  DEFAULT_TEXT_PADDING_X,
  DEFAULT_TEXT_PADDING_Y,
} from '@/constants';
import { useFilesStore } from '@/context/filesStore';
import { measureTextDimensions } from '@/lib/text';

interface ExcalidrawElement {
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  angle?: number;
  strokeColor?: string;
  backgroundColor?: string;
  strokeWidth?: number;
  roughness?: number;
  opacity?: number;
  points?: [number, number][];
  text?: string;
  fontSize?: number;
  fontFamily?: string | number;
  textAlign?: 'left' | 'center' | 'right';
  fileId?: string;
  closed?: boolean;
}

const VECTOR_STROKE_TYPES: ReadonlySet<string> = new Set([
  'line',
  'arrow',
  'draw',
  'freedraw',
]);

const EXCALIDRAW_FONT_FAMILIES: Record<string | number, string> = {
  1: 'Virgil, Segoe UI Emoji',
  2: 'Helvetica, Arial, sans-serif',
  3: 'Cascadia, Segoe UI Emoji',
};

const resolveFontFamily = (font: string | number | undefined): string => {
  if (typeof font === 'string' && font.trim().length > 0) {
    return font;
  }
  if (font !== undefined) {
    return EXCALIDRAW_FONT_FAMILIES[font] ?? DEFAULT_TEXT_FONT_FAMILY;
  }
  return DEFAULT_TEXT_FONT_FAMILY;
};

const sharedProps = (el: ExcalidrawElement) => ({
  id: `${Date.now()}-${Math.random()}`,
  color: el.strokeColor ?? '#000000',
  fill: el.backgroundColor ?? 'transparent',
  strokeWidth: el.strokeWidth ?? 1,
  fillStyle: 'solid',
  roughness: el.roughness ?? DEFAULT_ROUGHNESS,
  bowing: DEFAULT_BOWING,
  fillWeight: DEFAULT_FILL_WEIGHT,
  hachureAngle: DEFAULT_HACHURE_ANGLE,
  hachureGap: DEFAULT_HACHURE_GAP,
  curveTightness: DEFAULT_CURVE_TIGHTNESS,
  curveStepCount: DEFAULT_CURVE_STEP_COUNT,
  opacity: el.opacity ?? 1,
  rotation: el.angle ?? 0,
});

export async function importExcalidraw(json: string): Promise<AnyPath[]> {
  let data: any;
  try {
    data = JSON.parse(json);
  } catch {
    return [];
  }
  const elements: ExcalidrawElement[] = data?.elements;
  if (!Array.isArray(elements)) return [];
  const files: Record<string, { dataURL?: string }> = data?.files ?? {};

  const paths: AnyPath[] = [];
  const filesStore = useFilesStore.getState();

  for (const el of elements) {
    if (el.type === 'rectangle') {
      paths.push({
        ...sharedProps(el),
        tool: 'rectangle',
        x: el.x,
        y: el.y,
        width: el.width,
        height: el.height,
      } as RectangleData);
    } else if (el.type === 'ellipse') {
      paths.push({
        ...sharedProps(el),
        tool: 'ellipse',
        x: el.x,
        y: el.y,
        width: el.width,
        height: el.height,
      } as EllipseData);
    } else if (VECTOR_STROKE_TYPES.has(el.type) && Array.isArray(el.points)) {
      const anchors: Anchor[] = el.points.map((p) => {
        const x = el.x + p[0];
        const y = el.y + p[1];
        return { point: { x, y }, handleIn: { x, y }, handleOut: { x, y } };
      });
      paths.push({
        ...sharedProps(el),
        tool: 'pen',
        anchors,
        isClosed: Boolean(el.closed),
      } as VectorPathData);
    } else if (el.type === 'image' && el.fileId) {
      const file = files[el.fileId];
      const src = file?.dataURL;
      if (src) {
        const { fileId } = await filesStore.ingestDataUrl(src);
        paths.push({
          ...sharedProps(el),
          tool: 'image',
          fileId,
          x: el.x,
          y: el.y,
          width: el.width,
          height: el.height,
          color: 'transparent',
          fill: 'transparent',
          strokeWidth: 0,
        } as ImageData);
      }
    } else if (el.type === 'text') {
      const text = el.text ?? '';
      const fontSize = el.fontSize ?? DEFAULT_TEXT_FONT_SIZE;
      const fontFamily = resolveFontFamily(el.fontFamily);
      const metrics = measureTextDimensions(text, {
        fontFamily,
        fontSize,
        lineHeight: DEFAULT_TEXT_LINE_HEIGHT,
        paddingX: DEFAULT_TEXT_PADDING_X,
        paddingY: DEFAULT_TEXT_PADDING_Y,
      });
      paths.push({
        ...sharedProps(el),
        tool: 'text',
        x: el.x,
        y: el.y,
        width: metrics.width,
        height: metrics.height,
        text,
        fontSize,
        fontFamily,
        lineHeight: DEFAULT_TEXT_LINE_HEIGHT,
        paddingX: DEFAULT_TEXT_PADDING_X,
        paddingY: DEFAULT_TEXT_PADDING_Y,
        textAlign: el.textAlign ?? 'left',
      } as TextData);
    }
  }

  return paths;
}
