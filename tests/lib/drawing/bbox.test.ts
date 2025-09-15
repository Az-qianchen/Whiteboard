import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/drawing/convert', () => ({
  rectangleToVectorPath: () => ({}),
  ellipseToVectorPath: () => ({}),
  polygonToVectorPath: () => ({}),
}));

import { resizePath } from '@/lib/drawing/transform/resize';
import { getPathBoundingBox } from '@/lib/drawing/bbox';
import { rotatePoint } from '@/lib/drawing/geom';
import type { ImageData } from '@/types';

describe('getPathBoundingBox with flipped images', () => {
  it('reflects scaleX and scaleY for rotated images', () => {
    const image: ImageData = {
      id: 'b',
      tool: 'image',
      src: '',
      x: 0,
      y: 0,
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
    const initialPos = rotatePoint({ x: 0, y: image.height / 2 }, center, image.rotation!);
    const currentPos = rotatePoint({ x: image.width + 20, y: image.height / 2 }, center, image.rotation!);
    const resized = resizePath(image, 'left', currentPos, initialPos, false);

    const bbox = getPathBoundingBox(resized);

    const cx = resized.x + resized.width / 2;
    const cy = resized.y + resized.height / 2;
    const corners = [
      { x: resized.x, y: resized.y },
      { x: resized.x + resized.width, y: resized.y },
      { x: resized.x + resized.width, y: resized.y + resized.height },
      { x: resized.x, y: resized.y + resized.height },
    ].map(p => {
      let tx = cx + (p.x - cx) * (resized.scaleX ?? 1);
      let ty = cy + (p.y - cy) * (resized.scaleY ?? 1);
      return rotatePoint({ x: tx, y: ty }, { x: cx, y: cy }, resized.rotation!);
    });

    const minX = Math.min(...corners.map(p => p.x));
    const minY = Math.min(...corners.map(p => p.y));
    const maxX = Math.max(...corners.map(p => p.x));
    const maxY = Math.max(...corners.map(p => p.y));

    expect(bbox.x).toBeCloseTo(minX);
    expect(bbox.y).toBeCloseTo(minY);
    expect(bbox.width).toBeCloseTo(maxX - minX);
    expect(bbox.height).toBeCloseTo(maxY - minY);
  });
});
