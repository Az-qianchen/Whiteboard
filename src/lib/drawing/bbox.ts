import type { BBox, AnyPath, Point, VectorPathData, BrushPathData, ArcData, GroupData, TextData } from '@/types';
import { rotatePoint } from './geom';
import { samplePath } from './path';
import { getPolygonVertices } from './polygon';
import { sampleArc } from './arc';
import { DEFAULT_ROUGHNESS, DEFAULT_BOWING } from '@/constants';

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
      const halfFillWeight = (path.fill && path.fill !== 'transparent') ? fillWeight / 2 : 0;
      
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
      const bbox = getPathsBoundingBox(groupPath.children, includeStroke);
      return bbox || { x: 0, y: 0, width: 0, height: 0 };
    }
    case 'frame':
    case 'rectangle':
    case 'image':
    case 'text': {
      const { x, y, width, height, rotation, scaleX = 1, scaleY = 1 } = path;
      const cx = x + width / 2;
      const cy = y + height / 2;

      const transformPoint = (p: Point): Point => {
        let tx = cx + (p.x - cx) * scaleX;
        let ty = cy + (p.y - cy) * scaleY;
        if (rotation) {
          return rotatePoint({ x: tx, y: ty }, { x: cx, y: cy }, rotation);
        }
        return { x: tx, y: ty };
      };

      const corners = [
        { x, y },
        { x: x + width, y },
        { x: x + width, y: y + height },
        { x, y: y + height },
      ].map(transformPoint);

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
      const { x, y, width, height, sides, rotation, scaleX = 1, scaleY = 1 } = path;
      const cx = x + width / 2;
      const cy = y + height / 2;
      const vertices = getPolygonVertices(x, y, width, height, sides).map(p => {
        let tx = cx + (p.x - cx) * scaleX;
        let ty = cy + (p.y - cy) * scaleY;
        if (rotation) {
          return rotatePoint({ x: tx, y: ty }, { x: cx, y: cy }, rotation);
        }
        return { x: tx, y: ty };
      });

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
     case 'ellipse': {
        const { x, y, width, height, rotation } = path;
        const cx = x + width/2;
        const cy = y + height/2;

        if (!rotation) {
             return {
                x: x - margin,
                y: y - margin,
                width: width + margin * 2,
                height: height + margin * 2,
            };
        }

        const angle = rotation;
        const rx = width / 2;
        const ry = height / 2;
        
        const cosAngle = Math.cos(angle);
        const sinAngle = Math.sin(angle);
        
        const newWidth = 2 * Math.sqrt(Math.pow(rx * cosAngle, 2) + Math.pow(ry * sinAngle, 2));
        const newHeight = 2 * Math.sqrt(Math.pow(rx * sinAngle, 2) + Math.pow(ry * cosAngle, 2));

        return {
            x: cx - newWidth / 2 - margin,
            y: cy - newHeight / 2 - margin,
            width: newWidth + margin * 2,
            height: newHeight + margin * 2,
        }
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