import type { BBox, AnyPath, Point, RectangleData, EllipseData, ResizeHandlePosition, VectorPathData, ImageData, Anchor, DragState } from '../types';

// --- Basic Geometry & Point Manipulation ---

/**
 * 计算两点之间的欧几里得距离。
 */
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

/**
 * Snaps a point to 45-degree angle increments relative to an origin point.
 * @param point The point to snap.
 * @param origin The origin point.
 * @returns The new, snapped point.
 */
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

/**
 * 在两点之间进行线性插值。
 */
const lerpPoint = (p1: Point, p2: Point, t: number): Point => ({
  x: p1.x + (p2.x - p1.x) * t,
  y: p1.y + (p2.y - p1.y) * t,
});


// --- Bounding Box Calculations ---

/**
 * 计算路径的边界框，会考虑其所有锚点和控制手柄。
 * 这提供了更精确地包含整个曲线的边界框。
 * @param path - 要计算边界框的路径。
 * @param includeStroke - Whether to include the stroke width in the calculation.
 * @returns 路径的边界框，已根据其描边宽度进行扩展。
 */
export function getPathBoundingBox(path: AnyPath, includeStroke: boolean = true): BBox {
  const halfStroke = includeStroke ? (path.strokeWidth || 0) / 2 : 0;

  switch (path.tool) {
    case 'rectangle':
    case 'image': {
      const { x, y, width, height, rotation } = path;
      if (!rotation) {
        return {
          x: x - halfStroke,
          y: y - halfStroke,
          width: width + path.strokeWidth,
          height: height + path.strokeWidth,
        };
      }

      const center = { x: x + width / 2, y: y + height / 2 };
      const corners = [
        { x: x, y: y },
        { x: x + width, y: y },
        { x: x + width, y: y + height },
        { x: x, y: y + height },
      ].map(p => rotatePoint(p, center, rotation));

      const minX = Math.min(...corners.map(p => p.x));
      const minY = Math.min(...corners.map(p => p.y));
      const maxX = Math.max(...corners.map(p => p.x));
      const maxY = Math.max(...corners.map(p => p.y));

      return {
        x: minX - halfStroke,
        y: minY - halfStroke,
        width: (maxX - minX) + path.strokeWidth,
        height: (maxY - minY) + path.strokeWidth,
      };
    }
     case 'ellipse': {
        const { x, y, width, height, rotation } = path;
        const cx = x + width/2;
        const cy = y + height/2;

        if (!rotation) {
             return {
                x: x - halfStroke,
                y: y - halfStroke,
                width: width + path.strokeWidth,
                height: height + path.strokeWidth,
            };
        }

        const angle = rotation;
        const rx = width / 2;
        const ry = height / 2;
        
        // Correct AABB calculation for a rotated ellipse
        const cosAngle = Math.cos(angle);
        const sinAngle = Math.sin(angle);
        
        const newWidth = 2 * Math.sqrt(Math.pow(rx * cosAngle, 2) + Math.pow(ry * sinAngle, 2));
        const newHeight = 2 * Math.sqrt(Math.pow(rx * sinAngle, 2) + Math.pow(ry * cosAngle, 2));

        return {
            x: cx - newWidth / 2 - halfStroke,
            y: cy - newHeight / 2 - halfStroke,
            width: newWidth + path.strokeWidth,
            height: newHeight + path.strokeWidth,
        }
    }
    case 'pen':
    case 'line': {
      const anchoredPath = path as VectorPathData;
      if (!anchoredPath.anchors || anchoredPath.anchors.length < 1) {
        return { x: 0, y: 0, width: 0, height: 0 };
      }
      
      // Bbox from control cage (all points, handles in, handles out)
      // This is an approximation but avoids a dependency cycle with path-fitting
      const allPoints: Point[] = [];
      anchoredPath.anchors.forEach(a => {
        allPoints.push(a.point, a.handleIn, a.handleOut);
      });
      
      let minX = allPoints[0].x, minY = allPoints[0].y, maxX = allPoints[0].x, maxY = allPoints[0].y;

      for (let i = 1; i < allPoints.length; i++) {
        const point = allPoints[i];
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
      }
      
      return {
        x: minX - halfStroke,
        y: minY - halfStroke,
        width: (maxX - minX) + path.strokeWidth,
        height: (maxY - minY) + path.strokeWidth,
      };
    }
  }
}


