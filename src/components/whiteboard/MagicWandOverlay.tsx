import React, { useMemo } from 'react';
import type { ImageData as PathImageData } from '@/types';
import { rotatePoint } from '@/lib/drawing';

interface MagicWandOverlayProps {
  contours: Array<{ d: string; inner: boolean }>;
  image: PathImageData;
  isInverted: boolean;
}

export const MagicWandOverlay: React.FC<MagicWandOverlayProps> = ({ contours, image, isInverted }) => {
  if (!contours.length) return null;

  const selectionPath = useMemo(
    () => contours.map(contour => contour.d).join(' '),
    [contours]
  );

  const imageOutlinePath = useMemo(() => {
    const corners = [
      { x: image.x, y: image.y },
      { x: image.x + image.width, y: image.y },
      { x: image.x + image.width, y: image.y + image.height },
      { x: image.x, y: image.y + image.height },
    ];
    const rotation = image.rotation ?? 0;
    const rotated = rotation
      ? corners.map(point => rotatePoint(point, {
        x: image.x + image.width / 2,
        y: image.y + image.height / 2,
      }, rotation))
      : corners;
    return rotated
      .map((point, idx) => `${idx === 0 ? 'M' : 'L'}${point.x} ${point.y}`)
      .join(' ') + ' Z';
  }, [image]);

  const fillPath = isInverted ? `${imageOutlinePath} ${selectionPath}` : selectionPath;

  return (
    <g className="pointer-events-none">
      <path
        d={fillPath}
        fill="var(--accent-primary)"
        fillOpacity={0.15}
        fillRule="evenodd"
      />
      {contours.map((contour, index) => (
        <g key={`${index}-${contour.inner ? 'inner' : 'outer'}`}>
          <path
            d={contour.d}
            fill="none"
            stroke="rgba(0,0,0,0.85)"
            strokeWidth={2}
            strokeDasharray="4 4"
            strokeLinejoin="round"
            className="magic-wand-ants"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={contour.d}
            fill="none"
            stroke="rgba(255,255,255,0.95)"
            strokeWidth={2}
            strokeDasharray="4 4"
            strokeDashoffset={2}
            strokeLinejoin="round"
            className="magic-wand-ants"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      ))}
    </g>
  );
};
