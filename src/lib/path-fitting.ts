/**
 * 本文件包含路径拟合、简化和采样的相关函数。
 * 它实现了将手绘笔迹（点数组）平滑化并转换为贝塞尔曲线路径的算法，
 * 同时包含了 Ramer-Douglas-Peucker 算法用于路径简化。
 */

import type { Point, Anchor } from '../types';

const isFinitePoint = (p: Point | undefined | null): p is Point => !!p && Number.isFinite(p.x) && Number.isFinite(p.y);

/**
 * Converts an array of points to a simple, non-smoothed SVG path string (polyline).
 * This is used for the live preview of the brush tool to avoid "wobble".
 */
export function pointsToSimplePathD(points: Point[]): string {
  const pts = points.filter(isFinitePoint);
  if (pts.length < 2) {
    return pts.length === 1 ? `M ${pts[0].x} ${pts[0].y} L ${pts[0].x} ${pts[0].y}` : '';
  }

  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    d += ` L ${pts[i].x} ${pts[i].y}`;
  }
  return d;
}

/**
 * Converts an array of points to a smoothed cubic Bezier SVG path string,
 * mimicking RoughJS's 'curve' method.
 * This is used for live preview of smoothed paths like the line tool.
 */
export function pointsToPathD(points: Point[], curveTightness: number = 0): string {
  const pts = points.filter(isFinitePoint);
  const len = pts.length;
  
  if (len < 2) {
    return len === 1 ? `M ${pts[0].x} ${pts[0].y} L ${pts[0].x} ${pts[0].y}` : '';
  }
  if (len === 2) {
    return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;
  }

  const tension = 1 - curveTightness;
  let d = `M${pts[0].x},${pts[0].y} `;

  for (let i = 0; i < len - 1; i++) {
    const p0 = (i === 0) ? pts[0] : pts[i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = (i === len - 2) ? pts[len - 1] : pts[i + 2];
    
    const cp1x = p1.x + (p2.x - p0.x) / 6 * tension;
    const cp1y = p1.y + (p2.y - p0.y) / 6 * tension;

    const cp2x = p2.x - (p3.x - p1.x) / 6 * tension;
    const cp2y = p2.y - (p3.y - p1.y) / 6 * tension;

    d += `C${cp1x},${cp1y},${cp2x},${cp2y},${p2.x},${p2.y} `;
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
