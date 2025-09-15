import type { Point } from '@/types';

export function dist(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

export function rotatePoint(point: Point, center: Point, angle: number): Point {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    const nx = (cos * dx) - (sin * dy) + center.x;
    const ny = (sin * dx) + (cos * dy) + center.y;
    return { x: nx, y: ny };
}

export function snapAngle(point: Point, origin: Point): Point {
    const angle = Math.atan2(point.y - origin.y, point.x - origin.x);
    // Snap to 45 degree increments (PI / 4)
    const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
    const distance = dist(point, origin);
    return {
        x: origin.x + distance * Math.cos(snappedAngle),
        y: origin.y + distance * Math.sin(snappedAngle),
    };
}

export const lerpPoint = (p1: Point, p2: Point, t: number): Point => ({
  x: p1.x + (p2.x - p1.x) * t,
  y: p1.y + (p2.y - p1.y) * t,
});
