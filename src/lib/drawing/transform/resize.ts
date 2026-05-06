import type { Point, RectangleData, EllipseData, ImageData, PolygonData, FrameData, TextData, ResizeHandlePosition } from '@/types';
import { rotatePoint } from '../geom';
import { scalePath } from './scale';
import { movePath } from './move';
import { layoutText, resolveLineHeight } from '@/lib/text';

/**
 * 调整图形的大小。
 * @param originalPath 原始图形数据。
 * @param handle 拖拽的控制手柄位置。
 * @param currentPos 当前指针位置。
 * @param initialPos 初始指针位置。
 * @param keepAspectRatio 是否保持宽高比。
 * @param rotationCenter （可选）旋转中心点。
 * @returns 返回一个调整大小后的新图形对象。
 */
export function resizePath(
  originalPath: RectangleData | EllipseData | ImageData | PolygonData | FrameData | TextData,
  handle: ResizeHandlePosition,
  currentPos: Point,
  initialPos: Point,
  keepAspectRatio: boolean,
  rotationCenter?: Point,
): RectangleData | EllipseData | ImageData | PolygonData | FrameData | TextData {
  const ZERO_EPSILON = 1e-6;
  const { rotation } = originalPath;

  const defaultCenter = {
    x: originalPath.x + originalPath.width / 2,
    y: originalPath.y + originalPath.height / 2,
  };
  const pivot = rotationCenter || defaultCenter;

  let localCurrentPos = currentPos;
  let localInitialPos = initialPos;

  if (rotation) {
    localCurrentPos = rotatePoint(currentPos, pivot, -rotation);
    localInitialPos = rotatePoint(initialPos, pivot, -rotation);
  }

  const { x: oldX, y: oldY, width: oldWidth, height: oldHeight } = originalPath;

  const anchor: Point = (() => {
    switch (handle) {
      case 'top-left':
        return { x: oldX + oldWidth, y: oldY + oldHeight };
      case 'top-right':
        return { x: oldX, y: oldY + oldHeight };
      case 'bottom-left':
        return { x: oldX + oldWidth, y: oldY };
      case 'bottom-right':
        return { x: oldX, y: oldY };
      case 'top':
        return { x: oldX + oldWidth / 2, y: oldY + oldHeight };
      case 'bottom':
        return { x: oldX + oldWidth / 2, y: oldY };
      case 'left':
        return { x: oldX + oldWidth, y: oldY + oldHeight / 2 };
      case 'right':
        return { x: oldX, y: oldY + oldHeight / 2 };
      default:
        return defaultCenter;
    }
  })();

  const anchorGlobal = rotation ? rotatePoint(anchor, pivot, rotation) : anchor;

  const dxLocal = localCurrentPos.x - anchor.x;
  const dyLocal = localCurrentPos.y - anchor.y;
  const dxInitialLocal = localInitialPos.x - anchor.x;
  const dyInitialLocal = localInitialPos.y - anchor.y;

  const affectsX = handle.includes('left') || handle.includes('right');
  const affectsY = handle.includes('top') || handle.includes('bottom');

  const isDegenerateWidth = affectsX && Math.abs(oldWidth) < ZERO_EPSILON;
  const isDegenerateHeight = affectsY && Math.abs(oldHeight) < ZERO_EPSILON;

  if (isDegenerateWidth || isDegenerateHeight) {
    const nextLeft = isDegenerateWidth ? Math.min(localCurrentPos.x, anchor.x) : oldX;
    const nextRight = isDegenerateWidth ? Math.max(localCurrentPos.x, anchor.x) : oldX + oldWidth;
    const nextTop = isDegenerateHeight ? Math.min(localCurrentPos.y, anchor.y) : oldY;
    const nextBottom = isDegenerateHeight ? Math.max(localCurrentPos.y, anchor.y) : oldY + oldHeight;

    return {
      ...originalPath,
      x: isDegenerateWidth ? nextLeft : oldX,
      width: isDegenerateWidth ? Math.max(nextRight - nextLeft, 0) : oldWidth,
      y: isDegenerateHeight ? nextTop : oldY,
      height: isDegenerateHeight ? Math.max(nextBottom - nextTop, 0) : oldHeight,
    };
  }

  const baseWidth = handle.includes('left') ? -oldWidth : oldWidth;
  const baseHeight = handle.includes('top') ? -oldHeight : oldHeight;

  let newWidth = affectsX ? dxLocal : baseWidth;
  let newHeight = affectsY ? dyLocal : baseHeight;

  if (keepAspectRatio && oldWidth > 0 && oldHeight > 0) {
    const targetRatio = oldWidth / oldHeight;
    const isCorner = affectsX && affectsY;

    if (isCorner) {
      if (Math.abs(newWidth) > Math.abs(newHeight) * targetRatio) {
        newHeight = Math.abs(newWidth) / targetRatio * Math.sign(newHeight || (handle.includes('bottom') ? 1 : -1));
      } else {
        newWidth = Math.abs(newHeight) * targetRatio * Math.sign(newWidth || (handle.includes('right') ? 1 : -1));
      }
    } else if (affectsX) {
      newHeight = Math.abs(newWidth) / targetRatio * Math.sign(newHeight || (handle.includes('bottom') ? 1 : -1));
    } else if (affectsY) {
      newWidth = Math.abs(newHeight) * targetRatio * Math.sign(newWidth || (handle.includes('right') ? 1 : -1));
    }
  }

  const appliesToX = affectsX || (keepAspectRatio && affectsY);
  const appliesToY = affectsY || (keepAspectRatio && affectsX);

  const rawScaleX = baseWidth === 0 ? 1 : newWidth / baseWidth;
  const rawScaleY = baseHeight === 0 ? 1 : newHeight / baseHeight;

  const scaleX = appliesToX ? rawScaleX : 1;
  const scaleY = appliesToY ? rawScaleY : 1;

  if (originalPath.tool === 'text') {
    const nextLeft = affectsX ? Math.min(anchor.x, localCurrentPos.x) : oldX;
    const nextRight = affectsX ? Math.max(anchor.x, localCurrentPos.x) : oldX + oldWidth;
    const nextTop = affectsY ? Math.min(anchor.y, localCurrentPos.y) : oldY;
    const nextBottom = affectsY ? Math.max(anchor.y, localCurrentPos.y) : oldY + oldHeight;
    const baseLineHeight = resolveLineHeight(originalPath.fontSize, originalPath.lineHeight);
    const nextWidth = Math.max(nextRight - nextLeft, 1);
    const layout = layoutText(
      originalPath.text,
      originalPath.fontSize,
      originalPath.fontFamily,
      baseLineHeight,
      originalPath.fontWeight,
      nextWidth,
    );

    let textResult: TextData = {
      ...originalPath,
      x: nextLeft,
      y: nextTop,
      width: layout.width,
      height: affectsY ? Math.max(nextBottom - nextTop, 1) : layout.height,
      lineHeight: layout.lineHeight,
    };

    if (rotation) {
      const newCenter = { x: textResult.x + textResult.width / 2, y: textResult.y + textResult.height / 2 };
      const rotationPivot = rotationCenter ?? newCenter;
      const anchorGlobalNew = rotatePoint(anchor, rotationPivot, rotation);
      const translation = {
        x: anchorGlobal.x - anchorGlobalNew.x,
        y: anchorGlobal.y - anchorGlobalNew.y,
      };
      textResult = movePath(textResult, translation.x, translation.y);
    }

    return textResult;
  }

  let result = scalePath(originalPath, anchor, scaleX, scaleY);

  if (rotation) {
    const newCenter = { x: result.x + result.width / 2, y: result.y + result.height / 2 };
    const rotationPivot = rotationCenter ?? newCenter;
    const anchorGlobalNew = rotatePoint(anchor, rotationPivot, rotation);
    const translation = {
      x: anchorGlobal.x - anchorGlobalNew.x,
      y: anchorGlobal.y - anchorGlobalNew.y,
    };
    result = movePath(result, translation.x, translation.y);
  }

  return result;
}

export default resizePath;
