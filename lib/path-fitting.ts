/**
 * This file contains functions for path fitting, simplification, and sampling.
 * It includes a vendored version of the 'points-on-curve' library for smoothing
 * live freehand brush strokes and also includes utilities for converting brush
 * strokes into vector-based bezier curves.
 */
import type { Point, Anchor, LivePath, BrushPathData } from '../types';
import { dist } from './utils';
// The 'points-on-curve' library is now included at the bottom of this file.

/**
 * Converts an array of points to a smoothed SVG path string using the vendored 'points-on-curve' algorithm.
 * This is used for live preview of the brush tool.
 */
export function pointsToPathD(points: Point[]): string {
  if (points.length < 2) {
    return points.length === 1 ? `M ${points[0].x} ${points[0].y} L ${points[0].x} ${points[0].y}` : '';
  }

  // The 'points-on-curve' algorithm returns an array of [x, y] pairs.
  const curvePoints = pointsOnCurve(points.map((p: Point) => [p.x, p.y]));
  if (!curvePoints || curvePoints.length === 0) return '';
  
  let d = `M ${curvePoints[0][0]} ${curvePoints[0][1]}`;
  for (let i = 1; i < curvePoints.length; i++) {
    d += ` L ${curvePoints[i][0]} ${curvePoints[i][1]}`;
  }
  return d;
}


/**
 * Converts an array of anchors to a cubic bezier SVG path string.
 * @param anchors - The array of anchors.
 * @param isClosed - If true, a closing curve segment will be added from the last to the first anchor.
 */
export function anchorsToPathD(anchors: Anchor[], isClosed: boolean = false): string {
  if (anchors.length === 0) {
    return '';
  }

  let d = `M ${anchors[0].point.x} ${anchors[0].point.y}`;

  if (anchors.length > 1) {
    for (let i = 0; i < anchors.length - 1; i++) {
      const start = anchors[i];
      const end = anchors[i + 1];
      d += ` C ${start.handleOut.x},${start.handleOut.y} ${end.handleIn.x},${end.handleIn.y} ${end.point.x},${end.point.y}`;
    }
  }
  
  if (isClosed && anchors.length > 1) {
    const start = anchors[anchors.length - 1];
    const end = anchors[0];
    d += ` C ${start.handleOut.x},${start.handleOut.y} ${end.handleIn.x},${end.handleIn.y} ${end.point.x},${end.point.y} Z`;
  }
  
  return d;
}

// --- Path Fitting and Simplification for Brush Tool ---

function perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
    const { x: x0, y: y0 } = point;
    const { x: x1, y: y1 } = lineStart;
    const { x: x2, y: y2 } = lineEnd;
    
    const dx = x2 - x1;
    const dy = y2 - y1;

    if (dx === 0 && dy === 0) return dist(point, lineStart);

    const numerator = Math.abs(dy * x0 - dx * y0 + x2 * y1 - y2 * x1);
    const denominator = Math.sqrt(dy * dy + dx * dx);
    return numerator / denominator;
}

function ramerDouglasPeucker(points: Point[], epsilon: number): Point[] {
    if (points.length < 3) return points;

    let dmax = 0;
    let index = 0;
    const end = points.length - 1;

    for (let i = 1; i < end; i++) {
        const d = perpendicularDistance(points[i], points[0], points[end]);
        if (d > dmax) {
            index = i;
            dmax = d;
        }
    }

    if (dmax > epsilon) {
        const recResults1 = ramerDouglasPeucker(points.slice(0, index + 1), epsilon);
        const recResults2 = ramerDouglasPeucker(points.slice(index), epsilon);
        return recResults1.slice(0, recResults1.length - 1).concat(recResults2);
    } else {
        return [points[0], points[end]];
    }
}

function fitCurve(points: Point[], scaleFactor: number = 0.2): Anchor[] {
    if (points.length < 2) {
        return points.map(p => ({ point: p, handleIn: p, handleOut: p }));
    }

    const anchors: Anchor[] = [];
    
    for (let i = 0; i < points.length; i++) {
        const p_i = points[i];
        const p_prev = points[i - 1] || p_i;
        const p_next = points[i + 1] || p_i;
        
        const tangentX = p_next.x - p_prev.x;
        const tangentY = p_next.y - p_prev.y;
        const tangentLength = Math.sqrt(tangentX * tangentX + tangentY * tangentY);

        let handleOut: Point;
        if (i < points.length - 1) {
             const d_next = dist(p_next, p_i);
             handleOut = {
                x: p_i.x + (tangentX / tangentLength) * d_next * scaleFactor,
                y: p_i.y + (tangentY / tangentLength) * d_next * scaleFactor,
            };
        } else {
            handleOut = p_i;
        }

        let handleIn: Point;
        if (i > 0) {
            const d_prev = dist(p_i, p_prev);
            handleIn = {
                x: p_i.x - (tangentX / tangentLength) * d_prev * scaleFactor,
                y: p_i.y - (tangentY / tangentLength) * d_prev * scaleFactor,
            };
        } else {
            handleIn = p_i;
        }
        
        anchors.push({ point: p_i, handleIn, handleOut });
    }
    
    return anchors;
}


