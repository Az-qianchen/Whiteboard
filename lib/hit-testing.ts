/**
 * This file contains logic for hit-testing, i.e., determining if a point
 * on the canvas intersects with a shape.
 */

import type { Point, AnyPath, RectangleData, EllipseData, VectorPathData, BBox } from '../types';
import { dist } from './utils';
import { samplePath } from './path-fitting';
import { getPathBoundingBox, doBboxesIntersect } from './geometry';

/**
 * Calculates the squared distance from a point to a line segment.
 * Using squared distance is slightly more performant as it avoids a square root.
 */
function distSqToSegment(p: Point, p1: Point, p2: Point): number {
    const l2 = (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2;
    if (l2 === 0) return (p.x - p1.x) ** 2 + (p.y - p1.y) ** 2;
    let t = ((p.x - p1.x) * (p2.x - p1.x) + (p.y - p1.y) * (p2.y - p1.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const dx = p.x - (p1.x + t * (p2.x - p1.x));
    const dy = p.y - (p1.y + t * (p2.y - p1.y));
    return dx * dx + dy * dy;
}

/**
 * Calculates the shortest distance from a point to a line segment.
 */
function distanceToSegment(p: Point, p1: Point, p2: Point): number {
    return Math.sqrt(distSqToSegment(p, p1, p2));
}

function sampleEllipse(cx: number, cy: number, rx: number, ry: number, steps: number = 32): Point[] {
    const points: Point[] = [];
    for (let i = 0; i <= steps; i++) {
        const angle = (i / steps) * 2 * Math.PI;
        points.push({ x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) });
    }
    return points;
}

/**
 * Checks if a point is hitting the stroke of a given path with a tolerance.
 * @param point The point to check.
 * @param path The path to check against.
 * @param scale The current canvas zoom scale, to adjust the hit threshold.
 * @returns True if the point is considered a "hit", false otherwise.
 */
export function isPointHittingPath(point: Point, path: AnyPath, scale: number): boolean {
    // The threshold is the clickable margin around the path in world-space coordinates.
    // It's the larger of a 5px screen margin (converted to world space) or half the path's stroke width.
    const threshold = Math.max(5 / scale, path.strokeWidth / 2);
    const thresholdSq = threshold * threshold;

    switch (path.tool) {
        case 'rectangle': {
            const { x, y, width, height } = path as RectangleData;
            const p1 = { x, y };
            const p2 = { x: x + width, y };
            const p3 = { x: x + width, y: y + height };
            const p4 = { x, y: y + height };
            return (
                distSqToSegment(point, p1, p2) < thresholdSq ||
                distSqToSegment(point, p2, p3) < thresholdSq ||
                distSqToSegment(point, p3, p4) < thresholdSq ||
                distSqToSegment(point, p4, p1) < thresholdSq
            );
        }
        case 'ellipse': {
            const { x, y, width, height } = path as EllipseData;
            const cx = x + width / 2;
            const cy = y + height / 2;
            const rx = Math.abs(width / 2);
            const ry = Math.abs(height / 2);
            
            // If the ellipse is essentially a point, check distance to center
            if (rx < threshold && ry < threshold) {
              return dist(point, {x: cx, y: cy}) < threshold;
            }

            // Sample points along the ellipse and check distance to the segments
            const ellipsePoints = sampleEllipse(cx, cy, rx, ry);
            for (let i = 0; i < ellipsePoints.length - 1; i++) {
                if (distSqToSegment(point, ellipsePoints[i], ellipsePoints[i+1]) < thresholdSq) {
                    return true;
                }
            }
            return false;
        }
        case 'pen':
        case 'line': {
            const vectorPath = path as VectorPathData;
            if (!vectorPath.anchors || vectorPath.anchors.length === 0) return false;
            
            // For single-point paths (dots)
            if (vectorPath.anchors.length === 1) {
                return dist(point, vectorPath.anchors[0].point) < threshold;
            }
            
            const pathPoints = samplePath(vectorPath.anchors, 20, vectorPath.isClosed);
            if (pathPoints.length < 2) return false;

            for (let i = 0; i < pathPoints.length - 1; i++) {
                if (distSqToSegment(point, pathPoints[i], pathPoints[i+1]) < thresholdSq) {
                    return true;
                }
            }
            return false;
        }
        default:
            return false;
    }
}

/**
 * Checks if a path's bounding box intersects with a marquee selection rectangle.
 * @param path The path to check.
 * @param marqueeRect The marquee selection rectangle.
 * @returns True if they intersect, false otherwise.
 */
export function isPathIntersectingMarquee(path: AnyPath, marqueeRect: BBox): boolean {
  const pathBbox = getPathBoundingBox(path, true); // Check against the visual bounding box
  if (!pathBbox) return false;

  // A simple bbox intersection check is usually sufficient and performant.
  return doBboxesIntersect(pathBbox, marqueeRect);
}
