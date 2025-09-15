import type {
  AnyPath,
  Point,
  VectorPathData,
  ImageData,
  TextData,
  RectangleData,
  EllipseData,
  PolygonData,
  GroupData,
} from '@/types';
import { rotatePoint } from '../geom';
import { rectangleToVectorPath, ellipseToVectorPath, polygonToVectorPath } from '../convert';

/**
 * 翻转图形。
 * @param path - 要翻转的图形。
 * @param center - 翻转中心点。
 * @param axis - 翻转轴（水平或垂直）。
 * @returns 返回一个翻转后的新图形对象。
 */
export async function flipPath(path: AnyPath, center: Point, axis: 'horizontal' | 'vertical'): Promise<AnyPath> {
  const flipPoint = (p: Point): Point => {
    if (axis === 'horizontal') {
      return { x: 2 * center.x - p.x, y: p.y };
    }
    return { x: p.x, y: 2 * center.y - p.y };
  };

  switch (path.tool) {
    case 'brush': {
      const newPoints = (path.points as Point[]).map(flipPoint);
      return { ...path, points: newPoints };
    }
    case 'arc': {
      const newPoints = (path.points as [Point, Point, Point]).map(flipPoint) as [Point, Point, Point];
      if (axis === 'horizontal') {
        [newPoints[0], newPoints[1]] = [newPoints[1], newPoints[0]];
      }
      return { ...path, points: newPoints };
    }
    case 'pen':
    case 'line': {
      const vectorPath = path as VectorPathData;
      const newAnchors = vectorPath.anchors.map((anchor) => ({
        point: flipPoint(anchor.point),
        handleIn: flipPoint(anchor.handleIn),
        handleOut: flipPoint(anchor.handleOut),
      }));
      return { ...path, anchors: newAnchors };
    }
    case 'image': {
      const imgPath = path as ImageData;
      const canvas = document.createElement('canvas');
      canvas.width = imgPath.width;
      canvas.height = imgPath.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return path;

      const flippedSrc = await new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          ctx.save();
          if (axis === 'horizontal') {
            ctx.scale(-1, 1);
            ctx.drawImage(img, -img.width, 0);
          } else {
            ctx.scale(1, -1);
            ctx.drawImage(img, 0, -img.height);
          }
          ctx.restore();
          resolve(canvas.toDataURL());
        };
        img.onerror = (err) => reject(err);
        img.crossOrigin = 'anonymous';
        img.src = imgPath.src;
      });

      const { x, y, width, height, rotation } = imgPath;
      const shapeCenter = { x: x + width / 2, y: y + height / 2 };
      const newShapeCenter = flipPoint(shapeCenter);
      const newX = newShapeCenter.x - width / 2;
      const newY = newShapeCenter.y - height / 2;
      const newRotation = -(rotation ?? 0);

      return { ...imgPath, x: newX, y: newY, rotation: newRotation, src: flippedSrc };
    }
    case 'text': {
      const textPath = path as TextData;
      const { x, y, width, height, rotation } = textPath;
      const shapeCenter = { x: x + width / 2, y: y + height / 2 };
      const newShapeCenter = flipPoint(shapeCenter);
      const newX = newShapeCenter.x - width / 2;
      const newY = newShapeCenter.y - height / 2;
      const newRotation = -(rotation ?? 0);
      return { ...textPath, x: newX, y: newY, rotation: newRotation };
    }
    case 'frame':
    case 'rectangle':
    case 'ellipse':
    case 'polygon': {
      let vectorPath: VectorPathData;
      if (path.tool === 'rectangle' || path.tool === 'frame') {
        vectorPath = rectangleToVectorPath(path as RectangleData);
      } else if (path.tool === 'ellipse') {
        vectorPath = ellipseToVectorPath(path as EllipseData);
      } else if (path.tool === 'polygon') {
        vectorPath = polygonToVectorPath(path as PolygonData);
      } else {
        throw new Error(`Unreachable code: unexpected tool '${(path as AnyPath).tool}' in flipPath`);
      }

      const flippedAnchors = vectorPath.anchors.map((anchor) => ({
        point: flipPoint(anchor.point),
        handleIn: flipPoint(anchor.handleIn),
        handleOut: flipPoint(anchor.handleOut),
      }));

      const { id, ...baseProps } = path as any;
      return { ...baseProps, id: path.id, tool: 'pen', anchors: flippedAnchors, isClosed: true } as VectorPathData;
    }
    case 'group': {
      const groupPath = path as GroupData;
      const newChildren = await Promise.all(groupPath.children.map((child) => flipPath(child, center, axis)));
      return { ...path, children: newChildren };
    }
  }
}

