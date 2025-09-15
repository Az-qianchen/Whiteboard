import type { BBox, Point, ImageData, ResizeHandlePosition } from '@/types';
import { rotatePoint } from '../geom';

/**
 * 变换裁剪矩形。
 * @param initialCropRect 拖拽开始时的裁剪矩形。
 * @param originalImage 正在裁剪的原始图像数据。
 * @param handle 拖拽的控制手柄位置。
 * @param currentPos 当前指针位置。
 * @param initialPos 初始指针位置。
 * @returns 返回一个新的裁剪 BBox 对象。
 */
export function transformCropRect(
  initialCropRect: BBox,
  originalImage: ImageData,
  handle: ResizeHandlePosition,
  currentPos: Point,
  initialPos: Point,
): BBox {
  const rotation = originalImage.rotation ?? 0;
  const center = {
    x: originalImage.x + originalImage.width / 2,
    y: originalImage.y + originalImage.height / 2,
  };

  const localCurrent = rotatePoint(currentPos, center, -rotation);

  let x1 = initialCropRect.x;
  let y1 = initialCropRect.y;
  let x2 = initialCropRect.x + initialCropRect.width;
  let y2 = initialCropRect.y + initialCropRect.height;

  if (handle.includes('left')) x1 = localCurrent.x;
  if (handle.includes('right')) x2 = localCurrent.x;
  if (handle.includes('top')) y1 = localCurrent.y;
  if (handle.includes('bottom')) y2 = localCurrent.y;

  const newX1 = Math.min(x1, x2);
  const newY1 = Math.min(y1, y2);
  const newX2 = Math.max(x1, x2);
  const newY2 = Math.max(y1, y2);

  const ix1 = originalImage.x;
  const iy1 = originalImage.y;
  const ix2 = originalImage.x + originalImage.width;
  const iy2 = originalImage.y + originalImage.height;

  const finalX1 = Math.max(newX1, ix1);
  const finalY1 = Math.max(newY1, iy1);
  const finalX2 = Math.min(newX2, ix2);
  const finalY2 = Math.min(newY2, iy2);

  return {
    x: finalX1,
    y: finalY1,
    width: Math.max(0, finalX2 - finalX1),
    height: Math.max(0, finalY2 - finalY1),
  };
}

export default transformCropRect;