export function getPathsBoundingBox(paths: AnyPath[], includeStroke: boolean = false): BBox | null {
  if (!paths || paths.length === 0) return null;

  const bboxes = paths.map(p => getPathBoundingBox(p, includeStroke));
  if (bboxes.length === 0) return null;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  for (const bbox of bboxes) {
    minX = Math.min(minX, bbox.x);
    minY = Math.min(minY, bbox.y);
    maxX = Math.max(maxX, bbox.x + bbox.width);
    maxY = Math.max(maxY, bbox.y + bbox.height);
  }
  
  if (!isFinite(minX)) return null;

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * 根据其起始点和结束点计算框选矩形的位置和尺寸。
 * @param marquee - 包含起始点和结束点的框选对象。
 * @returns 一个具有 x, y, width, height 属性的对象。
 */
export function getMarqueeRect(marquee: { start: Point; end: Point }): BBox {
  const x = Math.min(marquee.start.x, marquee.end.x);
  const y = Math.min(marquee.start.y, marquee.end.y);
  const width = Math.abs(marquee.start.x - marquee.end.x);
  const height = Math.abs(marquee.start.y - marquee.end.y);
  return { x, y, width, height };
}

/**
 * 检查两个边界框是否相交。
 * @param box1 - 第一个边界框。
 * @param box2 - 第二个边界框。
 * @returns 如果边界框相交，则返回 true，否则返回 false。
 */
export function doBboxesIntersect(box1: BBox, box2: BBox): boolean {
  // 检查 x 轴上是否有重叠
  const xOverlap = box1.x < box2.x + box2.width && box1.x + box1.width > box2.x;
  // 检查 y 轴上是否有重叠
  const yOverlap = box1.y < box2.y + box2.height && box1.y + box1.height > box2.y;
  
  return xOverlap && yOverlap;
}


// --- Path & Shape Transformations ---

export function resizePath(
    originalPath: RectangleData | EllipseData | ImageData,
    handle: ResizeHandlePosition,
    currentPos: Point,
    initialPos: Point,
    keepAspectRatio: boolean
): AnyPath {
    const dx = currentPos.x - initialPos.x;
    const dy = currentPos.y - initialPos.y;

    // Rectangle and Ellipse logic
    let { x, y, width, height } = originalPath;
    const originalAspectRatio = width / height;

    const handleLeft = handle.includes('left');
    const handleRight = handle.includes('right');
    const handleTop = handle.includes('top');
    const handleBottom = handle.includes('bottom');
    
    if (handleRight) width += dx;
    if (handleBottom) height += dy;
    if (handleLeft) {
      width -= dx;
      x += dx;
    }
    if (handleTop) {
      height -= dy;
      y += dy;
    }

    if (keepAspectRatio) {
        if (handle.includes('left') || handle.includes('right')) {
            const newHeight = width / originalAspectRatio;
            if (handleTop) {
              y += height - newHeight;
            }
            height = newHeight;
        } else { // top, bottom, or corners
             const newWidth = height * originalAspectRatio;
             if (handleLeft) {
               x += width - newWidth;
             }
             width = newWidth;
        }
    }
    
    // Prevent flipping
    if (width < 0) {
      x += width;
      width = -width;
    }
    if (height < 0) {
      y += height;
      height = -height;
    }

    return { ...originalPath, x, y, width, height };
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
        case 'image':
            return { ...path, x: path.x + dx, y: path.y + dy };
    }
}

export function rotatePath<T extends AnyPath>(path: T, center: Point, angle: number): T {
    switch (path.tool) {
        case 'pen':
        case 'line': {
            const vectorPath = path as VectorPathData;
            const newAnchors = vectorPath.anchors.map(anchor => ({
                point: rotatePoint(anchor.point, center, angle),
                handleIn: rotatePoint(anchor.handleIn, center, angle),
                handleOut: rotatePoint(anchor.handleOut, center, angle),
            }));
            return { ...path, anchors: newAnchors };
        }
        case 'rectangle':
        case 'ellipse':
        case 'image': {
            const shape = path as RectangleData | EllipseData | ImageData;
            // The shape's own center point in its original position
            const originalShapeCenter = { x: shape.x + shape.width / 2, y: shape.y + shape.height / 2 };
            // The shape's new center point after being rotated around the selection's center
            const newShapeCenter = rotatePoint(originalShapeCenter, center, angle);
            // Calculate the new top-left corner (x, y) based on the new center
            const newX = newShapeCenter.x - shape.width / 2;
            const newY = newShapeCenter.y - shape.height / 2;
            // The shape's internal rotation also increases by the same angle
            const newRotation = (shape.rotation ?? 0) + angle;
            return {
                ...path,
                x: newX,
                y: newY,
                rotation: newRotation
            };
        }
    }
}

