import type {
  AnyPath,
  Point,
  ResizeHandlePosition,
  RectangleData,
  EllipseData,
  ImageData,
  PolygonData,
  FrameData,
  GroupData,
  ArcData,
  BrushPathData,
  VectorPathData,
  TextData,
} from '@/types';
import { rotatePoint } from '../geom';

/**
 * 根据旋转角度转换尺寸调整手柄的位置。
 * @param handle 原始手柄位置（未旋转）。
 * @param angle 旋转角度（弧度，顺时针为正）。
 * @returns 旋转后对应的手柄位置。
 */
export function rotateResizeHandle(handle: ResizeHandlePosition, angle: number): ResizeHandlePosition {
  const vectors: Record<ResizeHandlePosition, Point> = {
    'top-left': { x: -1, y: -1 },
    top: { x: 0, y: -1 },
    'top-right': { x: 1, y: -1 },
    right: { x: 1, y: 0 },
    'bottom-right': { x: 1, y: 1 },
    bottom: { x: 0, y: 1 },
    'bottom-left': { x: -1, y: 1 },
    left: { x: -1, y: 0 },
  };

  const v = vectors[handle];
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const rx = v.x * cos - v.y * sin;
  const ry = v.x * sin + v.y * cos;
  const sx = Math.abs(rx) < 1e-8 ? 0 : Math.sign(rx);
  const sy = Math.abs(ry) < 1e-8 ? 0 : Math.sign(ry);

  if (sx === 0 && sy === -1) return 'top';
  if (sx === 1 && sy === -1) return 'top-right';
  if (sx === 1 && sy === 0) return 'right';
  if (sx === 1 && sy === 1) return 'bottom-right';
  if (sx === 0 && sy === 1) return 'bottom';
  if (sx === -1 && sy === 1) return 'bottom-left';
  if (sx === -1 && sy === 0) return 'left';
  return 'top-left';
}

/**
 * 旋转图形。
 * @param path 要旋转的图形。
 * @param center 旋转中心点。
 * @param angle 旋转角度（弧度）。
 * @returns 返回一个旋转后的新图形对象。
 */
export function rotatePath<T extends AnyPath>(path: T, center: Point, angle: number): T {
  switch (path.tool) {
    case 'brush': {
      const brushPath = path as BrushPathData;
      const newPoints = brushPath.points.map(p => rotatePoint(p, center, angle));
      return { ...path, points: newPoints };
    }
    case 'arc': {
      const arcPath = path as ArcData;
      const newPoints = arcPath.points.map(p => rotatePoint(p, center, angle));
      return { ...path, points: newPoints as [Point, Point, Point] };
    }
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
    case 'frame':
    case 'rectangle':
    case 'ellipse':
    case 'image':
    case 'polygon':
    case 'text': {
      const shape = path as RectangleData | EllipseData | ImageData | PolygonData | FrameData | TextData;
      const originalShapeCenter = { x: shape.x + shape.width / 2, y: shape.y + shape.height / 2 };
      const newShapeCenter = rotatePoint(originalShapeCenter, center, angle);
      const newX = newShapeCenter.x - shape.width / 2;
      const newY = newShapeCenter.y - shape.height / 2;
      const newRotation = (shape.rotation ?? 0) + angle;
      return { ...(shape as AnyPath), x: newX, y: newY, rotation: newRotation } as T;
    }
    case 'group': {
      const groupPath = path as GroupData;
      const newChildren = groupPath.children.map(child => rotatePath(child, center, angle));
      return { ...path, children: newChildren };
    }
  }
}

export default rotatePath;
