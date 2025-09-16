// 命中检测函数测试
import { describe, it, expect, vi } from 'vitest';
vi.mock('paper', () => ({}));
import { findDeepestHitPath, isPathIntersectingLasso, isPathIntersectingMarquee, isPointHittingPath, isPointInPolygon } from '@/lib/hit-testing';
import type { AnyPath, RectangleData, EllipseData, BrushPathData, Point, GroupData } from '@/types';

const baseShape = {
  id: 'shape-base',
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

const createRectangle = (overrides: Partial<RectangleData> = {}): RectangleData => ({
  ...baseShape,
  tool: 'rectangle',
  x: 0,
  y: 0,
  width: 100,
  height: 80,
  fill: '#f00',
  ...overrides,
}) as RectangleData;

const createGroup = (children: AnyPath[], overrides: Partial<GroupData> = {}): GroupData => ({
  ...baseShape,
  tool: 'group',
  children,
  ...overrides,
}) as GroupData;

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

  describe('findDeepestHitPath', () => {
    it('优先返回组内命中的子元素并忽略锁定图形', () => {
      const locked = createRectangle({ id: 'locked', x: 200, y: 200, width: 20, height: 20, isLocked: true });
      const child = createRectangle({ id: 'child', x: 10, y: 10, width: 40, height: 30 });
      const group = createGroup([child], { id: 'group', isCollapsed: false });
      const point = { x: 20, y: 20 };

      const hit = findDeepestHitPath(point, [locked, group], 1);
      expect(hit?.id).toBe('child');
    });

    it('跳过折叠的组', () => {
      const collapsed = createGroup([createRectangle({ id: 'hidden', x: 5, y: 5, width: 10, height: 10 })], { id: 'collapsed', isCollapsed: true });
      const point = { x: 8, y: 8 };
      expect(findDeepestHitPath(point, [collapsed], 1)).toBeNull();
    });
  });

  describe('isPathIntersectingMarquee', () => {
    it('识别与旋转矩形的交集', () => {
      const rotated = createRectangle({ id: 'rotated', x: 40, y: 20, width: 40, height: 30, rotation: Math.PI / 4 });
      const marquee = { x: 30, y: 15, width: 60, height: 60 };
      expect(isPathIntersectingMarquee(rotated, marquee)).toBe(true);
      expect(isPathIntersectingMarquee(rotated, { x: 200, y: 200, width: 20, height: 20 })).toBe(false);
    });

    it('对组内任一成员命中即返回 true', () => {
      const inside = createRectangle({ id: 'inside', x: 10, y: 10, width: 20, height: 20 });
      const outside = createRectangle({ id: 'outside', x: 200, y: 200, width: 10, height: 10 });
      const group = createGroup([inside, outside], { id: 'group-marquee' });
      const marquee = { x: 0, y: 0, width: 80, height: 80 };
      expect(isPathIntersectingMarquee(group, marquee)).toBe(true);
    });
  });

  describe('isPathIntersectingLasso', () => {
    const lasso: Point[] = [
      { x: 0, y: 0 },
      { x: 60, y: 0 },
      { x: 60, y: 60 },
      { x: 0, y: 60 },
    ];

    it('判断单个图形被套索完全包含', () => {
      const rect = createRectangle({ id: 'lasso-rect', x: 10, y: 10, width: 20, height: 20 });
      expect(isPathIntersectingLasso(rect, lasso)).toBe(true);
    });

    it('组内任一子元素不在套索中则返回 false', () => {
      const inside = createRectangle({ id: 'lasso-inside', x: 15, y: 15, width: 10, height: 10 });
      const outside = createRectangle({ id: 'lasso-outside', x: 100, y: 100, width: 15, height: 15 });
      const group = createGroup([inside, outside], { id: 'group-lasso' });
      expect(isPathIntersectingLasso(group, lasso)).toBe(false);
    });
  });
});