export function flipPath<T extends AnyPath>(path: T, center: Point, axis: 'horizontal' | 'vertical'): T {
    const flipPoint = (p: Point): Point => {
        if (axis === 'horizontal') {
            return { x: 2 * center.x - p.x, y: p.y };
        } else { // vertical
            return { x: p.x, y: 2 * center.y - p.y };
        }
    };

    switch (path.tool) {
        case 'pen':
        case 'line': {
            const vectorPath = path as VectorPathData;
            const newAnchors = vectorPath.anchors.map(anchor => {
                const newPoint = flipPoint(anchor.point);
                // When flipping, the role of in/out handles is reversed.
                const newHandleIn = flipPoint(anchor.handleOut);
                const newHandleOut = flipPoint(anchor.handleIn);
                return { point: newPoint, handleIn: newHandleIn, handleOut: newHandleOut };
            });
            // Reverse anchors for open paths to maintain drawing direction
            if (!vectorPath.isClosed) {
                newAnchors.reverse();
            }
            return { ...path, anchors: newAnchors };
        }
        case 'rectangle':
        case 'ellipse':
        case 'image': {
            const shapePath = path as RectangleData | EllipseData | ImageData;
            // To correctly flip a rotated shape, we convert it to a vector path, flip that,
            // and then potentially convert back if we wanted to preserve its primitive type.
            // For simplicity here, we'll convert to a vector path.
            let vectorPath: VectorPathData;
            if (path.tool === 'rectangle') {
                vectorPath = rectangleToVectorPath(path as RectangleData);
            } else if (path.tool === 'ellipse') {
                vectorPath = ellipseToVectorPath(path as EllipseData);
            } else {
                 const rectData: RectangleData = { ...path, tool: 'rectangle' };
                 vectorPath = rectangleToVectorPath(rectData);
            }
            
            const flippedAnchors = vectorPath.anchors.map(anchor => {
                const newPoint = flipPoint(anchor.point);
                const newHandleIn = flipPoint(anchor.handleOut);
                const newHandleOut = flipPoint(anchor.handleIn);
                return { point: newPoint, handleIn: newHandleIn, handleOut: newHandleOut };
            });
            
            return {
                ...path,
                id: `${path.id}-flipped`,
                tool: 'pen',
                anchors: flippedAnchors,
                isClosed: true
            } as any;
        }
    }
}


// --- Primitive to Vector Conversions ---

export function rectangleToVectorPath(path: RectangleData): VectorPathData {
    const { id, x, y, width, height, rotation, ...baseProps } = path;

    let corners: Point[] = [
        { x, y }, // top-left
        { x: x + width, y }, // top-right
        { x: x + width, y: y + height }, // bottom-right
        { x, y: y + height }, // bottom-left
    ];

    if (rotation) {
        const center = { x: x + width / 2, y: y + height / 2 };
        corners = corners.map(p => rotatePoint(p, center, rotation));
    }

    const anchors: Anchor[] = corners.map(p => ({ point: p, handleIn: p, handleOut: p }));

    return {
        ...baseProps,
        id: `${Date.now()}-v`,
        tool: 'pen',
        anchors,
        isClosed: true,
    };
}

export function ellipseToVectorPath(path: EllipseData): VectorPathData {
    const { id, x, y, width, height, rotation, ...baseProps } = path;
    const rx = width / 2;
    const ry = height / 2;
    const cx = x + rx;
    const cy = y + ry;

    // kappa is a constant for approximating a circle with 4 cubic bezier curves
    const kappa = 0.552284749831; 
    const ox = rx * kappa; // control point offset for x-axis
    const oy = ry * kappa; // control point offset for y-axis

    let anchors: Anchor[] = [
        // Top point
        { point: { x: cx, y: cy - ry }, handleIn: { x: cx - ox, y: cy - ry }, handleOut: { x: cx + ox, y: cy - ry } },
        // Right point
        { point: { x: cx + rx, y: cy }, handleIn: { x: cx + rx, y: cy - oy }, handleOut: { x: cx + rx, y: cy + oy } },
        // Bottom point
        { point: { x: cx, y: cy + ry }, handleIn: { x: cx + ox, y: cy + ry }, handleOut: { x: cx - ox, y: cy + ry } },
        // Left point
        { point: { x: cx - rx, y: cy }, handleIn: { x: cx - rx, y: cy + oy }, handleOut: { x: cx - rx, y: cy - oy } },
    ];
    
    if (rotation) {
        const center = { x: cx, y: cy };
        anchors = anchors.map(a => ({
            point: rotatePoint(a.point, center, rotation),
            handleIn: rotatePoint(a.handleIn, center, rotation),
            handleOut: rotatePoint(a.handleOut, center, rotation),
        }));
    }

    return {
        ...baseProps,
        id: `${Date.now()}-v`,
        tool: 'pen',
        anchors,
        isClosed: true,
    };
}


// --- Vector Path Mutations ---

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


// --- Hit-Testing & Distance Calculations ---

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