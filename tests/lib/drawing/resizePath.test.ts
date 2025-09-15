import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/drawing/convert', () => ({
  rectangleToVectorPath: () => ({}),
  ellipseToVectorPath: () => ({}),
  polygonToVectorPath: () => ({}),
}));

import { resizePath } from '@/lib/drawing/transform/resize';
import { rotatePoint } from '@/lib/drawing/geom';
import type { ImageData } from '@/types';

describe('resizePath with rotation', () => {
  it('keeps the diagonal anchor fixed while resizing a rotated image', () => {
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

    const anchorBefore = rotatePoint({ x: image.x, y: image.y }, center, image.rotation!);

    const resized = resizePath(image, 'right', currentPos, initialPos, false);

    expect(resized.width).toBeCloseTo(120);
    expect(resized.height).toBeCloseTo(80);

    const newCenter = { x: resized.x + resized.width / 2, y: resized.y + resized.height / 2 };
    const anchorAfter = rotatePoint({ x: resized.x, y: resized.y }, newCenter, image.rotation!);

    expect(anchorAfter.x).toBeCloseTo(anchorBefore.x);
    expect(anchorAfter.y).toBeCloseTo(anchorBefore.y);
  });

  it('maintains the opposite corner when resizing a rotated image from a corner handle', () => {
    const image: ImageData = {
      id: 'img2',
      tool: 'image',
      src: '',
      x: 10,
      y: 20,
      width: 100,
      height: 80,
      rotation: Math.PI / 4,
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
    const initialPos = rotatePoint({ x: image.x + image.width, y: image.y + image.height }, center, image.rotation!);
    const currentPos = rotatePoint({ x: image.x + image.width + 30, y: image.y + image.height + 10 }, center, image.rotation!);

    const anchorBefore = rotatePoint({ x: image.x, y: image.y }, center, image.rotation!);

    const resized = resizePath(image, 'bottom-right', currentPos, initialPos, false);

    expect(resized.width).toBeCloseTo(130);
    expect(resized.height).toBeCloseTo(90);

    const newCenter = { x: resized.x + resized.width / 2, y: resized.y + resized.height / 2 };
    const anchorAfter = rotatePoint({ x: resized.x, y: resized.y }, newCenter, image.rotation!);

    expect(anchorAfter.x).toBeCloseTo(anchorBefore.x);
    expect(anchorAfter.y).toBeCloseTo(anchorBefore.y);
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
  it('mirrors across local X and keeps anchor fixed', () => {
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
    const anchorLocal = { x: image.x, y: image.y };
    const anchorBefore = rotatePoint(anchorLocal, center, image.rotation!);
    const initialLocal = { x: image.x + image.width, y: image.y + image.height };
    const initialPos = rotatePoint(initialLocal, center, image.rotation!);
    const currentLocal = { x: -initialLocal.x, y: initialLocal.y };
    const currentPos = rotatePoint(currentLocal, center, image.rotation!);

    const resized = resizePath(image, 'bottom-right', currentPos, initialPos, false);

    const newCenter = { x: resized.x + resized.width / 2, y: resized.y + resized.height / 2 };
    const anchorLocalAfter = {
      x: resized.scaleX < 0 ? resized.x + resized.width : resized.x,
      y: resized.scaleY < 0 ? resized.y + resized.height : resized.y,
    };
    const anchorAfter = rotatePoint(anchorLocalAfter, newCenter, image.rotation!);

    expect(resized.scaleX).toBe(-1);
    expect(anchorAfter.x).toBeCloseTo(anchorBefore.x);
    expect(anchorAfter.y).toBeCloseTo(anchorBefore.y);
  });
});

describe('resizePath uses local axes for flips', () => {
  it('only flips when crossing the anchor on each local axis', () => {
    const image: ImageData = {
      id: 'gh',
      tool: 'image',
      src: '',
      x: 0,
      y: 0,
      width: 100,
      height: 60,
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
    const anchorLocal = { x: image.x, y: image.y };
    const initialLocal = { x: image.x + image.width, y: image.y + image.height };
    const initialPos = rotatePoint(initialLocal, center, image.rotation!);

    const mirroredLocalX = { x: anchorLocal.x - (initialLocal.x - anchorLocal.x), y: initialLocal.y };
    const mirroredX = rotatePoint(mirroredLocalX, center, image.rotation!);
    const resized = resizePath(image, 'bottom-right', mirroredX, initialPos, false);

    expect(resized.scaleX).toBe(-1);
    expect(resized.scaleY).toBeCloseTo(1);

    const mirroredLocalY = { x: initialLocal.x, y: anchorLocal.y - (initialLocal.y - anchorLocal.y) };
    const mirroredY = rotatePoint(mirroredLocalY, center, image.rotation!);
    const resizedY = resizePath(image, 'bottom-right', mirroredY, initialPos, false);

    expect(resizedY.scaleX).toBeCloseTo(1);
    expect(resizedY.scaleY).toBe(-1);
  });
});