export function convertBrushPathToVector(path: LivePath): BrushPathData {
    const epsilon = path.strokeWidth * 0.5;
    const simplifiedPoints = ramerDouglasPeucker(path.points, epsilon);
    
    const anchors = fitCurve(simplifiedPoints);

    return {
        id: path.id,
        tool: 'brush',
        anchors,
        color: path.color,
        fill: path.fill,
        fillStyle: path.fillStyle,
        strokeWidth: path.strokeWidth,
        roughness: path.roughness,
        bowing: path.bowing,
        fillWeight: path.fillWeight,
        hachureAngle: path.hachureAngle,
        hachureGap: path.hachureGap,
        curveTightness: path.curveTightness,
        curveStepCount: path.curveStepCount,
    };
}


// --- Path Sampling for Rendering ---

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

// --- Vendored code from 'points-on-curve' library ---
// https://github.com/pshihn/points-on-curve
// A tiny library to smooth a polyline.
// Copyright (C) 2017 by P.S. Hihn <phi@cke.fi> (MIT License)

type CurvePoint = [number, number];

function rdp(points: CurvePoint[], tolerance: number): CurvePoint[] {
  if (points.length <= 2) {
    return points;
  }
  const first = points[0];
  const last = points[points.length - 1];
  let max = -1;
  let index = -1;
  for (let i = 1; i < points.length - 1; i++) {
    const d = pld(points[i], first, last);
    if (d > max) {
      max = d;
      index = i;
    }
  }
  if (max > tolerance) {
    const p1 = points.slice(0, index + 1);
    const p2 = points.slice(index);
    const r1 = rdp(p1, tolerance);
    const r2 = rdp(p2, tolerance);
    return r1.slice(0, r1.length - 1).concat(r2);
  }
  return [first, last];
}

function pld(p: CurvePoint, a: CurvePoint, b: CurvePoint): number {
  const x0 = p[0];
  const y0 = p[1];
  const x1 = a[0];
  const y1 = a[1];
  const x2 = b[0];
  const y2 = b[1];
  const n = Math.abs((y2 - y1) * x0 - (x2 - x1) * y0 + x2 * y1 - y2 * x1);
  const d = Math.sqrt(Math.pow(y2 - y1, 2) + Math.pow(x2 - x1, 2));
  return n / d;
}

function cmr(p1: CurvePoint, p2: CurvePoint, p3: CurvePoint, p4: CurvePoint, n: number): CurvePoint[] {
  const result: CurvePoint[] = [];
  for (let i = 1; i < n; i++) {
    const t = i * (1 / n);
    const t2 = Math.pow(t, 2);
    const t3 = Math.pow(t, 3);
    const x =
      0.5 *
      ((2 * p2[0]) +
        (-p1[0] + p3[0]) * t +
        (2 * p1[0] - 5 * p2[0] + 4 * p3[0] - p4[0]) * t2 +
        (-p1[0] + 3 * p2[0] - 3 * p3[0] + p4[0]) * t3);
    const y =
      0.5 *
      ((2 * p2[1]) +
        (-p1[1] + p3[1]) * t +
        (2 * p1[1] - 5 * p2[1] + 4 * p3[1] - p4[1]) * t2 +
        (-p1[1] + 3 * p2[1] - 3 * p3[1] + p4[1]) * t3);
    result.push([x, y]);
  }
  return result;
}

function pointsOnCurve(points: CurvePoint[], tolerance?: number, distance?: number): CurvePoint[] {
  tolerance = tolerance || 1;
  distance = distance || 10;
  if (points.length <= 2) {
    return points;
  }
  points = rdp(points, tolerance);
  let result: CurvePoint[] = [points[0]];
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[Math.max(0, i - 1)];
    const p2 = points[i];
    const p3 = points[i + 1];
    const p4 = points[Math.min(points.length - 1, i + 2)];
    const n = Math.round(
      Math.sqrt(Math.pow(p3[0] - p2[0], 2) + Math.pow(p3[1] - p2[1], 2)) / distance
    );
    if (n > 1) {
      const curve = cmr(p1, p2, p3, p4, n);
      result = result.concat(curve);
    }
  }
  result.push(points[points.length - 1]);
  return result;
}
