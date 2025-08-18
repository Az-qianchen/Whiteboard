import type { Point, Anchor, DragState, AnyPath } from '../../types';
import { lerpPoint, dist } from './geom';

export function sampleCubicBezier(p0: Point, p1: Point, p2: Point, p3: Point, steps: number): Point[] {
  const points: Point[] = [];
  const numSteps = Math.max(1, Math.round(steps));
  for (let i = 0; i <= numSteps; i++) {
    const t = i / numSteps;
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;

    const x = uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x;
    const y = uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y;
    points.push({ x, y });
  }
  return points;
}

export function samplePath(anchors: Anchor[], stepsPerSegment: number, isClosed: boolean = false): Point[] {
  if (anchors.length < 2) {
    return anchors.map(a => a.point);
  }

  const allPoints: Point[] = [anchors[0].point];
  for (let i = 0; i < anchors.length - 1; i++) {
    const start = anchors[i];
    const end = anchors[i + 1];
    
    const segmentPoints = sampleCubicBezier(
      start.point,
      start.handleOut,
      end.handleIn,
      end.point,
      stepsPerSegment
    );
    
    allPoints.push(...segmentPoints.slice(1));
  }

  if (isClosed && anchors.length > 1) {
    const start = anchors[anchors.length - 1];
    const end = anchors[0];
    const closingSegmentPoints = sampleCubicBezier(
      start.point,
      start.handleOut,
      end.handleIn,
      end.point,
      stepsPerSegment
    );
    allPoints.push(...closingSegmentPoints.slice(1));
  }

  return allPoints;
}

export function updatePathAnchors<T extends AnyPath>(
  p: T,
  dragState: Extract<DragState, { type: 'anchor' | 'handleIn' | 'handleOut' }>,
  movePoint: Point,
  breakSymmetry?: boolean
): T {
  if (!('anchors' in p) || !p.anchors) return p;

  if (!dragState || typeof (dragState as any).anchorIndex !== 'number' || (dragState as any).anchorIndex >= p.anchors.length) {
    return p;
  }
    
  const anchors = [...p.anchors];
  const anchorToUpdate = { ...anchors[dragState.anchorIndex] };
  
  switch (dragState.type) {
    case 'anchor': {
      const dx = movePoint.x - anchorToUpdate.point.x;
      const dy = movePoint.y - anchorToUpdate.point.y;
      anchorToUpdate.point = movePoint;
      anchorToUpdate.handleIn = { x: anchorToUpdate.handleIn.x + dx, y: anchorToUpdate.handleIn.y + dy };
      anchorToUpdate.handleOut = { x: anchorToUpdate.handleOut.x + dx, y: anchorToUpdate.handleOut.y + dy };
      break;
    }
    case 'handleOut': {
      anchorToUpdate.handleOut = movePoint;
      if (!breakSymmetry) {
        const dx = anchorToUpdate.point.x - movePoint.x;
        const dy = anchorToUpdate.point.y - movePoint.y;
        anchorToUpdate.handleIn = { x: anchorToUpdate.point.x + dx, y: anchorToUpdate.point.y + dy };
      }
      break;
    }
    case 'handleIn': {
      anchorToUpdate.handleIn = movePoint;
      if (!breakSymmetry) {
        const dx = anchorToUpdate.point.x - movePoint.x;
        const dy = anchorToUpdate.point.y - movePoint.y;
        anchorToUpdate.handleOut = { x: anchorToUpdate.point.x + dx, y: anchorToUpdate.point.y + dy };
      }
      break;
    }
  }
  anchors[dragState.anchorIndex] = anchorToUpdate;
  return { ...p, anchors };
}

export const splitBezierCurve = (p0: Point, p1: Point, p2: Point, p3: Point, t: number) => {
  const p01 = lerpPoint(p0, p1, t);
  const p12 = lerpPoint(p1, p2, t);
  const p23 = lerpPoint(p2, p3, t);
  const p012 = lerpPoint(p01, p12, t);
  const p123 = lerpPoint(p12, p23, t);
  const newPoint = lerpPoint(p012, p123, t);

  return {
    newAnchorPoint: newPoint,
    newAnchorHandleIn: p012,
    newAnchorHandleOut: p123,
    updatedStartHandleOut: p01,
    updatedEndHandleIn: p23,
  };
};

export const insertAnchorOnCurve = (startAnchor: Anchor, endAnchor: Anchor, t: number): Anchor => {
    const getPointOnCubicBezier = (p0: Point, p1: Point, p2: Point, p3: Point, t: number) => {
        const u = 1 - t;
        const tt = t * t;
        const uu = u * u;
        const uuu = uu * u;
        const ttt = tt * t;

        const x = uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x;
        const y = uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y;
        return { x, y };
    };
    
    const getTangentOnCubicBezier = (p0: Point, p1: Point, p2: Point, p3: Point, t: number) => {
        const u = 1 - t;
        const x = 3 * u * u * (p1.x - p0.x) + 6 * u * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x);
        const y = 3 * u * u * (p1.y - p0.y) + 6 * u * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y);
        return { x, y };
    };

    const newPoint = getPointOnCubicBezier(startAnchor.point, startAnchor.handleOut, endAnchor.handleIn, endAnchor.point, t);
    const tangent = getTangentOnCubicBezier(startAnchor.point, startAnchor.handleOut, endAnchor.handleIn, endAnchor.point, t);
    const tangentLength = Math.sqrt(tangent.x * tangent.x + tangent.y * tangent.y);
    const handleDist = dist(startAnchor.point, endAnchor.point) * 0.15;

    let handleIn = newPoint, handleOut = newPoint;
    if (tangentLength > 0) {
        handleOut = {
            x: newPoint.x + (tangent.x / tangentLength) * handleDist,
            y: newPoint.y + (tangent.y / tangentLength) * handleDist,
        };
        handleIn = {
            x: newPoint.x - (tangent.x / tangentLength) * handleDist,
            y: newPoint.y - (tangent.y / tangentLength) * handleDist,
        };
    }
    
    return { point: newPoint, handleIn, handleOut };
};

export function getSqDistToSegment(p: Point, p1: Point, p2: Point): { distSq: number; t: number } {
  const l2 = (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2;
  if (l2 === 0) {
    const distSq = (p.x - p1.x) ** 2 + (p.y - p1.y) ** 2;
    return { distSq, t: 0 };
  }
  let t = ((p.x - p1.x) * (p2.x - p1.x) + (p.y - p1.y) * (p2.y - p1.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projection = {
    x: p1.x + t * (p2.x - p1.x),
    y: p1.y + t * (p2.y - p1.y)
  };
  const distSq = (p.x - projection.x) ** 2 + (p.y - projection.y) ** 2;
  return { distSq, t };
}
