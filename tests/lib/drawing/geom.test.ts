import { describe, it, expect } from 'vitest';
import { dist, rotatePoint, snapAngle, lerpPoint } from '@/lib/drawing/geom';

describe('geom utilities', () => {
  it('dist computes Euclidean distance', () => {
    expect(dist({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(dist({ x: 1, y: 1 }, { x: 1, y: 1 })).toBe(0);
  });

  it('rotatePoint rotates around center by radians', () => {
    const p = rotatePoint({ x: 1, y: 0 }, { x: 0, y: 0 }, Math.PI / 2);
    expect(p.x).toBeCloseTo(0, 6);
    expect(p.y).toBeCloseTo(1, 6);
  });

  it('snapAngle snaps to 45° increments', () => {
    const origin = { x: 0, y: 0 };
    const near45 = { x: 1, y: 0.9 };
    const snapped = snapAngle(near45, origin);
    const ratio = snapped.y / snapped.x;
    expect(ratio).toBeCloseTo(1, 2); // ~tan(45°)
  });

  it('lerpPoint interpolates linearly', () => {
    const p = lerpPoint({ x: 0, y: 0 }, { x: 10, y: 10 }, 0.25);
    expect(p).toEqual({ x: 2.5, y: 2.5 });
  });
});
