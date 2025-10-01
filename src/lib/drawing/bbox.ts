import type {
  BBox,
  AnyPath,
  Point,
  VectorPathData,
  BrushPathData,
  ArcData,
  GroupData,
  RectangleData,
  ImageData,
  PolygonData,
  EllipseData,
  FrameData,
  TextData,
} from '@/types';
import { rotatePoint } from './geom';
import { samplePath } from './path';
import { getPolygonVertices } from './polygon';
import { sampleArc } from './arc';
import { DEFAULT_ROUGHNESS, DEFAULT_BOWING } from '@/constants';
import { applyMatrixToPoint, getShapeTransformMatrix } from './transform/matrix';
import { parseColor } from '../color';
import { gradientHasVisibleColor } from '../gradient';
import { layoutText, MIN_TEXT_WIDTH } from '@/lib/text';

const hasVisibleFill = (path: AnyPath): boolean => {
  if (path.fillGradient) {
    return gradientHasVisibleColor(path.fillGradient);
  }
  if (!path.fill || path.fill === 'transparent') {
    return false;
  }
  return parseColor(path.fill).a > 0.01;
};

export function getPathBoundingBox(path: AnyPath, includeStroke: boolean = true): BBox {
  let margin = 0;

  if (includeStroke) {
    const halfStroke = (path.strokeWidth || 0) / 2;
    // isRough 默认为 true（如果未定义）
    if (path.isRough !== false) {
      const roughAmount = (path.roughness ?? DEFAULT_ROUGHNESS);
      const bowingAmount = (path.bowing ?? DEFAULT_BOWING);
      // RoughJS 的默认 fillWeight 是描边宽度的一半。我们在缓冲区计算中复制该行为。
      const fillWeight = (path.fillWeight != null && path.fillWeight >= 0) ? path.fillWeight : (path.strokeWidth / 2);
      const halfFillWeight = hasVisibleFill(path) ? fillWeight / 2 : 0;
      
      // 描边的总视觉范围是其半宽加上粗糙度和弯曲度引起的偏差。
      const strokeOutset = halfStroke + roughAmount + bowingAmount;
      
      // 填充的影线也具有粗糙度和宽度（fillWeight），这可能导致它们伸出。
      const fillOutset = halfFillWeight + roughAmount;
      
      // 最终边距是这两个可能伸出范围中的最大值。
      margin = Math.max(strokeOutset, fillOutset);
    } else {
      // 对于非粗糙形状，边距就是描边宽度。
      margin = halfStroke;
    }
  }

  switch (path.tool) {
    case 'brush': {
      const brushPath = path as BrushPathData;
      if (!brushPath.points || brushPath.points.length < 1) {
        return { x: 0, y: 0, width: 0, height: 0 };
      }
      
      let minX = brushPath.points[0].x, minY = brushPath.points[0].y, maxX = brushPath.points[0].x, maxY = brushPath.points[0].y;

      for (let i = 1; i < brushPath.points.length; i++) {
        const point = brushPath.points[i];
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
      }
      
      return {
        x: minX - margin,
        y: minY - margin,
        width: (maxX - minX) + margin * 2,
        height: (maxY - minY) + margin * 2,
      };
    }
    case 'arc': {
      const arcPath = path as ArcData;
      const sampledPoints = sampleArc(arcPath.points[0], arcPath.points[1], arcPath.points[2]);
      
      let minX = sampledPoints[0].x, minY = sampledPoints[0].y, maxX = sampledPoints[0].x, maxY = sampledPoints[0].y;
      for (let i = 1; i < sampledPoints.length; i++) {
          const point = sampledPoints[i];
          minX = Math.min(minX, point.x);
          maxX = Math.max(maxX, point.x);
          minY = Math.min(minY, point.y);
          maxY = Math.max(maxY, point.y);
      }
      
      return {
          x: minX - margin,
          y: minY - margin,
          width: (maxX - minX) + margin * 2,
          height: (maxY - minY) + margin * 2,
      };
    }
    case 'group': {
      const groupPath = path as GroupData;

      if (groupPath.mask === 'clip' && groupPath.children.length > 0) {
        const maskShape = groupPath.children[groupPath.children.length - 1];
        const maskBbox = getPathBoundingBox(maskShape, includeStroke);
        return maskBbox || { x: 0, y: 0, width: 0, height: 0 };
      }

      const bbox = getPathsBoundingBox(groupPath.children, includeStroke);
      return bbox || { x: 0, y: 0, width: 0, height: 0 };
    }
    case 'frame':
    case 'rectangle':
    case 'image': {
      const { x, y, width, height } = path;
      const matrix = getShapeTransformMatrix(path as RectangleData | ImageData | FrameData);
      const corners = [
        { x, y },
        { x: x + width, y },
        { x: x + width, y: y + height },
        { x, y: y + height },
      ].map(point => applyMatrixToPoint(matrix, point));

      const minX = Math.min(...corners.map(p => p.x));
      const minY = Math.min(...corners.map(p => p.y));
      const maxX = Math.max(...corners.map(p => p.x));
      const maxY = Math.max(...corners.map(p => p.y));

      return {
        x: minX - margin,
        y: minY - margin,
        width: (maxX - minX) + margin * 2,
        height: (maxY - minY) + margin * 2,
      };
    }
    case 'polygon': {
      const { x, y, width, height, sides } = path;
      const matrix = getShapeTransformMatrix(path as PolygonData);
      const vertices = getPolygonVertices(x, y, width, height, sides).map(point => applyMatrixToPoint(matrix, point));

      const minX = Math.min(...vertices.map(p => p.x));
      const minY = Math.min(...vertices.map(p => p.y));
      const maxX = Math.max(...vertices.map(p => p.x));
      const maxY = Math.max(...vertices.map(p => p.y));

      return {
        x: minX - margin,
        y: minY - margin,
        width: (maxX - minX) + margin * 2,
        height: (maxY - minY) + margin * 2,
      };
    }
    case 'text': {
      const textPath = path as TextData;
      const layout = layoutText({
        text: textPath.text,
        width: Math.max(textPath.width, MIN_TEXT_WIDTH),
        fontFamily: textPath.fontFamily,
        fontSize: textPath.fontSize,
        lineHeight: textPath.lineHeight,
      });
      const matrix = getShapeTransformMatrix(textPath);
      const corners = [
        { x: textPath.x, y: textPath.y },
        { x: textPath.x + layout.width, y: textPath.y },
        { x: textPath.x + layout.width, y: textPath.y + layout.height },
        { x: textPath.x, y: textPath.y + layout.height },
      ].map(point => applyMatrixToPoint(matrix, point));

      const minX = Math.min(...corners.map(p => p.x));
      const minY = Math.min(...corners.map(p => p.y));
      const maxX = Math.max(...corners.map(p => p.x));
      const maxY = Math.max(...corners.map(p => p.y));

      return {
        x: minX - margin,
        y: minY - margin,
        width: (maxX - minX) + margin * 2,
        height: (maxY - minY) + margin * 2,
      };
    }
    case 'ellipse': {
      const { x, y, width, height } = path;
      const matrix = getShapeTransformMatrix(path as EllipseData);
      const cx = x + width / 2;
      const cy = y + height / 2;
      const rx = width / 2;
      const ry = height / 2;

      const sampleCount = 32;
      const points: Point[] = [];
      for (let i = 0; i < sampleCount; i++) {
        const angle = (i / sampleCount) * Math.PI * 2;
        const px = cx + rx * Math.cos(angle);
        const py = cy + ry * Math.sin(angle);
        points.push(applyMatrixToPoint(matrix, { x: px, y: py }));
      }

      const xs = points.map(p => p.x);
      const ys = points.map(p => p.y);

      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const maxX = Math.max(...xs);
      const maxY = Math.max(...ys);

      return {
        x: minX - margin,
        y: minY - margin,
        width: (maxX - minX) + margin * 2,
        height: (maxY - minY) + margin * 2,
      };
    }
    case 'pen':
    case 'line': {
      const anchoredPath = path as VectorPathData;
      if (!anchoredPath.anchors || anchoredPath.anchors.length < 1) {
        return { x: 0, y: 0, width: 0, height: 0 };
      }
      
      const sampledPoints = samplePath(anchoredPath.anchors, 20, anchoredPath.isClosed);

      if (sampledPoints.length === 0) {
        const point = anchoredPath.anchors[0].point;
        return {
          x: point.x - margin,
          y: point.y - margin,
          width: margin * 2,
          height: margin * 2,
        };
      }
      
      let minX = sampledPoints[0].x, minY = sampledPoints[0].y, maxX = sampledPoints[0].x, maxY = sampledPoints[0].y;

      for (let i = 1; i < sampledPoints.length; i++) {
        const point = sampledPoints[i];
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
      }
      
      return {
        x: minX - margin,
        y: minY - margin,
        width: (maxX - minX) + margin * 2,
        height: (maxY - minY) + margin * 2,
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

export function getMarqueeRect(marquee: { start: Point; end: Point }): BBox {
  const x = Math.min(marquee.start.x, marquee.end.x);
  const y = Math.min(marquee.start.y, marquee.end.y);
  const width = Math.abs(marquee.start.x - marquee.end.x);
  const height = Math.abs(marquee.start.y - marquee.end.y);
  return { x, y, width, height };
}

export function doBboxesIntersect(box1: BBox, box2: BBox): boolean {
  const xOverlap = box1.x < box2.x + box2.width && box1.x + box1.width > box2.x;
  const yOverlap = box1.y < box2.y + box2.height && box1.y + box1.height > box2.y;
  
  return xOverlap && yOverlap;
}

export function isBboxInside(innerBbox: BBox, outerBbox: BBox): boolean {
    if (!innerBbox || !outerBbox) return false;
    return (
        innerBbox.x >= outerBbox.x &&
        innerBbox.y >= outerBbox.y &&
        (innerBbox.x + innerBbox.width) <= (outerBbox.x + outerBbox.width) &&
        (innerBbox.y + innerBbox.height) <= (outerBbox.y + outerBbox.height)
    );
}