import type { AnyPath, Point, ArcData, BrushPathData, VectorPathData, GroupData, TextData } from '@/types';

/**
 * 移动图形。
 * @param path 要移动的图形。
 * @param dx X 轴上的移动距离。
 * @param dy Y 轴上的移动距离。
 * @returns 返回一个移动后的新图形对象。
 */
export function movePath<T extends AnyPath>(path: T, dx: number, dy: number): T {
  switch (path.tool) {
    case 'brush':
      return {
        ...path,
        points: (path as BrushPathData).points.map(p => ({ x: p.x + dx, y: p.y + dy })),
      };
    case 'arc':
      return {
        ...path,
        points: (path as ArcData).points.map(p => ({ x: p.x + dx, y: p.y + dy })) as [Point, Point, Point],
      };
    case 'pen':
    case 'line':
      return {
        ...path,
        anchors: (path as VectorPathData).anchors.map(a => ({
          point: { x: a.point.x + dx, y: a.point.y + dy },
          handleIn: { x: a.handleIn.x + dx, y: a.handleIn.y + dy },
          handleOut: { x: a.handleOut.x + dx, y: a.handleOut.y + dy },
        })),
      };
    case 'frame':
    case 'rectangle':
    case 'ellipse':
    case 'image':
    case 'polygon':
      return { ...path, x: path.x + dx, y: path.y + dy };
    case 'text': {
      const textPath = path as TextData;
      return { ...textPath, x: textPath.x + dx, y: textPath.y + dy } as unknown as T;
    }
    case 'group': {
      const groupPath = path as GroupData;
      const newChildren = groupPath.children.map(child => movePath(child, dx, dy));
      return { ...path, children: newChildren };
    }
  }
}

export default movePath;
