/**
 * 本文件是 Whiteboard 的子组件，负责在图片裁剪模式下渲染视觉覆盖层。
 * 它会使裁剪区域外的图像变暗，以清晰地显示裁剪结果。
 */
import React from 'react';
import type { ImageData, BBox } from '@/types';

interface CropOverlayProps {
  croppingState: { pathId: string; originalPath: ImageData };
  currentCropRect: BBox;
}

export const CropOverlay: React.FC<CropOverlayProps> = ({ croppingState, currentCropRect }) => {
  const o = croppingState.originalPath; // Original image bounds
  const c = currentCropRect; // Current crop bounds

  // Use an SVG path with an evenodd fill rule to create a "hole"
  // The first path is the outer rectangle (original image bounds).
  // The second path is the inner rectangle (current crop bounds).
  // The evenodd rule fills the area between them.
  const d = `M${o.x},${o.y} H${o.x + o.width} V${o.y + o.height} H${o.x} Z ` +
            `M${c.x},${c.y} V${c.y + c.height} H${c.x + c.width} V${c.y} Z`;

  let transform: string | undefined;
  if (o.rotation) {
    const cx = o.x + o.width / 2;
    const cy = o.y + o.height / 2;
    const angleDegrees = o.rotation * (180 / Math.PI);
    transform = `rotate(${angleDegrees} ${cx} ${cy})`;
  }

  return (
    <path
      d={d}
      transform={transform}
      fill="rgba(0,0,0,0.6)"
      fillRule="evenodd"
      className="pointer-events-none"
    />
  );
};