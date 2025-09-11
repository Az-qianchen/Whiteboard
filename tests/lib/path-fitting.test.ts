// 路径拟合函数测试
import { describe, it, expect } from 'vitest';
import { pointsToSimplePathD, pointsToPathD, anchorsToPathD } from '@/lib/path-fitting';
import type { Point, Anchor } from '@/types';

describe('path-fitting', () => {
  // 测试将点转换为简单折线路径
  it('pointsToSimplePathD converts points to polyline path', () => {
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];
    const d = pointsToSimplePathD(points);
    expect(d).toBe('M 0 0 L 10 0 L 10 10');
  });

  // 测试生成平滑贝塞尔路径
  it('pointsToPathD smooths points into cubic Bezier path', () => {
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];
    const d = pointsToPathD(points);
    expect(d.trim()).toBe('M0,0 C1.6666666666666667,0,8.333333333333334,-1.6666666666666667,10,0 C11.666666666666666,1.6666666666666667,10,8.333333333333334,10,10');
  });

  // 测试锚点数组转换为贝塞尔路径
  it('anchorsToPathD converts anchors to cubic Bezier path', () => {
    const anchors: Anchor[] = [
      {
        point: { x: 0, y: 0 },
        handleIn: { x: 0, y: 0 },
        handleOut: { x: 10, y: 0 },
      },
      {
        point: { x: 10, y: 10 },
        handleIn: { x: 10, y: 0 },
        handleOut: { x: 10, y: 10 },
      },
    ];
    const d = anchorsToPathD(anchors);
    expect(d).toBe('M 0 0 C 10,0 10,0 10,10');
  });
});

