/**
 * 本文件包含了图形命中检测的逻辑。
 * 它用于判断一个点是否与某个图形的描边或填充区域相交，
 * 或者一个图形是否与选择框相交。
 */

import type { Point, AnyPath, RectangleData, EllipseData, VectorPathData, BBox, ImageData, BrushPathData, PolygonData, ArcData, GroupData, TextData } from '../types';
import { samplePath, getPathBoundingBox, doBboxesIntersect, dist, rotatePoint, getPolygonVertices, sampleArc, isBboxInside } from './drawing';
import { parseColor } from './color';
import { gradientHasVisibleColor } from './gradient';

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

function hasVisibleFill(path: AnyPath): boolean {
    if (path.tool === 'image') {
        return true;
    }

    if (path.fillGradient) {
        return gradientHasVisibleColor(path.fillGradient);
    }

    const fill = (path.fill ?? '').trim();
    if (!fill) {
        return false;
    }

    const normalized = fill.toLowerCase();
    if (normalized === 'transparent' || normalized === 'none') {
        return false;
    }

    return parseColor(fill).a > 0.01;
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
            // For 'move' mode, hitting any child should count as hitting the group.
            const groupPath = path as GroupData;
            return groupPath.children.some(child => isPointHittingPath(point, child, scale));
        }
        case 'image':
        case 'frame':
        case 'rectangle': {
            const { x, y, width, height, rotation } = path as RectangleData | ImageData;
            let testPoint = point;

            if (rotation) {
                const center = { x: x + width / 2, y: y + height / 2 };
                testPoint = rotatePoint(point, center, -rotation);
            }

            const isFillVisible = hasVisibleFill(path);

            // Check for hit on the fill area first.
            const isInside = testPoint.x >= x && testPoint.x <= x + width && testPoint.y >= y && testPoint.y <= y + height;
            if (isInside && isFillVisible) return true;

            // If not inside, or if fill is transparent, check for hit on the stroke, which is important for transparent shapes.
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
        case 'text': {
            const textPath = path as TextData;
            const { x, y, width, height } = textPath;
            let testPoint = point;
            if (textPath.rotation) {
                const center = { x: x + width / 2, y: y + height / 2 };
                testPoint = rotatePoint(point, center, -(textPath.rotation ?? 0));
            }
            return testPoint.x >= x && testPoint.x <= x + width && testPoint.y >= y && testPoint.y <= y + height;
        }
        case 'polygon': {
            const { x, y, width, height, sides, rotation } = path as PolygonData;
            let testPoint = point;
            
            if (rotation) {
                const center = { x: x + width / 2, y: y + height / 2 };
                testPoint = rotatePoint(point, center, -rotation);
            }

            const isFillVisible = hasVisibleFill(path);
            const vertices = getPolygonVertices(x, y, width, height, sides);

            // Check for hit on fill area first.
            if (isFillVisible && isPointInPolygon(testPoint, vertices)) return true;

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

            const isFillVisible = hasVisibleFill(path);

            // Check for hit on fill using ellipse equation
            if (isFillVisible && rx > 0 && ry > 0) {
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

            if (vectorPath.isClosed) {
                const isFillVisible = hasVisibleFill(path);
                if (isFillVisible && isPointInPolygon(point, pathPoints)) {
                    return true;
                }
            }

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
 * Recursively finds the top-most, deepest path under a point, drilling into groups.
 * Used for 'edit' mode to select individual elements within groups.
 * @param point The point to check.
 * @param paths The array of paths to search through.
 * @param scale The current canvas zoom scale.
 * @returns The hit path, or null if no path was hit.
 */
export function findDeepestHitPath(point: Point, paths: AnyPath[], scale: number): AnyPath | null {
    // Iterate from top to bottom (visually), which is reverse order in the array.
    for (let i = paths.length - 1; i >= 0; i--) {
        const path = paths[i];
        if (path.isLocked) continue;

        // If it's a group, recurse into its children.
        if (path.tool === 'group') {
            // If the group is collapsed, we shouldn't be able to click its children.
            if ((path as GroupData).isCollapsed) continue;
            
            const hitChild = findDeepestHitPath(point, (path as GroupData).children, scale);
            if (hitChild) {
                return hitChild; // Return the specific child that was hit.
            }
        }

        // After checking children (if any), check the path itself.
        // For a group, this check is implicitly skipped because isPointHittingPath for groups only checks children,
        // which we've already done.
        if (isPointHittingPath(point, path, scale) && path.tool !== 'group') {
            return path; // Return the path if it's a primitive and it's hit.
        }
    }
    return null;
}


/**
 * Checks if a path's bounding box intersects with a marquee selection rectangle.
 * @param path The path to check.
 * @param marqueeRect The marquee selection rectangle.
 * @returns True if they intersect, false otherwise.
 */
export function isPathIntersectingMarquee(path: AnyPath, marqueeRect: BBox): boolean {
  const pathBbox = getPathBoundingBox(path, true);
  if (!pathBbox || !doBboxesIntersect(pathBbox, marqueeRect)) {
    return false;
  }

  // Full containment is an easy win
  if (isBboxInside(pathBbox, marqueeRect)) {
    return true;
  }
  
  const isPointInRect = (p: Point, rect: BBox) => 
        p.x >= rect.x && p.x <= rect.x + rect.width &&
        p.y >= rect.y && p.y <= rect.y + rect.height;

  // Check for partial intersection using sampled points
  let pathSamples: Point[] = [];
  switch (path.tool) {
    case 'group':
      return (path as GroupData).children.some(child => isPathIntersectingMarquee(child, marqueeRect));
    case 'brush':
      pathSamples = (path as BrushPathData).points;
      break;
    case 'arc':
      pathSamples = sampleArc((path as ArcData).points[0], (path as ArcData).points[1], (path as ArcData).points[2]);
      break;
    case 'pen':
    case 'line':
      pathSamples = samplePath((path as VectorPathData).anchors, 10, (path as VectorPathData).isClosed);
      break;
    case 'rectangle':
    case 'image':
    case 'polygon': {
        // For shapes, checking their vertices is a good approximation for intersection
        const vertices = (path.tool === 'polygon')
            ? getPolygonVertices(path.x, path.y, path.width, path.height, (path as PolygonData).sides)
            : getPolygonVertices(path.x, path.y, path.width, path.height, 4); // Treat rects as 4-sided polygons
        
        if (path.rotation) {
            const center = { x: path.x + path.width / 2, y: path.y + path.height / 2 };
            pathSamples = vertices.map(p => rotatePoint(p, center, path.rotation ?? 0));
        } else {
            pathSamples = vertices;
        }
        // Also check the center point for large shapes
        pathSamples.push({x: path.x + path.width/2, y: path.y + path.height/2});
        break;
    }
    case 'ellipse': {
        // Check center and 4 cardinal points on the ellipse boundary
        const { x, y, width, height, rotation } = path;
        const cx = x + width/2;
        const cy = y + height/2;
        const rx = width/2;
        const ry = height/2;
        let points = [
            {x: cx, y: cy},
            {x: cx + rx, y: cy},
            {x: cx - rx, y: cy},
            {x: cx, y: cy + ry},
            {x: cx, y: cy - ry},
        ];
        if (rotation) {
            pathSamples = points.map(p => rotatePoint(p, {x: cx, y: cy}, rotation));
        } else {
            pathSamples = points;
        }
        break;
    }
  }

  if (pathSamples.some(p => isPointInRect(p, marqueeRect))) {
    return true;
  }
  
  // The initial AABB check covers cases where the path bbox might contain the marquee,
  // which is a reasonable heuristic for selection.
  return false;
}

export function isPathIntersectingLasso(path: AnyPath, lassoPoints: Point[]): boolean {
    const pathBbox = getPathBoundingBox(path, true);
    if (!pathBbox) return false;

    if (lassoPoints.length < 3) return false;

    // Broad-phase check: if the path's bbox doesn't even intersect the lasso's bbox,
    // it can't possibly be contained. This is a good optimization.
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

    // For a group, all children must be contained.
    if (path.tool === 'group') {
        return (path as GroupData).children.every(child => isPathIntersectingLasso(child, lassoPoints));
    }

    // Generate a set of points representing the shape's boundary.
    let pointsToCheck: Point[] = [];
    switch (path.tool) {
        case 'brush': {
            const brushPath = path as BrushPathData;
            // For long brush strokes, sampling is more performant than checking every point.
            if (brushPath.points.length > 50) {
                 const step = Math.ceil(brushPath.points.length / 50);
                 for (let i = 0; i < brushPath.points.length; i += step) {
                     pointsToCheck.push(brushPath.points[i]);
                 }
                 // Always include the last point
                 if (pointsToCheck[pointsToCheck.length-1] !== brushPath.points[brushPath.points.length-1]) {
                     pointsToCheck.push(brushPath.points[brushPath.points.length-1]);
                 }
            } else {
                pointsToCheck = brushPath.points;
            }
            break;
        }
        case 'arc':
            pointsToCheck = sampleArc((path as ArcData).points[0], (path as ArcData).points[1], (path as ArcData).points[2], 30);
            break;
        case 'pen':
        case 'line':
            pointsToCheck = samplePath((path as VectorPathData).anchors, 20, (path as VectorPathData).isClosed);
            break;
        case 'rectangle':
        case 'image':
        case 'ellipse':
        case 'polygon': {
            const { x, y, width, height, rotation } = path;

            if (path.tool === 'ellipse') {
                const cx = x + width / 2;
                const cy = y + height / 2;
                const rx = width / 2;
                const ry = height / 2;
                // Sample 8 points on the ellipse boundary for a good approximation.
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * 2 * Math.PI;
                    pointsToCheck.push({ x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) });
                }
            } else {
                 const vertices = (path.tool === 'polygon')
                    ? getPolygonVertices(x, y, width, height, (path as PolygonData).sides)
                    : getPolygonVertices(x, y, width, height, 4);
                pointsToCheck = vertices;
            }

            if (rotation) {
                const center = { x: x + width / 2, y: y + height / 2 };
                pointsToCheck = pointsToCheck.map(p => rotatePoint(p, center, rotation ?? 0));
            }
            break;
        }
    }
    
    // If we have no points to check (e.g. single-point path), fall back to checking the bounding box corners.
    if (pointsToCheck.length === 0) {
        pointsToCheck = [
            { x: pathBbox.x, y: pathBbox.y },
            { x: pathBbox.x + pathBbox.width, y: pathBbox.y },
            { x: pathBbox.x + pathBbox.width, y: pathBbox.y + pathBbox.height },
            { x: pathBbox.x, y: pathBbox.y + pathBbox.height },
        ];
    }

    // The core logic: check if EVERY point of the shape is inside the lasso polygon for full containment.
    return pointsToCheck.every(p => isPointInPolygon(p, lassoPoints));
}
