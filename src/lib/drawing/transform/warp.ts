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

const edgeHandleMap: Record<'top' | 'right' | 'bottom' | 'left', readonly [keyof QuadCorners, keyof QuadCorners]> = {
  top: ['topLeft', 'topRight'],
  right: ['topRight', 'bottomRight'],
  bottom: ['bottomLeft', 'bottomRight'],
  left: ['topLeft', 'bottomLeft'],
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

const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

const dot = (a: Point, b: Point): number => a.x * b.x + a.y * b.y;

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

export const isWarpEdgeHandle = (handle: ResizeHandlePosition): handle is keyof typeof edgeHandleMap =>
  handle === 'top' || handle === 'right' || handle === 'bottom' || handle === 'left';

export const isWarpControlHandle = (handle: ResizeHandlePosition): handle is keyof typeof cornerHandleMap | keyof typeof edgeHandleMap =>
  isWarpHandle(handle) || isWarpEdgeHandle(handle);

const normalize = (vector: Point): Point => {
  const length = Math.hypot(vector.x, vector.y);
  if (length < EPSILON) {
    return { x: 0, y: 0 };
  }
  return { x: vector.x / length, y: vector.y / length };
};

const cloneCorners = (corners: QuadCorners): QuadCorners => ({
  topLeft: clonePoint(corners.topLeft),
  topRight: clonePoint(corners.topRight),
  bottomRight: clonePoint(corners.bottomRight),
  bottomLeft: clonePoint(corners.bottomLeft),
});

export interface WarpHandleContext {
  baseCorners?: QuadCorners;
  warpedCorners?: QuadCorners;
  initialHandlePoint?: Point;
}

const warpEdgeHandle = (
  originalPath: WarpableShape,
  handle: keyof typeof edgeHandleMap,
  pointer: Point,
  context?: WarpHandleContext,
): WarpableShape => {
  const baseCorners = context?.baseCorners ?? getBaseCorners(originalPath);
  const currentWarp = context?.warpedCorners ?? addOffsets(baseCorners, getWarpOffsets(originalPath));
  const [startKey, endKey] = edgeHandleMap[handle];
  const startPoint = currentWarp[startKey];
  const endPoint = currentWarp[endKey];

  const edgeVector = subtractPoints(endPoint, startPoint);
  const direction = normalize(edgeVector);

  if (direction.x === 0 && direction.y === 0) {
    return originalPath;
  }

  const initialPoint = context?.initialHandlePoint ?? midpoint(startPoint, endPoint);
  const pointerDelta = subtractPoints(pointer, initialPoint);
  const parallelAmount = dot(pointerDelta, direction);

  const newEdgeVector = addPoints(edgeVector, {
    x: direction.x * parallelAmount,
    y: direction.y * parallelAmount,
  });

  const halfVector = { x: newEdgeVector.x / 2, y: newEdgeVector.y / 2 };
  const newStart = subtractPoints(pointer, halfVector);
  const newEnd = addPoints(pointer, halfVector);

  const nextCorners = cloneCorners(currentWarp);
  nextCorners[startKey] = newStart;
  nextCorners[endKey] = newEnd;

  const nextOffsets = subtractOffsets(nextCorners, baseCorners);
  return { ...originalPath, warp: nextOffsets };
};

export const warpHandle = (
  originalPath: WarpableShape,
  handle: ResizeHandlePosition,
  pointer: Point,
  context?: WarpHandleContext,
): WarpableShape => {
  if (isWarpHandle(handle)) {
    return warpCornerHandle(originalPath, handle, pointer);
  }
  if (isWarpEdgeHandle(handle)) {
    return warpEdgeHandle(originalPath, handle, pointer, context);
  }
  return originalPath;
};

export type ProjectiveMatrix3x3 = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

const EPSILON = 1e-8;

const formatSmallValue = (value: number): number => (Math.abs(value) < EPSILON ? 0 : value);

export const getQuadProjectiveMatrix = (
  width: number,
  height: number,
  corners: QuadCorners,
): ProjectiveMatrix3x3 | null => {
  if (width === 0 || height === 0) {
    return null;
  }

  const x0 = corners.topLeft.x;
  const y0 = corners.topLeft.y;
  const x1 = corners.topRight.x;
  const y1 = corners.topRight.y;
  const x2 = corners.bottomRight.x;
  const y2 = corners.bottomRight.y;
  const x3 = corners.bottomLeft.x;
  const y3 = corners.bottomLeft.y;

  const dx1 = x1 - x2;
  const dy1 = y1 - y2;
  const dx2 = x3 - x2;
  const dy2 = y3 - y2;
  const dx3 = x0 - x1 + x2 - x3;
  const dy3 = y0 - y1 + y2 - y3;

  const determinant = dx1 * dy2 - dx2 * dy1;

  let g = 0;
  let h = 0;

  if (Math.abs(determinant) > EPSILON) {
    g = (dx3 * dy2 - dx2 * dy3) / determinant;
    h = (dx1 * dy3 - dx3 * dy1) / determinant;
  } else if (Math.abs(dx3) > EPSILON || Math.abs(dy3) > EPSILON) {
    return null;
  }

  const a11 = x1 - x0 + g * x1;
  const a12 = x3 - x0 + h * x3;
  const a13 = x0;
  const a21 = y1 - y0 + g * y1;
  const a22 = y3 - y0 + h * y3;
  const a23 = y0;
  const a31 = g;
  const a32 = h;
  const a33 = 1;

  return [
    formatSmallValue(a11 / width),
    formatSmallValue(a12 / height),
    formatSmallValue(a13),
    formatSmallValue(a21 / width),
    formatSmallValue(a22 / height),
    formatSmallValue(a23),
    formatSmallValue(a31 / width),
    formatSmallValue(a32 / height),
    1,
  ];
};

export const projectiveMatrixToCss = (matrix: ProjectiveMatrix3x3): string => {
  const [m0, m1, m2, m3, m4, m5, m6, m7, m8] = matrix;
  const values = [
    m0,
    m3,
    0,
    m6,
    m1,
    m4,
    0,
    m7,
    0,
    0,
    1,
    0,
    m2,
    m5,
    0,
    m8,
  ];
  return `matrix3d(${values.map((value) => (Math.abs(value) < EPSILON ? '0' : value.toString())).join(', ')})`;
};
