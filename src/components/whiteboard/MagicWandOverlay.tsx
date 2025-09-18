import React from 'react';

interface MagicWandOverlayProps {
  contours: Array<{ d: string; inner: boolean }>;
}

export const MagicWandOverlay: React.FC<MagicWandOverlayProps> = ({ contours }) => {
  if (!contours.length) return null;

  return (
    <g className="pointer-events-none">
      {contours.map((contour, index) => (
        <g key={`${index}-${contour.inner ? 'inner' : 'outer'}`}>
          <path
            d={contour.d}
            fill="none"
            stroke="rgba(0,0,0,0.85)"
            strokeWidth={1}
            strokeDasharray="4 4"
            className="magic-wand-ants"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={contour.d}
            fill="none"
            stroke="rgba(255,255,255,0.95)"
            strokeWidth={1}
            strokeDasharray="4 4"
            strokeDashoffset={2}
            className="magic-wand-ants"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      ))}
    </g>
  );
};
