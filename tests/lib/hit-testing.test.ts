// 命中检测函数测试
import { describe, it, expect, vi } from 'vitest';
vi.mock('paper', () => ({}));
import { isPointHittingPath, isPointInPolygon } from '@/lib/hit-testing';
import type { RectangleData, EllipseData, BrushPathData, Point } from '@/types';

const baseShape = {
  id: '1',
  color: '#000',
  fill: 'transparent',
  fillStyle: 'solid',
  strokeWidth: 2,
  roughness: 0,
  bowing: 0,
  fillWeight: 0,
  hachureAngle: 0,
  hachureGap: 0,
  curveTightness: 0,
  curveStepCount: 0,
} as const;

describe('命中检测函数测试', () => {
  describe('isPointHittingPath', () => {
    it('矩形命中与未命中', () => {
      // 点位于矩形内部，应判定命中
      const rect = {
        ...baseShape,
        tool: 'rectangle',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        fill: '#f00',
      } as unknown as RectangleData;
      expect(isPointHittingPath({ x: 10, y: 10 }, rect, 1)).toBe(true);

      // 点远离矩形，不应命中
      expect(isPointHittingPath({ x: 200, y: 200 }, rect, 1)).toBe(false);
    });

    it('椭圆命中与未命中', () => {
      // 点位于椭圆中心，应判定命中
      const ellipse = {
        ...baseShape,
        tool: 'ellipse',
        x: 0,
        y: 0,
        width: 100,
        height: 60,
        fill: '#0f0',
      } as unknown as EllipseData;
      expect(isPointHittingPath({ x: 50, y: 30 }, ellipse, 1)).toBe(true);

      // 点远离椭圆，不应命中
      expect(isPointHittingPath({ x: 200, y: 200 }, ellipse, 1)).toBe(false);
    });

    it('画笔路径命中与未命中', () => {
      // 点靠近画笔路径，应判定命中
      const brush = {
        ...baseShape,
        tool: 'brush',
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
        ],
      } as unknown as BrushPathData;
      expect(isPointHittingPath({ x: 50, y: 2 }, brush, 1)).toBe(true);

      // 点远离画笔路径，不应命中
      expect(isPointHittingPath({ x: 50, y: 20 }, brush, 1)).toBe(false);
    });
  });

  describe('isPointInPolygon', () => {
    it('点在多边形内与外', () => {
      const polygon: Point[] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
      ];

      // 正方形内部的点应命中
      expect(isPointInPolygon({ x: 50, y: 50 }, polygon)).toBe(true);

      // 正方形外部的点不应命中
      expect(isPointInPolygon({ x: 150, y: 150 }, polygon)).toBe(false);
    });
  });
});

