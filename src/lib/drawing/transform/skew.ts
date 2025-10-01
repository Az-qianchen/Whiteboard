import type {
  Point,
  RectangleData,
  EllipseData,
  ImageData,
  PolygonData,
  FrameData,
  ResizeHandlePosition,
  TextData,
} from '@/types';

const clampShear = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const limit = 50;
  return Math.max(-limit, Math.min(limit, value));
};

const getHandleOffset = (
  path: RectangleData | EllipseData | ImageData | PolygonData | FrameData | TextData,
  handle: ResizeHandlePosition,
): Point => {
  const halfWidth = path.width / 2;
  const halfHeight = path.height / 2;
  switch (handle) {
    case 'top-left':
      return { x: -halfWidth, y: -halfHeight };
    case 'top-right':
      return { x: halfWidth, y: -halfHeight };
    case 'bottom-right':
      return { x: halfWidth, y: halfHeight };
    case 'bottom-left':
      return { x: -halfWidth, y: halfHeight };
    case 'top':
      return { x: 0, y: -halfHeight };
    case 'bottom':
      return { x: 0, y: halfHeight };
    case 'right':
      return { x: halfWidth, y: 0 };
    case 'left':
      return { x: -halfWidth, y: 0 };
    default:
      return { x: 0, y: 0 };
  }
};

export function skewPath(
  originalPath: RectangleData | EllipseData | ImageData | PolygonData | FrameData | TextData,
  handle: ResizeHandlePosition,
  pointer: Point,
): RectangleData | EllipseData | ImageData | PolygonData | FrameData | TextData {
  const { x, y, width, height } = originalPath;
  const center = { x: x + width / 2, y: y + height / 2 };
  const rotation = originalPath.rotation ?? 0;
  const scaleX = originalPath.scaleX ?? 1;
  const scaleY = originalPath.scaleY ?? 1;
  const existingSkewX = originalPath.skewX ?? 0;
  const existingSkewY = originalPath.skewY ?? 0;

  const offset = getHandleOffset(originalPath, handle);

  const pointerVec = { x: pointer.x - center.x, y: pointer.y - center.y };
  const cos = Math.cos(-rotation);
  const sin = Math.sin(-rotation);
  const rotated = {
    x: pointerVec.x * cos - pointerVec.y * sin,
    y: pointerVec.x * sin + pointerVec.y * cos,
  };

  const safeScaleX = Math.abs(scaleX) < 1e-8 ? (scaleX < 0 ? -1e-8 : 1e-8) : scaleX;
  const safeScaleY = Math.abs(scaleY) < 1e-8 ? (scaleY < 0 ? -1e-8 : 1e-8) : scaleY;

  const transformed = {
    x: rotated.x / safeScaleX,
    y: rotated.y / safeScaleY,
  };

  let newSkewX = existingSkewX;
  let newSkewY = existingSkewY;

  if (Math.abs(offset.y) > 1e-8) {
    newSkewX = clampShear((transformed.x - offset.x) / offset.y);
  }
  if (Math.abs(offset.x) > 1e-8) {
    newSkewY = clampShear((transformed.y - offset.y) / offset.x);
  }

  if (handle === 'top' || handle === 'bottom') {
    newSkewY = existingSkewY;
  }
  if (handle === 'left' || handle === 'right') {
    newSkewX = existingSkewX;
  }

  return { ...originalPath, skewX: newSkewX, skewY: newSkewY };
}

export default skewPath;
