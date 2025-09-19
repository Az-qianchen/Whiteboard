import React, { useMemo } from 'react';

interface MagicWandOverlayProps {
  contours: Array<{ d: string; inner: boolean }>;
}

export const MagicWandOverlay: React.FC<MagicWandOverlayProps> = ({ contours }) => {
  const highlightPath = useMemo(() => {
    if (!contours.length) {
      return null;
    }
    return contours.map(contour => contour.d).join(' ');
  }, [contours]);

  if (!contours.length) return null;

  return (
    <g className="pointer-events-none">
      {highlightPath && (
        <path
          d={highlightPath}
          fill="rgba(var(--oc-blue-6-rgb), 0.28)"
          stroke="none"
          fillRule="evenodd"
          vectorEffect="non-scaling-stroke"
        />
      )}
      {contours.map((contour, index) => (
        <g key={`${index}-${contour.inner ? 'inner' : 'outer'}`}>
          <path
            d={contour.d}
            fill="none"
            stroke="rgba(0,0,0,0.9)"
            strokeWidth={1.5}
            strokeDasharray="6 4"
            className="magic-wand-ants"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={contour.d}
            fill="none"
            stroke="rgba(255,255,255,0.95)"
            strokeWidth={1.5}
            strokeDasharray="6 4"
            strokeDashoffset={3}
            className="magic-wand-ants"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      ))}
    </g>
  );
};
