import type { Point, AnyPath, Anchor, DragState, RectangleData, EllipseData, VectorPathData } from '../types';

/**
 * 计算两点之间的欧几里得距离。
 */
export function dist(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

/**
 * 根据视图变换将客户端坐标转换为 SVG 坐标。
 */
export const getPointerPosition = (
    e: {clientX: number, clientY: number}, 
    svg: SVGSVGElement, 
    viewTransform: { scale: number, translateX: number, translateY: number }
): Point => {
    const point = svg.createSVGPoint();
    point.x = e.clientX;
    point.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (ctm) {
      const svgPoint = point.matrixTransform(ctm.inverse());
      return {
        x: (svgPoint.x - viewTransform.translateX) / viewTransform.scale,
        y: (svgPoint.y - viewTransform.translateY) / viewTransform.scale,
      };
    }
    return { x: 0, y: 0 };
};


/**
 * 根据拖动状态更新路径中的锚点。
 * @param p - 要更新的路径。
 * @param dragState - 描述拖动操作的状态。
 * @param movePoint - 指针的当前位置。
 * @param breakSymmetry - 如果为 true，则在拖动控制柄时不对称地移动它们。
 * @returns 带有更新后锚点的新路径对象，类型与输入路径相同。
 */
export function updatePathAnchors<T extends AnyPath>(
  p: T,
  dragState: Extract<DragState, { type: 'anchor' | 'handleIn' | 'handleOut' }>,
  movePoint: Point,
  breakSymmetry?: boolean
): T {
  if (!('anchors' in p) || !p.anchors) return p;

  // Defensive check to prevent crashes if dragState is invalid or anchorIndex is out of bounds.
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

export function movePath<T extends AnyPath>(path: T, dx: number, dy: number): T {
    switch(path.tool) {
        case 'pen':
        case 'line':
            return {
                ...path,
                anchors: (path as VectorPathData).anchors.map(a => ({
                    point: { x: a.point.x + dx, y: a.point.y + dy },
                    handleIn: { x: a.handleIn.x + dx, y: a.handleIn.y + dy },
                    handleOut: { x: a.handleOut.x + dx, y: a.handleOut.y + dy },
                }))
            };
        case 'rectangle':
        case 'ellipse':
            return { ...path, x: path.x + dx, y: path.y + dy };
    }
}


/**
 * 在两点之间进行线性插值。
 */
const lerpPoint = (p1: Point, p2: Point, t: number): Point => ({
  x: p1.x + (p2.x - p1.x) * t,
  y: p1.y + (p2.y - p1.y) * t,
});

/**
 * 使用 de Casteljau 算法在给定的参数 t 处分割三次贝塞尔曲线。
 * 这会保留曲线的精确形状，但会修改相邻的控制手柄。
 * @returns 要插入的新锚点，以及周围锚点的新控制柄。
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
 * 在不更改相邻锚点的情况下，在贝塞尔曲线段上插入一个新锚点。
 * 这将改变曲线的形状，但会保留相邻锚点的控制柄。
 * @returns 要插入的新锚点。
 */
export const insertAnchorOnCurve = (startAnchor: Anchor, endAnchor: Anchor, t: number): Anchor => {
    // Helper to calculate a point on a cubic Bézier curve.
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
    
    // Helper to calculate the tangent on a cubic Bézier curve.
    // The derivative of the Bézier curve equation.
    const getTangentOnCubicBezier = (p0: Point, p1: Point, p2: Point, p3: Point, t: number) => {
        const u = 1 - t;
        const x = 3 * u * u * (p1.x - p0.x) + 6 * u * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x);
        const y = 3 * u * u * (p1.y - p0.y) + 6 * u * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y);
        return { x, y };
    };

    const newPoint = getPointOnCubicBezier(
        startAnchor.point,
        startAnchor.handleOut,
        endAnchor.handleIn,
        endAnchor.point,
        t
    );

    const tangent = getTangentOnCubicBezier(
        startAnchor.point,
        startAnchor.handleOut,
        endAnchor.handleIn,
        endAnchor.point,
        t
    );

    const tangentLength = Math.sqrt(tangent.x * tangent.x + tangent.y * tangent.y);
    
    // Avoid division by zero for zero-length tangents (e.g., at a cusp).
    // In this case, create a corner point.
    if (tangentLength < 1e-6) {
        return { point: newPoint, handleIn: newPoint, handleOut: newPoint };
    }
    
    const normalizedTangent = {
        x: tangent.x / tangentLength,
        y: tangent.y / tangentLength,
    };

    const d_prev = dist(newPoint, startAnchor.point);
    const d_next = dist(endAnchor.point, newPoint);
    // A heuristic for handle length to create a reasonably smooth curve.
    // This factor can be tuned.
    const scaleFactor = 0.25;

    const handleIn = {
        x: newPoint.x - normalizedTangent.x * d_prev * scaleFactor,
        y: newPoint.y - normalizedTangent.y * d_prev * scaleFactor,
    };
    const handleOut = {
        x: newPoint.x + normalizedTangent.x * d_next * scaleFactor,
        y: newPoint.y + normalizedTangent.y * d_next * scaleFactor,
    };

    return { point: newPoint, handleIn, handleOut };
};

/**
 * 计算点到线段的平方距离并返回参数 't'。
 * 使用平方距离性能稍高，因为它避免了开方运算。
 * @param p - 要检查的点。
 * @param p1 - 线段的起点。
 * @param p2 - 线段的终点。
 * @returns 包含平方距离和参数 't' (0 到 1) 的对象。
 */
export function getSqDistToSegment(p: Point, p1: Point, p2: Point): { distSq: number; t: number } {
    const l2 = (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2;
    if (l2 === 0) {
        return { distSq: (p.x - p1.x) ** 2 + (p.y - p1.y) ** 2, t: 0 };
    }
    let t = ((p.x - p1.x) * (p2.x - p1.x) + (p.y - p1.y) * (p2.y - p1.y)) / l2;
    const clampedT = Math.max(0, Math.min(1, t));
    const projX = p1.x + clampedT * (p2.x - p1.x);
    const projY = p1.y + clampedT * (p2.y - p1.y);
    const dx = p.x - projX;
    const dy = p.y - projY;
    return { distSq: dx * dx + dy * dy, t: clampedT };
}