import React from 'react';
import type { Point } from '@/types';

interface MagicWandOverlayProps {
  contours: Array<{ d: string; inner: boolean }>;
  draft?: { mode: 'freehand' | 'polygon'; operation: 'add' | 'subtract'; points: Point[]; previewPoint?: Point } | null;
  viewScale: number;
}

export const MagicWandOverlay: React.FC<MagicWandOverlayProps> = ({ contours, draft, viewScale }) => {
  const hasDraft = Boolean(draft && draft.points.length > 0);
  if (!contours.length && !hasDraft) return null;

  let draftPath: string | null = null;
  let draftShouldClose = false;
  let draftFill = 'none';
  let draftStroke = 'rgba(16,185,129,0.9)';
  let polygonStart: Point | null = null;
  let previewClosesPolygon = false;
  const safeScale = Math.max(viewScale, 0.001);
  const markerOuterRadius = 6 / safeScale;
  const markerInnerRadius = 3 / safeScale;
  const markerOuterStroke = 1.5;
  const markerInnerStroke = 0.75;

  if (hasDraft && draft) {
    let previewPoint = draft.previewPoint;

    if (draft.mode === 'polygon') {
      polygonStart = draft.points[0] ?? null;
      if (previewPoint && polygonStart) {
        const distance = Math.hypot(previewPoint.x - polygonStart.x, previewPoint.y - polygonStart.y);
        const closeThreshold = 12 / safeScale;
        if (distance <= closeThreshold) {
          previewPoint = polygonStart;
          previewClosesPolygon = true;
        }
      }
    }

    const basePoints = previewPoint && draft.mode === 'polygon'
      ? [...draft.points, previewPoint]
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

      {polygonStart && (
        <g>
          <circle
            cx={polygonStart.x}
            cy={polygonStart.y}
            r={markerOuterRadius}
            fill={previewClosesPolygon ? 'rgba(16,185,129,0.2)' : 'rgba(17,24,39,0.55)'}
            stroke={previewClosesPolygon ? 'rgba(16,185,129,0.95)' : 'rgba(255,255,255,0.85)'}
            strokeWidth={markerOuterStroke}
            vectorEffect="non-scaling-stroke"
          />
          <circle
            cx={polygonStart.x}
            cy={polygonStart.y}
            r={markerInnerRadius}
            fill={previewClosesPolygon ? 'rgba(16,185,129,0.9)' : 'rgba(255,255,255,0.95)'}
            stroke={previewClosesPolygon ? 'rgba(16,185,129,1)' : 'rgba(0,0,0,0.5)'}
            strokeWidth={markerInnerStroke}
            vectorEffect="non-scaling-stroke"
          />
        </g>
      )}
    </g>
  );
};
