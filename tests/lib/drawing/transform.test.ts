// 图形变换核心算法测试
import { describe, expect, it } from 'vitest';
import { movePath, rotatePath, rotateResizeHandle, scalePath } from '@/lib/drawing/transform';
import type { BrushPathData, GroupData, Point, RectangleData, VectorPathData } from '@/types';

const shapeBase = {
  color: '#000000',
  fill: 'transparent',
  fillStyle: 'hachure',
  strokeWidth: 1,
  roughness: 0,
  bowing: 0,
  fillWeight: 0,
  hachureAngle: 0,
  hachureGap: 0,
  curveTightness: 0,
  curveStepCount: 0,
} as const;

describe('movePath', () => {
  it('moves primitive paths and group children consistently', () => {
    const brush: BrushPathData = {
      ...shapeBase,
      id: 'brush-1',
      tool: 'brush',
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 5 },
      ],
    };

    const movedBrush = movePath(brush, 5, -2);
    expect(movedBrush.points).toEqual([
      { x: 5, y: -2 },
      { x: 15, y: 3 },
    ]);

    const rect: RectangleData = {
      ...shapeBase,
      id: 'rect-1',
      tool: 'rectangle',
      x: 20,
      y: 30,
      width: 40,
      height: 20,
    };

    const group: GroupData = {
      ...shapeBase,
      id: 'group-1',
      tool: 'group',
      children: [rect],
    };

    const movedGroup = movePath(group, -3, 4);
    const movedChild = (movedGroup.children[0] as RectangleData);
    expect(movedChild.x).toBe(17);
    expect(movedChild.y).toBe(34);
  });
});

describe('scalePath', () => {
  it('applies scaling relative to the pivot and tracks sign flips', () => {
    const rect: RectangleData = {
      ...shapeBase,
      id: 'rect-2',
      tool: 'rectangle',
      x: 10,
      y: 20,
      width: 30,
      height: 10,
    };

    const scaled = scalePath(rect, { x: 10, y: 20 }, -1, 2);
    expect(scaled.x).toBe(-20);
    expect(scaled.y).toBe(20);
    expect(scaled.width).toBe(30);
    expect(scaled.height).toBe(20);
    expect(scaled.scaleX).toBe(-1);
    expect(scaled.scaleY).toBe(1);
  });

  it('scales group children recursively', () => {
    const child: RectangleData = {
      ...shapeBase,
      id: 'rect-3',
      tool: 'rectangle',
      x: 5,
      y: 5,
      width: 10,
      height: 6,
    };

    const group: GroupData = {
      ...shapeBase,
      id: 'group-2',
      tool: 'group',
      children: [child],
    };

    const pivot: Point = { x: 10, y: 10 };
    const scaledGroup = scalePath(group, pivot, 2, 3);
    const scaledChild = scaledGroup.children[0] as RectangleData;
    expect(scaledChild.width).toBeCloseTo(20);
    expect(scaledChild.height).toBeCloseTo(18);
    expect(scaledChild.x).toBeCloseTo(0);
    expect(scaledChild.y).toBeCloseTo(-5);
  });
});

describe('rotatePath', () => {
  it('updates axis-aligned shapes around an arbitrary center', () => {
    const rect: RectangleData = {
      ...shapeBase,
      id: 'rect-4',
      tool: 'rectangle',
      x: 20,
      y: 10,
      width: 10,
      height: 20,
      rotation: 0,
    };

    const rotated = rotatePath(rect, { x: 0, y: 0 }, Math.PI / 2);
    expect(rotated.x).toBeCloseTo(-25);
    expect(rotated.y).toBeCloseTo(15);
    expect(rotated.rotation).toBeCloseTo(Math.PI / 2);
  });

  it('rotates vector anchors and their handles', () => {
    const vector: VectorPathData = {
      ...shapeBase,
      id: 'line-1',
      tool: 'line',
      anchors: [
        {
          point: { x: 10, y: 0 },
          handleIn: { x: 5, y: 0 },
          handleOut: { x: 15, y: 0 },
        },
      ],
    };

    const rotated = rotatePath(vector, { x: 0, y: 0 }, Math.PI);
    const anchor = rotated.anchors[0];
    expect(anchor.point.x).toBeCloseTo(-10);
    expect(anchor.point.y).toBeCloseTo(0);
    expect(anchor.handleIn.x).toBeCloseTo(-5);
    expect(anchor.handleIn.y).toBeCloseTo(0);
    expect(anchor.handleOut.x).toBeCloseTo(-15);
    expect(anchor.handleOut.y).toBeCloseTo(0);
  });
});

describe('rotateResizeHandle', () => {
  it('re-maps handle positions according to rotation', () => {
    expect(rotateResizeHandle('top', Math.PI / 2)).toBe('right');
    expect(rotateResizeHandle('top-left', Math.PI)).toBe('bottom-right');
  });
});
