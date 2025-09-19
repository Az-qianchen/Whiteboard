import type {
  AnyPath,
  GradientHandle,
  Point,
  RectangleData,
  EllipseData,
  ImageData,
  PolygonData,
  TextData,
  FrameData,
} from '@/types';
import { getPathBoundingBox } from '@/lib/drawing/bbox';
import {
  applyMatrixToPoint,
  getShapeTransformMatrix,
  invertMatrix,
} from '@/lib/drawing/transform/matrix';

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

type TransformableShape = RectangleData | EllipseData | ImageData | PolygonData | TextData | FrameData;

const isTransformableShape = (path: AnyPath): path is TransformableShape =>
  path.tool === 'rectangle' ||
  path.tool === 'ellipse' ||
  path.tool === 'image' ||
  path.tool === 'polygon' ||
  path.tool === 'text' ||
  path.tool === 'frame';

export interface GradientHandleSpace {
  toCanvas: (handle: GradientHandle) => Point | null;
  fromCanvas: (point: Point) => GradientHandle | null;
}

const createTransformableSpace = (shape: TransformableShape): GradientHandleSpace | null => {
  const { x, y, width, height } = shape;
  if (width === 0 || height === 0) {
    return null;
  }

  const transformMatrix = getShapeTransformMatrix(shape);
  const inverseMatrix = invertMatrix(transformMatrix);

  const toCanvas = (handle: GradientHandle): Point | null => {
    const localPoint = {
      x: x + handle.x * width,
      y: y + handle.y * height,
    };
    return applyMatrixToPoint(transformMatrix, localPoint);
  };

  const fromCanvas = (point: Point): GradientHandle | null => {
    const localPoint = applyMatrixToPoint(inverseMatrix, point);
    const normalizedX = (localPoint.x - x) / width;
    const normalizedY = (localPoint.y - y) / height;

    if (!Number.isFinite(normalizedX) || !Number.isFinite(normalizedY)) {
      return null;
    }

    return {
      x: clamp01(normalizedX),
      y: clamp01(normalizedY),
    };
  };

  return { toCanvas, fromCanvas };
};

const createBboxSpace = (path: AnyPath): GradientHandleSpace | null => {
  const bbox = getPathBoundingBox(path, false);
  if (bbox.width === 0 || bbox.height === 0) {
    return null;
  }

  const toCanvas = (handle: GradientHandle): Point | null => ({
    x: bbox.x + handle.x * bbox.width,
    y: bbox.y + handle.y * bbox.height,
  });

  const fromCanvas = (point: Point): GradientHandle | null => {
    const normalizedX = (point.x - bbox.x) / bbox.width;
    const normalizedY = (point.y - bbox.y) / bbox.height;

    if (!Number.isFinite(normalizedX) || !Number.isFinite(normalizedY)) {
      return null;
    }

    return {
      x: clamp01(normalizedX),
      y: clamp01(normalizedY),
    };
  };

  return { toCanvas, fromCanvas };
};

export const getGradientHandleSpace = (path: AnyPath): GradientHandleSpace | null => {
  if (isTransformableShape(path)) {
    return createTransformableSpace(path);
  }
  return createBboxSpace(path);
};
