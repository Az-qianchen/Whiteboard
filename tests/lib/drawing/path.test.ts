import { describe, it, expect } from 'vitest';
import { getRoundedRectPathD, getSqDistToSegment } from '@/lib/drawing/path';

describe('path helpers', () => {
  it('getRoundedRectPathD produces correct sharp rect when radius ~ 0', () => {
    const d = getRoundedRectPathD(10, 20, 100, 50, 0);
    expect(d).toBe('M10,20 L110,20 L110,70 L10,70 Z');
  });

  it('getRoundedRectPathD includes arcs when radius > 0', () => {
    const d = getRoundedRectPathD(0, 0, 100, 50, 10);
    expect(d).toContain('A10,10');
    expect(d.startsWith('M10,0 L90,0')).toBe(true);
  });

  it('getSqDistToSegment projects within segment and clamps t', () => {
    const { distSq, t } = getSqDistToSegment({ x: 5, y: 5 }, { x: 0, y: 0 }, { x: 10, y: 0 });
    expect(t).toBeGreaterThanOrEqual(0);
    expect(t).toBeLessThanOrEqual(1);
    expect(distSq).toBeCloseTo(25, 6); // distance to x-axis at y=5
  });
});
