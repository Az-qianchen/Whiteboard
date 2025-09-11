import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/drawing/convert', () => ({
  rectangleToVectorPath: () => ({}),
  ellipseToVectorPath: () => ({}),
  polygonToVectorPath: () => ({}),
}));

import { resizePath } from '@/lib/drawing/transform';
import { rotatePoint } from '@/lib/drawing/geom';
import type { ImageData } from '@/types';

describe('resizePath with rotation', () => {
  it('resizes a rotated image without collapsing the opposite axis', () => {
    const image: ImageData = {
      id: 'img',
      tool: 'image',
      src: '',
      x: 0,
      y: 0,
      width: 100,
      height: 80,
      rotation: Math.PI / 2,
      color: '',
      fill: '',
      fillStyle: '',
      strokeWidth: 0,
      roughness: 0,
      bowing: 0,
      fillWeight: 0,
      hachureAngle: 0,
      hachureGap: 0,
      curveTightness: 0,
      curveStepCount: 9,
    };

    const center = { x: image.x + image.width / 2, y: image.y + image.height / 2 };
    const initialPos = { x: center.x, y: center.y + image.width / 2 };
    const currentPos = { x: initialPos.x, y: initialPos.y + 20 };

    const resized = resizePath(image, 'right', currentPos, initialPos, false);

    expect(resized.width).toBeCloseTo(120);
    expect(resized.height).toBeCloseTo(80);
    expect(resized.x).toBeCloseTo(0);
    expect(resized.y).toBeCloseTo(0);
  });
});

describe('edge handles use diagonal anchors', () => {
  it('keeps the opposite corner fixed when dragging the top edge', () => {
    const rect: ImageData = {
      id: 'r',
      tool: 'image',
      src: '',
      x: 0,
      y: 0,
      width: 100,
      height: 80,
      rotation: 0,
      color: '',
      fill: '',
      fillStyle: '',
      strokeWidth: 0,
      roughness: 0,
      bowing: 0,
      fillWeight: 0,
      hachureAngle: 0,
      hachureGap: 0,
      curveTightness: 0,
      curveStepCount: 9,
    };

    const initialPos = { x: 10, y: 0 };
    const currentPos = { x: 10, y: -20 };

    const resized = resizePath(rect, 'top', currentPos, initialPos, false);

    expect(resized.x + resized.width).toBeCloseTo(100);
    expect(resized.y).toBeCloseTo(-20);
    expect(resized.height).toBeCloseTo(100);
  });
});

describe('resizePath flips across anchor', () => {
  it('mirrors the image when dragging a handle past the opposite corner', () => {
    const image: ImageData = {
      id: 'f',
      tool: 'image',
      src: '',
      x: 0,
      y: 0,
      width: 100,
      height: 80,
      rotation: Math.PI / 2,
      color: '',
      fill: '',
      fillStyle: '',
      strokeWidth: 0,
      roughness: 0,
      bowing: 0,
      fillWeight: 0,
      hachureAngle: 0,
      hachureGap: 0,
      curveTightness: 0,
      curveStepCount: 9,
    };

    const center = { x: image.x + image.width / 2, y: image.y + image.height / 2 };
    const initialPos = rotatePoint({ x: 0, y: image.height / 2 }, center, image.rotation!);
    const currentPos = rotatePoint({ x: image.width + 20, y: image.height / 2 }, center, image.rotation!);

    const resized = resizePath(image, 'left', currentPos, initialPos, false);

    expect(resized.scaleX).toBe(-1);
    expect(resized.x + resized.width).toBeCloseTo(100);
    expect(resized.width).toBeCloseTo(20);
    expect(resized.height).toBeCloseTo(80);
  });
});

