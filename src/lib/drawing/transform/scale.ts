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
    case 'polygon': {
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

const toScaledStrokeDash = (dash: [number, number] | undefined, scale: number): [number, number] | undefined => {
  if (!dash) {
    return dash;
  }
  return [dash[0] * scale, dash[1] * scale];
};

const applyUniformStyleScaling = <T extends AnyPath>(original: T, scaled: T, scale: number): T => {
  const magnitude = Math.abs(scale);
  const styleUpdates: Partial<AnyPath> = {
    strokeWidth: (original.strokeWidth ?? 0) * magnitude,
  };

  if (original.strokeLineDash) {
    styleUpdates.strokeLineDash = toScaledStrokeDash(original.strokeLineDash, magnitude);
  }
  if (typeof original.endpointSize === 'number') {
    styleUpdates.endpointSize = original.endpointSize * magnitude;
  }
  if (typeof original.fillWeight === 'number' && original.fillWeight >= 0) {
    styleUpdates.fillWeight = original.fillWeight * magnitude;
  }
  if (typeof original.hachureGap === 'number' && original.hachureGap > 0) {
    styleUpdates.hachureGap = original.hachureGap * magnitude;
  }
  if (typeof original.blur === 'number') {
    styleUpdates.blur = original.blur * magnitude;
  }
  if (typeof original.shadowOffsetX === 'number') {
    styleUpdates.shadowOffsetX = original.shadowOffsetX * magnitude;
  }
  if (typeof original.shadowOffsetY === 'number') {
    styleUpdates.shadowOffsetY = original.shadowOffsetY * magnitude;
  }
  if (typeof original.shadowBlur === 'number') {
    styleUpdates.shadowBlur = original.shadowBlur * magnitude;
  }

  let result: AnyPath = { ...scaled, ...styleUpdates };

  if (original.tool === 'group' && scaled.tool === 'group') {
    const originalChildren = (original as GroupData).children;
    const scaledChildren = (scaled as GroupData).children;
    const children = scaledChildren.map((child, index) => {
      const source = originalChildren[index] ?? child;
      return applyUniformStyleScaling(source, child, scale);
    });
    result = { ...result, children } as GroupData;
  }

  return result as T;
};

export function scalePathUniformWithStyles<T extends AnyPath>(path: T, pivot: Point, scale: number): T {
  const scaled = scalePath(path, pivot, scale, scale);
  return applyUniformStyleScaling(path, scaled, scale);
}

export default scalePath;
