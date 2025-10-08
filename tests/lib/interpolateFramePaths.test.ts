/**
 * 测试插值生成帧路径时的几何与颜色过渡效果。
 */
import { describe, it, expect } from 'vitest';
import { interpolateFramePaths } from '@/lib/animation/interpolatePaths';
import type { RectangleData, TextData } from '@/types';

const createRectangle = (overrides: Partial<RectangleData> = {}): RectangleData => ({
  id: overrides.id ?? 'rect',
  tool: 'rectangle',
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  color: '#ff0000',
  fill: '#ff0000',
  fillStyle: 'solid',
  strokeWidth: 2,
  roughness: 1,
  bowing: 0,
  fillWeight: 0,
  hachureAngle: 0,
  hachureGap: 0,
  curveTightness: 0,
  curveStepCount: 0,
  endpointSize: 1,
  ...overrides,
});

const createText = (overrides: Partial<TextData> = {}): TextData => ({
  id: overrides.id ?? 'text',
  tool: 'text',
  x: 0,
  y: 0,
  width: 200,
  height: 50,
  color: '#000000',
  fill: '#000000',
  fillStyle: 'solid',
  strokeWidth: 1,
  roughness: 1,
  bowing: 0,
  fillWeight: 0,
  hachureAngle: 0,
  hachureGap: 0,
  curveTightness: 0,
  curveStepCount: 0,
  endpointSize: 1,
  text: 'Hello',
  fontFamily: 'Inter',
  fontSize: 16,
  lineHeight: 20,
  textAlign: 'left',
  ...overrides,
});

describe('interpolateFramePaths', () => {
  it('linearly interpolates rectangle geometry and color', () => {
    const fromRect = createRectangle({ x: 0, y: 0, color: '#ff0000', fill: '#ff0000' });
    const toRect = createRectangle({ x: 200, y: 100, color: '#00ff00', fill: '#00ff00' });

    const [result] = interpolateFramePaths([fromRect], [toRect], 0.5);

    expect(result.x).toBeCloseTo(100);
    expect(result.y).toBeCloseTo(50);
    expect(result.color).toBe('hsla(60, 100%, 50%, 1)');
    expect(result.fill).toBe('hsla(60, 100%, 50%, 1)');
  });

  it('interpolates text size, position, and color', () => {
    const fromText = createText({
      x: 0,
      y: 0,
      fontSize: 16,
      lineHeight: 20,
      color: '#000000',
      fill: '#000000',
    });
    const toText = createText({
      x: 100,
      y: 40,
      fontSize: 32,
      lineHeight: 40,
      color: '#ffffff',
      fill: '#ffffff',
    });

    const [result] = interpolateFramePaths([fromText], [toText], 0.25);

    expect(result.x).toBeCloseTo(25);
    expect(result.y).toBeCloseTo(10);
    expect(result.fontSize).toBeCloseTo(20);
    expect(result.lineHeight).toBeCloseTo(25);
    expect(result.color).toBe('hsla(0, 0%, 25%, 1)');
  });

  it('falls back to existing side when only one frame has the path', () => {
    const rectangle = createRectangle({ id: 'rect-only' });

    const resultFrom = interpolateFramePaths([rectangle], [], 0.75);
    expect(resultFrom).toHaveLength(1);
    expect(resultFrom[0]).not.toBe(rectangle);
    expect(resultFrom[0].id).toBe('rect-only');

    const resultTo = interpolateFramePaths([], [rectangle], 0.25);
    expect(resultTo).toHaveLength(1);
    expect(resultTo[0]).not.toBe(rectangle);
    expect(resultTo[0].id).toBe('rect-only');
  });
});

