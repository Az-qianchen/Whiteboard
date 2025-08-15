


import type { BBox, AnyPath, Point, RectangleData, EllipseData, ResizeHandlePosition, VectorPathData } from '../types';
import { samplePath } from './path-fitting';
import { dist } from './utils';

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
    case 'ellipse':
      return {
        x: path.x - halfStroke,
        y: path.y - halfStroke,
        width: path.width + path.strokeWidth,
        height: path.height + path.strokeWidth,
      };
    case 'pen':
    case 'line': {
      const anchoredPath = path as VectorPathData;
      if (!anchoredPath.anchors || anchoredPath.anchors.length < 1) {
        return { x: 0, y: 0, width: 0, height: 0 };
      }
      
      if (anchoredPath.anchors.length === 1) {
        const point = anchoredPath.anchors[0].point;
        return {
            x: point.x - halfStroke,
            y: point.y - halfStroke,
            width: path.strokeWidth,
            height: path.strokeWidth,
        };
      }

      // More accurate bbox by sampling the curve
      const points = samplePath(anchoredPath.anchors, 20, !!anchoredPath.isClosed);
      
      if (points.length === 0) {
        return { x: 0, y: 0, width: 0, height: 0 };
      }

      let minX = points[0].x, minY = points[0].y, maxX = points[0].x, maxY = points[0].y;

      for (let i = 1; i < points.length; i++) {
        const point = points[i];
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

export function resizePath(
    originalPath: RectangleData | EllipseData,
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

export function getPathsBoundingBox(paths: AnyPath[]): BBox | null {
  if (!paths || paths.length === 0) return null;

  const bboxes = paths.map(p => getPathBoundingBox(p, false));
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