import type { AnyPath, Point, BrushPathData, ArcData, VectorPathData, ImageData, RectangleData, EllipseData, PolygonData, GroupData, TextData } from '@/types';
import { rectangleToVectorPath, ellipseToVectorPath, polygonToVectorPath } from '../convert';
import { getCachedImage } from '@/lib/imageCache';
import { useFilesStore } from '@/context/filesStore';

/**
 * 翻转图形。
 * @param path 要翻转的图形。
 * @param center 翻转中心点。
 * @param axis 翻转轴（水平或垂直）。
 * @returns 返回一个翻转后的新图形对象。
 */
export async function flipPath(path: AnyPath, center: Point, axis: 'horizontal' | 'vertical'): Promise<AnyPath> {
  const flipPoint = (p: Point): Point =>
    axis === 'horizontal' ? { x: 2 * center.x - p.x, y: p.y } : { x: p.x, y: 2 * center.y - p.y };

  switch (path.tool) {
    case 'brush': {
      const brushPath = path as BrushPathData;
      const newPoints = brushPath.points.map(flipPoint);
      return { ...path, points: newPoints };
    }
    case 'arc': {
      const arcPath = path as ArcData;
      let newPoints = arcPath.points.map(flipPoint) as [Point, Point, Point];
      if (axis === 'horizontal') {
        [newPoints[0], newPoints[1]] = [newPoints[1], newPoints[0]];
      }
      return { ...path, points: newPoints };
    }
    case 'pen':
    case 'line': {
      const vectorPath = path as VectorPathData;
      const newAnchors = vectorPath.anchors.map(anchor => {
        const newPoint = flipPoint(anchor.point);
        const newHandleIn = flipPoint(anchor.handleIn);
        const newHandleOut = flipPoint(anchor.handleOut);
        return { point: newPoint, handleIn: newHandleIn, handleOut: newHandleOut };
      });
      return { ...path, anchors: newAnchors };
    }
    case 'image': {
      const imgPath = path as ImageData;
      const cached = await getCachedImage(imgPath);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      canvas.width = cached.width;
      canvas.height = cached.height;
      ctx.save();
      if (axis === 'horizontal') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      } else {
        ctx.translate(0, canvas.height);
        ctx.scale(1, -1);
      }
      ctx.drawImage(cached.source, 0, 0);
      ctx.restore();

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((value) => {
          if (value) resolve(value);
          else reject(new Error('Failed to create flipped image blob'));
        }, 'image/png');
      });
      const filesStore = useFilesStore.getState();
      const metadata = await filesStore.addFile(blob);

      const { x, y, width, height, rotation } = imgPath;
      const shapeCenter = { x: x + width / 2, y: y + height / 2 };
      const newShapeCenter = flipPoint(shapeCenter);
      const newX = newShapeCenter.x - width / 2;
      const newY = newShapeCenter.y - height / 2;
      const newRotation = -(rotation ?? 0);

      return { ...imgPath, x: newX, y: newY, rotation: newRotation, fileId: metadata.id };
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

      const flippedAnchors = vectorPath.anchors.map(anchor => {
        const newPoint = flipPoint(anchor.point);
        const newHandleIn = flipPoint(anchor.handleIn);
        const newHandleOut = flipPoint(anchor.handleOut);
        return { point: newPoint, handleIn: newHandleIn, handleOut: newHandleOut };
      });

      const { id, ...baseProps } = path as any;
      return { ...baseProps, id: path.id, tool: 'pen', anchors: flippedAnchors, isClosed: true } as VectorPathData;
    }
    case 'group': {
      const groupPath = path as GroupData;
      const newChildrenPromises = groupPath.children.map(child => flipPath(child, center, axis));
      const newChildren = await Promise.all(newChildrenPromises);
      return { ...path, children: newChildren };
    }
    case 'text': {
      const textPath = path as TextData;
      let newX = textPath.x;
      let newY = textPath.y;
      let newAlign = textPath.textAlign;
      if (axis === 'horizontal') {
        newX = 2 * center.x - (textPath.x + textPath.width);
        newAlign = textPath.textAlign === 'left' ? 'right' : textPath.textAlign === 'right' ? 'left' : textPath.textAlign;
      } else {
        newY = 2 * center.y - (textPath.y + textPath.height);
      }
      return { ...textPath, x: newX, y: newY, textAlign: newAlign };
    }
  }
}

export default flipPath;
