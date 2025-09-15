import type { AnyPath, Point, ArcData, BrushPathData, VectorPathData, GroupData } from '@/types';

/**
 * 缩放图形。
 * @param path 要缩放的图形。
 * @param pivot 缩放基准点。
 * @param scaleX X 轴缩放因子。
 * @param scaleY Y 轴缩放因子。
 * @returns 返回一个缩放后的新图形对象。
 */
export function scalePath<T extends AnyPath>(path: T, pivot: Point, scaleX: number, scaleY: number): T {
  const scalePoint = (pt: Point) => ({ x: pivot.x + (pt.x - pivot.x) * scaleX, y: pivot.y + (pt.y - pivot.y) * scaleY });

  switch (path.tool) {
    case 'brush':
      return { ...path, points: (path as BrushPathData).points.map(scalePoint) };
    case 'arc':
      return { ...path, points: (path as ArcData).points.map(scalePoint) as [Point, Point, Point] };
    case 'pen':
    case 'line':
      return {
        ...path,
        anchors: (path as VectorPathData).anchors.map(a => ({
          point: scalePoint(a.point),
          handleIn: scalePoint(a.handleIn),
          handleOut: scalePoint(a.handleOut),
        })),
      };
    case 'frame':
    case 'rectangle':
    case 'ellipse':
    case 'image':
    case 'polygon':
    case 'text': {
      const scaledX = pivot.x + (path.x - pivot.x) * scaleX;
      const scaledY = pivot.y + (path.y - pivot.y) * scaleY;
      const scaledWidth = path.width * scaleX;
      const scaledHeight = path.height * scaleY;
      const newX = scaledWidth < 0 ? scaledX + scaledWidth : scaledX;
      const newY = scaledHeight < 0 ? scaledY + scaledHeight : scaledY;
      const newScaleX = (path.scaleX ?? 1) * (scaleX < 0 ? -1 : 1);
      const newScaleY = (path.scaleY ?? 1) * (scaleY < 0 ? -1 : 1);
      return {
        ...path,
        x: newX,
        y: newY,
        width: Math.abs(scaledWidth),
        height: Math.abs(scaledHeight),
        scaleX: newScaleX,
        scaleY: newScaleY,
      };
    }
    case 'group':
      return {
        ...path,
        children: (path as GroupData).children.map(child => scalePath(child, pivot, scaleX, scaleY)),
      };
  }
}

export default scalePath;
