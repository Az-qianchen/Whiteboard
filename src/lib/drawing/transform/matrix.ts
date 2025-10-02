import type {
  Point,
  RectangleData,
  EllipseData,
  ImageData,
  PolygonData,
  FrameData,
  TextData,
} from '@/types';

export interface TransformMatrix {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

export const identityMatrix: TransformMatrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

export const createTranslationMatrix = (tx: number, ty: number): TransformMatrix => ({
  a: 1,
  b: 0,
  c: 0,
  d: 1,
  e: tx,
  f: ty,
});

export const createRotationMatrix = (angle: number): TransformMatrix => {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 };
};

export const createScaleMatrix = (sx: number, sy: number): TransformMatrix => ({
  a: sx,
  b: 0,
  c: 0,
  d: sy,
  e: 0,
  f: 0,
});

export const createSkewMatrix = (skewX: number, skewY: number): TransformMatrix => ({
  a: 1,
  b: skewY,
  c: skewX,
  d: 1,
  e: 0,
  f: 0,
});

export const multiplyMatrices = (m1: TransformMatrix, m2: TransformMatrix): TransformMatrix => ({
  a: m1.a * m2.a + m1.c * m2.b,
  b: m1.b * m2.a + m1.d * m2.b,
  c: m1.a * m2.c + m1.c * m2.d,
  d: m1.b * m2.c + m1.d * m2.d,
  e: m1.a * m2.e + m1.c * m2.f + m1.e,
  f: m1.b * m2.e + m1.d * m2.f + m1.f,
});

export const applyMatrixToPoint = (matrix: TransformMatrix, point: Point): Point => ({
  x: matrix.a * point.x + matrix.c * point.y + matrix.e,
  y: matrix.b * point.x + matrix.d * point.y + matrix.f,
});

export const invertMatrix = (matrix: TransformMatrix): TransformMatrix => {
  const det = matrix.a * matrix.d - matrix.b * matrix.c;
  if (Math.abs(det) < 1e-8) {
    return identityMatrix;
  }
  const invA = matrix.d / det;
  const invB = -matrix.b / det;
  const invC = -matrix.c / det;
  const invD = matrix.a / det;
  const invE = (matrix.c * matrix.f - matrix.d * matrix.e) / det;
  const invF = (matrix.b * matrix.e - matrix.a * matrix.f) / det;
  return { a: invA, b: invB, c: invC, d: invD, e: invE, f: invF };
};

export const matrixToString = (matrix: TransformMatrix): string =>
  `matrix(${matrix.a} ${matrix.b} ${matrix.c} ${matrix.d} ${matrix.e} ${matrix.f})`;

export const matrixToCssString = (matrix: TransformMatrix): string =>
  `matrix(${matrix.a}, ${matrix.b}, ${matrix.c}, ${matrix.d}, ${matrix.e}, ${matrix.f})`;

type TransformableShape =
  | RectangleData
  | EllipseData
  | ImageData
  | PolygonData
  | FrameData
  | TextData;

export const getShapeTransformMatrix = (shape: TransformableShape): TransformMatrix => {
  const cx = shape.x + shape.width / 2;
  const cy = shape.y + shape.height / 2;
  const rotation = shape.rotation ?? 0;
  const scaleX = shape.scaleX ?? 1;
  const scaleY = shape.scaleY ?? 1;
  const skewX = shape.skewX ?? 0;
  const skewY = shape.skewY ?? 0;

  let matrix = identityMatrix;
  matrix = multiplyMatrices(matrix, createTranslationMatrix(cx, cy));
  if (rotation) {
    matrix = multiplyMatrices(matrix, createRotationMatrix(rotation));
  }
  if (skewX || skewY) {
    matrix = multiplyMatrices(matrix, createSkewMatrix(skewX, skewY));
  }
  if (scaleX !== 1 || scaleY !== 1) {
    matrix = multiplyMatrices(matrix, createScaleMatrix(scaleX, scaleY));
  }
  matrix = multiplyMatrices(matrix, createTranslationMatrix(-cx, -cy));
  return matrix;
};

export const isIdentityMatrix = (matrix: TransformMatrix): boolean =>
  Math.abs(matrix.a - 1) < 1e-8 &&
  Math.abs(matrix.d - 1) < 1e-8 &&
  Math.abs(matrix.b) < 1e-8 &&
  Math.abs(matrix.c) < 1e-8 &&
  Math.abs(matrix.e) < 1e-8 &&
  Math.abs(matrix.f) < 1e-8;
