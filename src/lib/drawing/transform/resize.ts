import type { Point, RectangleData, EllipseData, ImageData, PolygonData, TextData, FrameData, ResizeHandlePosition } from '@/types';
import { rotatePoint } from '../geom';
import { scalePath } from './scale';
import { movePath } from './move';

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
  originalPath: RectangleData | EllipseData | ImageData | PolygonData | TextData | FrameData,
  handle: ResizeHandlePosition,
  currentPos: Point,
  initialPos: Point,
  keepAspectRatio: boolean,
  rotationCenter?: Point,
): RectangleData | EllipseData | ImageData | PolygonData | TextData | FrameData {
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

  const anchor = {
    x: handle.includes('left') ? oldX + oldWidth : oldX,
    y: handle.includes('top') ? oldY + oldHeight : oldY,
  };

  if (handle === 'top' || handle === 'bottom') {
    anchor.x = localInitialPos.x < defaultCenter.x ? oldX + oldWidth : oldX;
  }
  if (handle === 'left' || handle === 'right') {
    anchor.y = localInitialPos.y < defaultCenter.y ? oldY + oldHeight : oldY;
  }

  const anchorGlobal = rotation ? rotatePoint(anchor, pivot, rotation) : anchor;

  const dxLocal = localCurrentPos.x - anchor.x;
  const dyLocal = localCurrentPos.y - anchor.y;
  const dxInitialLocal = localInitialPos.x - anchor.x;
  const dyInitialLocal = localInitialPos.y - anchor.y;

  const affectsX = handle.includes('left') || handle.includes('right');
  const affectsY = handle.includes('top') || handle.includes('bottom');

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

  let scaleX = affectsX ? Math.abs(newWidth / baseWidth) : 1;
  let scaleY = affectsY ? Math.abs(newHeight / baseHeight) : 1;

  if (affectsX) {
    const baseSign = Math.sign(dxInitialLocal);
    const currentSign = Math.sign(dxLocal);
    if (baseSign && currentSign && baseSign !== currentSign) {
      scaleX *= -1;
    }
  }
  if (affectsY) {
    const baseSign = Math.sign(dyInitialLocal);
    const currentSign = Math.sign(dyLocal);
    if (baseSign && currentSign && baseSign !== currentSign) {
      scaleY *= -1;
    }
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
