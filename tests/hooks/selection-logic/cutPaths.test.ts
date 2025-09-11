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
  it('removes a line completely when intersected', () => {
    const line: BrushPathData = {
      id: 'line',
      tool: 'brush',
      points: [
        { x: 0, y: 0 },
        { x: 20, y: 0 },
      ],
      ...baseStyle,
    };
    const lasso: Point[] = [
      { x: 10, y: -5 },
      { x: 10, y: 5 },
    ];
    const result = cutPaths(lasso, [line]);
    expect(result).toHaveLength(0);
  });

  it('removes only the crossed segment of a polyline', () => {
    const poly: BrushPathData = {
      id: 'poly',
      tool: 'brush',
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 20, y: 0 },
        { x: 30, y: 0 },
      ],
      ...baseStyle,
    };
    const lasso: Point[] = [
      { x: 15, y: -5 },
      { x: 15, y: 5 },
    ];
    const res = cutPaths(lasso, [poly]);
    expect(res).toHaveLength(2);
    expect((res[0] as BrushPathData).points).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ]);
    expect((res[1] as BrushPathData).points).toEqual([
      { x: 20, y: 0 },
      { x: 30, y: 0 },
    ]);
  });

  it('cuts segments out of a closed path', () => {
    const square: BrushPathData = {
      id: 'sq',
      tool: 'brush',
      points: [
        { x: 0, y: 0 },
        { x: 20, y: 0 },
        { x: 20, y: 20 },
        { x: 0, y: 20 },
        { x: 0, y: 0 },
      ],
      ...baseStyle,
    };
    const lasso: Point[] = [
      { x: 10, y: -5 },
      { x: 10, y: 25 },
    ];
    const result = cutPaths(lasso, [square]);
    expect(result).toHaveLength(2);
    expect(result.every(p => (p as BrushPathData).points.length >= 2)).toBe(true);
  });
});
