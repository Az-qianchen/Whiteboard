import type { BBox, AnyPath, Point, VectorPathData, BrushPathData, ArcData, GroupData } from '../../types';
import { rotatePoint } from './geom';
import { samplePath } from './path';
import { getPolygonVertices } from './polygon';
import { sampleArc } from './arc';

export function getPathBoundingBox(path: AnyPath, includeStroke: boolean = true): BBox {
  const halfStroke = includeStroke ? (path.strokeWidth || 0) / 2 : 0;

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
        x: minX - halfStroke,
        y: minY - halfStroke,
        width: (maxX - minX) + path.strokeWidth,
        height: (maxY - minY) + path.strokeWidth,
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
          x: minX - halfStroke,
          y: minY - halfStroke,
          width: (maxX - minX) + path.strokeWidth,
          height: (maxY - minY) + path.strokeWidth,
      };
    }
    case 'group': {
      const groupPath = path as GroupData;
      const bbox = getPathsBoundingBox(groupPath.children, includeStroke);
      return bbox || { x: 0, y: 0, width: 0, height: 0 };
    }
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
    case 'polygon': {
      const { x, y, width, height, sides, rotation } = path;
      const vertices = getPolygonVertices(x, y, width, height, sides);
      
      let finalVertices = vertices;
      if (rotation) {
        const center = { x: x + width / 2, y: y + height / 2 };
        finalVertices = vertices.map(p => rotatePoint(p, center, rotation));
      }
      
      const minX = Math.min(...finalVertices.map(p => p.x));
      const minY = Math.min(...finalVertices.map(p => p.y));
      const maxX = Math.max(...finalVertices.map(p => p.x));
      const maxY = Math.max(...finalVertices.map(p => p.y));

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
      
      const sampledPoints = samplePath(anchoredPath.anchors, 20, anchoredPath.isClosed);

      if (sampledPoints.length === 0) {
        const point = anchoredPath.anchors[0].point;
        return {
          x: point.x - halfStroke,
          y: point.y - halfStroke,
          width: path.strokeWidth,
          height: path.strokeWidth,
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