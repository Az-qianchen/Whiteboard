import { describe, it, expect, beforeAll } from 'vitest';
import type { BrushPathData, Point } from '@/types';

let cutPaths: (lasso: Point[], paths: any[]) => any[];

beforeAll(async () => {
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    value: () => ({}),
  });
  ({ cutPaths } = await import('@/hooks/selection-logic/pointerUp'));
});

const baseStyle = {
  color: '#000',
  fill: 'none',
  fillStyle: 'solid',
  strokeWidth: 1,
  roughness: 0,
  bowing: 0,
  fillWeight: 0,
  hachureAngle: 0,
  hachureGap: 0,
  curveTightness: 0,
  curveStepCount: 0,
};

describe('cutPaths', () => {
  it('trims to nearest intersection when cutting a line head', () => {
    const vertical: BrushPathData = {
      id: 'v',
      tool: 'brush',
      points: [
        { x: 0, y: -10 },
        { x: 0, y: 10 },
      ],
      ...baseStyle,
    };
    const horizontal: BrushPathData = {
      id: 'h',
      tool: 'brush',
      points: [
        { x: -10, y: 0 },
        { x: 10, y: 0 },
      ],
      ...baseStyle,
    };
    const stroke: Point[] = [
      { x: -5, y: 8 },
      { x: 5, y: 8 },
    ];
    const res = cutPaths(stroke, [vertical, horizontal]);
    const vRes = res.find(p => p.id === 'v') as BrushPathData;
    const hRes = res.find(p => p.id === 'h') as BrushPathData;
    expect(vRes.points).toEqual([
      { x: 0, y: -10 },
      { x: 0, y: 0 },
    ]);
    expect(hRes.points).toEqual(horizontal.points);
  });

  it('trims to endpoint when no other intersection exists', () => {
    const line: BrushPathData = {
      id: 'line',
      tool: 'brush',
      points: [
        { x: 0, y: -10 },
        { x: 0, y: 10 },
      ],
      ...baseStyle,
    };
    const stroke: Point[] = [
      { x: -5, y: 8 },
      { x: 5, y: 8 },
    ];
    const res = cutPaths(stroke, [line]);
    expect(res).toHaveLength(0);
  });
});
