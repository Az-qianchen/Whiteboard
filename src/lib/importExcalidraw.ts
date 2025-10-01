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
} from '@/constants';
import { useFilesStore } from '@/context/filesStore';

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
    } else if (el.type === 'text' && typeof el.text === 'string') {
      const lines = el.text.split(/\r?\n/);
      const lineCount = lines.length || 1;
      const derivedLineHeight = lineCount > 0 ? el.height / lineCount : el.fontSize ?? 16;
      const textPath: TextData = {
        ...sharedProps(el),
        tool: 'text',
        x: el.x,
        y: el.y,
        width: el.width,
        height: el.height,
        text: el.text,
        fontFamily: typeof el.fontFamily === 'string' ? el.fontFamily : 'Virgil, Segoe UI, sans-serif',
        fontSize: el.fontSize ?? 16,
        textAlign: el.textAlign ?? 'left',
        lineHeight: Number.isFinite(derivedLineHeight) ? derivedLineHeight : (el.fontSize ?? 16) * 1.35,
        fill: 'transparent',
        fillStyle: 'solid',
        strokeWidth: 0,
        isRough: false,
        roughness: 0,
        bowing: 0,
        fillWeight: 0,
        hachureAngle: 0,
        hachureGap: 0,
        curveTightness: 0,
        curveStepCount: 0,
      };
      paths.push(textPath);
    }
  }

  return paths;
}
