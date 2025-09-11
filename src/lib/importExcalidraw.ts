/**
 * Imports Excalidraw JSON and converts it into internal AnyPath objects.
 */

import type { AnyPath, RectangleData, EllipseData, VectorPathData, Anchor, TextData } from '@/types';
import {
  DEFAULT_ROUGHNESS,
  DEFAULT_BOWING,
  DEFAULT_FILL_WEIGHT,
  DEFAULT_HACHURE_ANGLE,
  DEFAULT_HACHURE_GAP,
  DEFAULT_CURVE_TIGHTNESS,
  DEFAULT_CURVE_STEP_COUNT,
} from '@/constants';

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
  fillStyle?: string;
  roundness?: number | { type?: number; value?: number; radius?: number };
}

const sharedProps = (el: ExcalidrawElement) => ({
  id: `${Date.now()}-${Math.random()}`,
  color: el.strokeColor ?? '#000000',
  fill: el.backgroundColor ?? 'transparent',
  strokeWidth: el.strokeWidth ?? 1,
  fillStyle: el.fillStyle ?? 'hachure',
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

export function importExcalidraw(json: string): AnyPath[] {
  let data: any;
  try { data = JSON.parse(json); } catch { return []; }
  const elements: ExcalidrawElement[] = data?.elements;
  if (!Array.isArray(elements)) return [];

  const paths: AnyPath[] = [];

  for (const el of elements) {
    if (el.type === 'rectangle') {
      const borderRadius = (() => {
        const r = el.roundness as any;
        if (r == null) return 0;
        if (typeof r === 'number') return r;
        if (typeof r === 'object') {
          if (typeof r.value === 'number') return r.value;
          if (typeof r.radius === 'number') return r.radius;
          if (typeof r.type === 'number' && r.type > 0) return 16;
        }
        return 0;
      })();
      paths.push({
        ...sharedProps(el),
        tool: 'rectangle',
        x: el.x,
        y: el.y,
        width: el.width,
        height: el.height,
        borderRadius,
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
    } else if (el.type === 'text' && el.text) {
      paths.push({
        ...sharedProps(el),
        tool: 'text',
        text: el.text,
        fontSize: el.fontSize ?? 16,
        fontFamily: typeof el.fontFamily === 'string' ? el.fontFamily : 'Virgil',
        textAlign: el.textAlign ?? 'left',
        x: el.x,
        y: el.y,
        width: el.width ?? 0,
        height: el.height ?? el.fontSize ?? 16,
      } as TextData);
    } else if (['line', 'arrow', 'draw', 'freedraw'].includes(el.type) && Array.isArray(el.points)) {
      const anchors: Anchor[] = el.points.map((p) => {
        const x = el.x + p[0];
        const y = el.y + p[1];
        return { point: { x, y }, handleIn: { x, y }, handleOut: { x, y } };
      });
      paths.push({
        ...sharedProps(el),
        tool: 'pen',
        anchors,
        isClosed: false,
      } as VectorPathData);
    }
  }

  return paths;
}

