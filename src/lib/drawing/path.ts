/**
 * 本文件包含了用于处理和生成 SVG 路径数据的核心函数。
 * 它负责将应用内部的路径对象（如锚点数组）转换为 SVG `d` 属性字符串，
 * 并提供了路径采样、更新和操作的实用工具。
 */

import type { Point, Anchor, DragState, AnyPath, BrushPathData, VectorPathData, RectangleData, PolygonData, EllipseData, ArcData, FrameData, TextData } from '@/types';
import { lerpPoint, dist } from './geom';
import { getPolygonPathD } from './polygon';
import { calculateArcPathD } from './arc';
import { pointsToPathD, anchorsToPathD } from '../path-fitting';


/**
 * 在三次贝塞尔曲线上采样点。
 * @param p0 - 起点
 * @param p1 - 控制点1
 * @param p2 - 控制点2
 * @param p3 - 终点
 * @param steps - 采样步数
 * @returns 采样点数组
 */
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

/**
 * 对由锚点定义的整个路径进行采样。
 * @param anchors - 锚点数组
 * @param stepsPerSegment - 每个曲线段的采样步数
 * @param isClosed - 路径是否闭合
 * @returns 路径上的采样点数组
 */
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

/**
 * 根据拖拽状态更新路径的锚点。
 * @param p - 要更新的路径
 * @param dragState - 当前的拖拽状态
 * @param movePoint - 指针的当前位置
 * @param breakSymmetry - 是否在拖拽控制手柄时断开对称性
 * @returns 更新后的路径
 */
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

/**
 * 在给定的 t 值处分割贝塞尔曲线。
 * @param p0, p1, p2, p3 - 贝塞尔曲线的四个点
 * @param t - 分割位置 (0-1)
 * @returns 分割后的新点和更新后的控制手柄
 */
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

/**
 * 在贝塞尔曲线上插入一个新的锚点。
 * @param startAnchor - 起始锚点
 * @param endAnchor - 结束锚点
 * @param t - 插入位置 (0-1)
 * @returns 新的锚点对象
 */
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

/**
 * 计算点到线段的平方距离。
 * @param p - 点
 * @param p1 - 线段起点
 * @param p2 - 线段终点
 * @returns 包含平方距离和在线段上的投影位置 (t) 的对象
 */
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

/**
 * 生成圆角矩形的 SVG 路径字符串。
 * @returns SVG 路径 `d` 属性字符串。
 */
export function getRoundedRectPathD(x: number, y: number, width: number, height: number, radius: number): string {
    const r = Math.min(radius, width / 2, height / 2);
    if (r <= 0.1) {
        return `M${x},${y} L${x + width},${y} L${x + width},${y + height} L${x},${y + height} Z`;
    }
    
    const x_r = x + r;
    const x_w_r = x + width - r;
    const y_r = y + r;
    const y_h_r = y + height - r;
    const x_w = x + width;
    const y_h = y + height;

    return `M${x_r},${y} L${x_w_r},${y} A${r},${r} 0 0 1 ${x_w},${y_r} L${x_w},${y_h_r} A${r},${r} 0 0 1 ${x_w_r},${y_h} L${x_r},${y_h} A${r},${r} 0 0 1 ${x},${y_h_r} L${x},${y_r} A${r},${r} 0 0 1 ${x_r},${y} Z`;
}

/**
 * 为任何类型的路径生成一个（非手绘风格的）SVG 路径字符串。
 * 用于选择高亮、导出等。
 * @param data - 任何路径对象
 * @returns SVG 路径 `d` 属性字符串。
 */
export function getPathD(data: AnyPath): string {
    let d = '';

    switch (data.tool) {
        case 'brush': {
            const pathData = data as BrushPathData;
            if (pathData.points && pathData.points.length > 0) {
                d = pointsToPathD(pathData.points, data.curveTightness);
            }
            break;
        }
        case 'pen': {
            const pathData = data as VectorPathData;
            if (pathData.anchors && pathData.anchors.length > 0) {
                d = anchorsToPathD(pathData.anchors, !!pathData.isClosed);
            }
            break;
        }
        case 'line': {
            const pathData = data as VectorPathData;
            if (pathData.anchors && pathData.anchors.length > 0) {
                const points = pathData.anchors.map(a => a.point);
                d = pointsToPathD(points, pathData.curveTightness);
            }
            break;
        }
        case 'frame':
        case 'rectangle': {
            const { x, y, width, height, borderRadius } = data as RectangleData;
            d = getRoundedRectPathD(x, y, width, height, borderRadius ?? 0);
            break;
        }
        case 'polygon': {
            const { x, y, width, height, sides, borderRadius } = data as PolygonData;
            d = getPolygonPathD(x, y, width, height, sides, borderRadius);
            break;
        }
        case 'ellipse': { 
            const { x, y, width, height } = data as EllipseData;
            const rx = width / 2;
            const ry = height / 2;
            const cx = x + rx;
            const cy = y + ry;
            d = `M${cx - rx},${cy} A${rx},${ry} 0 1 0 ${cx + rx},${cy} A${rx},${ry} 0 1 0 ${cx - rx},${cy}Z`;
            break;
        }
        case 'text': {
            const { x, y, width, height } = data as TextData;
            d = getRoundedRectPathD(x, y, width, height, 0);
            break;
        }
        case 'arc': {
            const arcData = data as ArcData;
            const calculatedD = calculateArcPathD(arcData.points[0], arcData.points[1], arcData.points[2]);
            if (calculatedD) {
                d = calculatedD;
            }
            break;
        }
    }
    return d;
}