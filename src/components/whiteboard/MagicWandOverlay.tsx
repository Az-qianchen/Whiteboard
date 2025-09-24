import React from 'react';
import type { Point } from '@/types';

type MagicWandDraft =
  | {
      mode: 'freehand';
      operation: 'add' | 'subtract' | 'replace';
      points: Point[];
    }
  | {
      mode: 'polygon';
      operation: 'add' | 'subtract' | 'replace';
      points: Point[];
      previewPoint?: Point;
    }
  | {
      mode: 'brush';
      operation: 'add' | 'subtract' | 'replace';
      points: Point[];
      brushSize: number;
    };

const getOperationStyle = (operation: 'add' | 'subtract' | 'replace') => {
  switch (operation) {
    case 'subtract':
      return {
        stroke: 'rgba(239,68,68,0.9)',
        fill: 'rgba(239,68,68,0.2)',
      };
    case 'replace':
      return {
        stroke: 'rgba(59,130,246,0.9)',
        fill: 'rgba(59,130,246,0.2)',
      };
    default:
      return {
        stroke: 'rgba(16,185,129,0.9)',
        fill: 'rgba(16,185,129,0.2)',
      };
  }
};

interface MagicWandOverlayProps {
  contours: Array<{ d: string; inner: boolean }>;
  draft?: MagicWandDraft | null;
  viewScale: number;
}

export const MagicWandOverlay: React.FC<MagicWandOverlayProps> = ({ contours, draft, viewScale }) => {
  const hasDraft = Boolean(draft && draft.points.length > 0);
  if (!contours.length && !hasDraft) return null;

  let draftPath: string | null = null;
  let draftShouldClose = false;
  let draftFill = 'none';
  let draftStroke = 'rgba(16,185,129,0.9)';
  let brushPath: string | null = null;
  let brushStroke = 'rgba(16,185,129,0.9)';
  let brushFill = 'rgba(16,185,129,0.2)';
  let brushStrokeWidth = 0;
  let brushHead: Point | null = null;
  let polygonStart: Point | null = null;
  let previewClosesPolygon = false;
  const safeScale = Math.max(viewScale, 0.001);
  const markerOuterRadius = 6 / safeScale;
  const markerInnerRadius = 3 / safeScale;
  const markerOuterStroke = 1.5;
  const markerInnerStroke = 0.75;

  if (hasDraft && draft) {
    if (draft.mode === 'brush') {
      const style = getOperationStyle(draft.operation);
      brushStroke = style.stroke;
      brushFill = style.fill;
      brushStrokeWidth = Math.max(1, draft.brushSize);
      brushHead = draft.points[draft.points.length - 1] ?? null;
      if (draft.points.length >= 2) {
        const commands = draft.points.map((p, index) => `${index === 0 ? 'M' : 'L'}${p.x} ${p.y}`);
        brushPath = commands.join(' ');
      } else if (draft.points.length === 1) {
        brushHead = draft.points[0];
      }
    } else {
      const style = getOperationStyle(draft.operation);
      let previewPoint = draft.mode === 'polygon' ? draft.previewPoint : undefined;

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
        draftStroke = style.stroke;
        draftFill = draftShouldClose ? style.fill : 'none';
      }
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

      {brushPath && (
        <path
          d={brushPath}
          fill="none"
          stroke={brushStroke}
          strokeWidth={brushStrokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.6}
        />
      )}

      {brushHead && brushStrokeWidth > 0 && (
        <circle
          cx={brushHead.x}
          cy={brushHead.y}
          r={Math.max(brushStrokeWidth / 2, 1)}
          fill={brushFill}
          stroke={brushStroke}
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
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
