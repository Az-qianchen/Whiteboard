import type {
  Point,
  RectangleData,
  ImageData,
  QuadCorners,
  QuadWarpOffsets,
  ResizeHandlePosition,
} from '@/types';
import { applyMatrixToPoint, getShapeTransformMatrix } from './matrix';

export type WarpableShape = RectangleData | ImageData;

const ZERO_POINT: Point = { x: 0, y: 0 };

const ZERO_OFFSETS: QuadWarpOffsets = {
  topLeft: { ...ZERO_POINT },
  topRight: { ...ZERO_POINT },
  bottomRight: { ...ZERO_POINT },
  bottomLeft: { ...ZERO_POINT },
};

const cornerHandleMap: Record<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right', keyof QuadCorners> = {
  'top-left': 'topLeft',
  'top-right': 'topRight',
  'bottom-left': 'bottomLeft',
  'bottom-right': 'bottomRight',
};

const clonePoint = (point: Point): Point => ({ x: point.x, y: point.y });

const cloneOffsets = (offsets: QuadWarpOffsets): QuadWarpOffsets => ({
  topLeft: clonePoint(offsets.topLeft),
  topRight: clonePoint(offsets.topRight),
  bottomRight: clonePoint(offsets.bottomRight),
  bottomLeft: clonePoint(offsets.bottomLeft),
});

const addPoints = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });
const subtractPoints = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });

const addOffsets = (base: QuadCorners, offsets: QuadWarpOffsets): QuadCorners => ({
  topLeft: addPoints(base.topLeft, offsets.topLeft),
  topRight: addPoints(base.topRight, offsets.topRight),
  bottomRight: addPoints(base.bottomRight, offsets.bottomRight),
  bottomLeft: addPoints(base.bottomLeft, offsets.bottomLeft),
});

const subtractOffsets = (final: QuadCorners, base: QuadCorners): QuadWarpOffsets => ({
  topLeft: subtractPoints(final.topLeft, base.topLeft),
  topRight: subtractPoints(final.topRight, base.topRight),
  bottomRight: subtractPoints(final.bottomRight, base.bottomRight),
  bottomLeft: subtractPoints(final.bottomLeft, base.bottomLeft),
});

export const getZeroWarpOffsets = (): QuadWarpOffsets => cloneOffsets(ZERO_OFFSETS);

export const getWarpOffsets = (shape: WarpableShape): QuadWarpOffsets =>
  shape.warp ? cloneOffsets(shape.warp) : getZeroWarpOffsets();

export const getBaseCorners = (shape: WarpableShape): QuadCorners => {
  const { x, y, width, height } = shape;
  const matrix = getShapeTransformMatrix(shape);
  const corners: QuadCorners = {
    topLeft: { x, y },
    topRight: { x: x + width, y },
    bottomRight: { x: x + width, y: y + height },
    bottomLeft: { x, y: y + height },
  };

  return {
    topLeft: applyMatrixToPoint(matrix, corners.topLeft),
    topRight: applyMatrixToPoint(matrix, corners.topRight),
    bottomRight: applyMatrixToPoint(matrix, corners.bottomRight),
    bottomLeft: applyMatrixToPoint(matrix, corners.bottomLeft),
  };
};

export const getWarpedCorners = (shape: WarpableShape): QuadCorners => {
  const base = getBaseCorners(shape);
  const offsets = getWarpOffsets(shape);
  return addOffsets(base, offsets);
};

export const warpCornerHandle = (
  originalPath: WarpableShape,
  handle: ResizeHandlePosition,
  pointer: Point,
): WarpableShape => {
  if (!(handle in cornerHandleMap)) {
    return originalPath;
  }

  const cornerKey = cornerHandleMap[handle as keyof typeof cornerHandleMap];
  const baseCorners = getBaseCorners(originalPath);
  const currentOffsets = getWarpOffsets(originalPath);
  const currentCorners = addOffsets(baseCorners, currentOffsets);
  const nextCorners: QuadCorners = { ...currentCorners, [cornerKey]: pointer } as QuadCorners;
  const nextOffsets = subtractOffsets(nextCorners, baseCorners);

  return { ...originalPath, warp: nextOffsets };
};

export const isWarpHandle = (handle: ResizeHandlePosition): handle is keyof typeof cornerHandleMap =>
  handle === 'top-left' || handle === 'top-right' || handle === 'bottom-left' || handle === 'bottom-right';
