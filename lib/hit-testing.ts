/**
 * 本文件包含了图形命中检测的逻辑。
 * 它用于判断一个点是否与某个图形的描边或填充区域相交，
 * 或者一个图形是否与选择框相交。
 */

import type { Point, AnyPath, RectangleData, EllipseData, VectorPathData, BBox, ImageData, BrushPathData, PolygonData, ArcData, GroupData } from '../types';
import { samplePath, getPathBoundingBox, doBboxesIntersect, dist, rotatePoint, getPolygonVertices, sampleArc } from './drawing';

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

export function isPointInPolygon(point: Point, vs: Point[]): boolean {
    const x = point.x, y = point.y;
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        const xi = vs[i].x, yi = vs[i].y;
        const xj = vs[j].x, yj = vs[j].y;
        const intersect = ((yi > y) !== (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
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
        case 'brush': {
            const brushPath = path as BrushPathData;
            if (!brushPath.points || brushPath.points.length < 2) {
                if (brushPath.points && brushPath.points.length === 1) {
                    return dist(point, brushPath.points[0]) < threshold;
                }
                return false;
            }
            for (let i = 0; i < brushPath.points.length - 1; i++) {
                if (distSqToSegment(point, brushPath.points[i], brushPath.points[i+1]) < thresholdSq) {
                    return true;
                }
            }
            return false;
        }
        case 'arc': {
            const arcPath = path as ArcData;
            const pathPoints = sampleArc(arcPath.points[0], arcPath.points[1], arcPath.points[2]);
            if (pathPoints.length < 2) return false;

            for (let i = 0; i < pathPoints.length - 1; i++) {
                if (distSqToSegment(point, pathPoints[i], pathPoints[i+1]) < thresholdSq) {
                    return true;
                }
            }
            return false;
        }
        case 'group': {
            const groupPath = path as GroupData;
            return groupPath.children.some(child => isPointHittingPath(point, child, scale));
        }
        case 'image':
        case 'rectangle': {
            const { x, y, width, height, rotation } = path as RectangleData | ImageData;
            let testPoint = point;

            if (rotation) {
                const center = { x: x + width / 2, y: y + height / 2 };
                testPoint = rotatePoint(point, center, -rotation);
            }
            
            // Check for hit on the fill area first. This is the most common case.
            const isInside = testPoint.x >= x && testPoint.x <= x + width && testPoint.y >= y && testPoint.y <= y + height;
            if (isInside) return true;

            // If not inside, check for hit on the stroke, which is important for transparent shapes.
            const p1 = { x, y };
            const p2 = { x: x + width, y };
            const p3 = { x: x + width, y: y + height };
            const p4 = { x, y: y + height };
            return (
                distSqToSegment(testPoint, p1, p2) < thresholdSq ||
                distSqToSegment(testPoint, p2, p3) < thresholdSq ||
                distSqToSegment(testPoint, p3, p4) < thresholdSq ||
                distSqToSegment(testPoint, p4, p1) < thresholdSq
            );
        }
        case 'polygon': {
            const { x, y, width, height, sides, rotation } = path as PolygonData;
            let testPoint = point;
            
            if (rotation) {
                const center = { x: x + width / 2, y: y + height / 2 };
                testPoint = rotatePoint(point, center, -rotation);
            }
            
            const vertices = getPolygonVertices(x, y, width, height, sides);

            // Check for hit on fill area first.
            if (isPointInPolygon(testPoint, vertices)) return true;

            // If not inside, check for hit on the stroke.
            for (let i = 0; i < vertices.length; i++) {
                const p1 = vertices[i];
                const p2 = vertices[(i + 1) % vertices.length];
                if (distSqToSegment(testPoint, p1, p2) < thresholdSq) {
                    return true;
                }
            }
            return false;
        }
        case 'ellipse': {
            const { x, y, width, height, rotation } = path as EllipseData;
            const cx = x + width / 2;
            const cy = y + height / 2;
            const rx = Math.abs(width / 2);
            const ry = Math.abs(height / 2);
            
            // If the ellipse is essentially a point, check distance to center
            if (rx < threshold && ry < threshold) {
              return dist(point, {x: cx, y: cy}) < threshold;
            }

            let testPoint = point;
            if (rotation) {
                const center = { x: cx, y: cy };
                testPoint = rotatePoint(point, center, -rotation);
            }

            // Check for hit on fill using ellipse equation
            if (rx > 0 && ry > 0) {
                const dx = testPoint.x - cx;
                const dy = testPoint.y - cy;
                const value = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
                if (value <= 1) return true;
            }

            // If not inside, check for hit on stroke by sampling
            const ellipsePoints = sampleEllipse(cx, cy, rx, ry);
            for (let i = 0; i < ellipsePoints.length - 1; i++) {
                if (distSqToSegment(testPoint, ellipsePoints[i], ellipsePoints[i+1]) < thresholdSq) {
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

export function isPathIntersectingLasso(path: AnyPath, lassoPoints: Point[]): boolean {
    const pathBbox = getPathBoundingBox(path, true);
    if (!pathBbox) return false;

    if (lassoPoints.length < 3) return false;

    let minX = lassoPoints[0].x, minY = lassoPoints[0].y, maxX = lassoPoints[0].x, maxY = lassoPoints[0].y;
    for (const p of lassoPoints) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
    }
    const lassoBbox = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };

    if (!doBboxesIntersect(pathBbox, lassoBbox)) {
        return false;
    }

    const bboxPoints = [
        { x: pathBbox.x, y: pathBbox.y },
        { x: pathBbox.x + pathBbox.width, y: pathBbox.y },
        { x: pathBbox.x + pathBbox.width, y: pathBbox.y + pathBbox.height },
        { x: pathBbox.x, y: pathBbox.y + pathBbox.height },
    ];
    if (bboxPoints.some(p => isPointInPolygon(p, lassoPoints))) {
        return true;
    }

    const center = { x: pathBbox.x + pathBbox.width / 2, y: pathBbox.y + pathBbox.height / 2 };
    if (isPointInPolygon(center, lassoPoints)) {
        return true;
    }
    
    let pathSamples: Point[] = [];
    switch (path.tool) {
        case 'brush':
            pathSamples = (path as BrushPathData).points;
            break;
        case 'arc':
            pathSamples = sampleArc((path as ArcData).points[0], (path as ArcData).points[1], (path as ArcData).points[2]);
            break;
        case 'pen':
        case 'line':
            pathSamples = samplePath((path as VectorPathData).anchors, 20, (path as VectorPathData).isClosed);
            break;
        case 'group':
            return (path as GroupData).children.some(child => isPathIntersectingLasso(child, lassoPoints));
        default:
            pathSamples = bboxPoints;
    }

    if (pathSamples.some(p => isPointInPolygon(p, lassoPoints))) {
        return true;
    }
    
    return false;
}