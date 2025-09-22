import React from 'react';
import type { Point } from '@/types';

interface MagicWandOverlayProps {
  contours: Array<{ d: string; inner: boolean }>;
  draft?: { mode: 'freehand' | 'polygon'; operation: 'add' | 'subtract'; points: Point[]; previewPoint?: Point } | null;
}

export const MagicWandOverlay: React.FC<MagicWandOverlayProps> = ({ contours, draft }) => {
  const hasDraft = Boolean(draft && draft.points.length > 0);
  if (!contours.length && !hasDraft) return null;

  let draftPath: string | null = null;
  let draftShouldClose = false;
  let draftFill = 'none';
  let draftStroke = 'rgba(16,185,129,0.9)';

  if (hasDraft && draft) {
    const basePoints = draft.previewPoint && draft.mode === 'polygon'
      ? [...draft.points, draft.previewPoint]
      : [...draft.points];

    if (draft.mode === 'freehand' && basePoints.length >= 2) {
      basePoints.push(basePoints[0]);
    }

    if (basePoints.length > 1) {
      const commands = basePoints.map((p, index) => `${index === 0 ? 'M' : 'L'}${p.x} ${p.y}`);
      draftShouldClose = basePoints.length > 2;
      draftPath = `${commands.join(' ')}${draftShouldClose ? ' Z' : ''}`;
      draftStroke = draft.operation === 'add' ? 'rgba(16,185,129,0.9)' : 'rgba(239,68,68,0.9)';
      draftFill = draftShouldClose
        ? draft.operation === 'add'
          ? 'rgba(16,185,129,0.2)'
          : 'rgba(239,68,68,0.2)'
        : 'none';
    }
  }

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

      {draftPath && (
        <path
          d={draftPath}
          fill={draftFill}
          stroke={draftStroke}
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
          strokeDasharray={draftShouldClose ? undefined : '6 4'}
        />
      )}
    </g>
  );
};
