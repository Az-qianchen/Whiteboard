
import React from 'react';
import type { Point } from '../../types';
import { getMarqueeRect } from '../../lib/geometry';

interface MarqueeProps {
  marquee: { start: Point; end: Point } | null;
  viewTransform: { scale: number };
}

export const Marquee: React.FC<MarqueeProps> = React.memo(({ marquee, viewTransform }) => {
  if (!marquee) {
    return null;
  }

  return (
    <rect
      {...getMarqueeRect(marquee)}
      fill="rgba(22, 163, 175, 0.1)"
      stroke="rgba(22, 163, 175, 0.5)"
      strokeWidth={1 / viewTransform.scale}
      strokeDasharray={`4 ${4 / viewTransform.scale}`}
      className="pointer-events-none"
    />
  );
});
