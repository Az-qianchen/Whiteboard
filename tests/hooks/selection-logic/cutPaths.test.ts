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
  it('cuts a line into two segments when intersected twice', () => {
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
      { x: 8, y: -5 },
      { x: 8, y: 5 },
      { x: 12, y: 5 },
      { x: 12, y: -5 },
    ];
    const result = cutPaths(lasso, [line]);
    expect(result).toHaveLength(2);
    expect((result[0] as BrushPathData).points[0]).toEqual({ x: 0, y: 0 });
    expect((result[0] as BrushPathData).points.at(-1)?.x).toBeCloseTo(8, 5);
    expect((result[1] as BrushPathData).points[0].x).toBeCloseTo(12, 5);
    expect((result[1] as BrushPathData).points.at(-1)?.x).toBeCloseTo(20, 5);
  });

  it('cuts a closed path and removes middle segment', () => {
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
      { x: -5, y: 10 },
      { x: 25, y: 10 },
    ];
    const res = cutPaths(lasso, [square]);
    expect(res.length).toBeGreaterThan(1);
    expect(res.every(p => (p as BrushPathData).points.length >= 2)).toBe(true);
  });

  it('handles multiple intersection pairs', () => {
    const zigzag: BrushPathData = {
      id: 'zz',
      tool: 'brush',
      points: [
        { x: 0, y: -10 },
        { x: 10, y: 10 },
        { x: 20, y: -10 },
        { x: 30, y: 10 },
        { x: 40, y: -10 },
      ],
      ...baseStyle,
    };
    const lasso: Point[] = [
      { x: -5, y: 0 },
      { x: 45, y: 0 },
    ];
    const result = cutPaths(lasso, [zigzag]);
    expect(result).toHaveLength(3);
  });
});
