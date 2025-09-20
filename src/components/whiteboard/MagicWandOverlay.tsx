import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Point } from '@/types';

interface MagicWandOverlayProps {
  contours: Array<{ d: string; inner: boolean }>;
  draft?: {
    mode: 'freehand' | 'polygon';
    operation: 'add' | 'subtract';
    points: Point[];
    previewPoint?: Point;
    closingHint?: 'near-start';
  } | null;
}

export const MagicWandOverlay: React.FC<MagicWandOverlayProps> = ({ contours, draft }) => {
  const { t } = useTranslation();
  const hasDraft = Boolean(draft && draft.points.length > 0);
  if (!contours.length && !hasDraft) return null;

  let draftPath: string | null = null;
  let draftFill = 'none';
  let draftStroke = 'rgba(16,185,129,0.9)';
  let draftStrokeDasharray: string | undefined;
  let closingSegmentPath: string | null = null;
  let closingSegmentStroke = 'rgba(148,163,184,0.9)';
  let closingSegmentDasharray: string | undefined = '4 4';
  let startIndicator: { point: Point; color: string; highlighted: boolean } | null = null;
  let hintLabel: { point: Point; lines: string[] } | null = null;

  if (hasDraft && draft) {
    const isAdd = draft.operation === 'add';
    const operationStroke = isAdd ? 'rgba(16,185,129,0.9)' : 'rgba(239,68,68,0.9)';
    const operationFill = isAdd ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.18)';
    draftStroke = operationStroke;

    const previewPoint = draft.previewPoint;
    const basePoints = previewPoint && draft.mode === 'polygon'
      ? [...draft.points, previewPoint]
      : [...draft.points];

    if (draft.mode === 'freehand') {
      if (basePoints.length >= 2) {
        const closedPoints = [...basePoints, basePoints[0]];
        const commands = closedPoints.map((p, index) => `${index === 0 ? 'M' : 'L'}${p.x} ${p.y}`);
        draftPath = commands.join(' ');
        draftFill = closedPoints.length > 3 ? operationFill : 'none';
        draftStrokeDasharray = closedPoints.length > 3 ? undefined : '6 4';
      }
    } else if (draft.mode === 'polygon') {
      if (basePoints.length > 0) {
        const commands = basePoints.map((p, index) => `${index === 0 ? 'M' : 'L'}${p.x} ${p.y}`);
        const isClosing = draft.closingHint === 'near-start' && draft.points.length >= 3;
        draftPath = `${commands.join(' ')}${isClosing ? ' Z' : ''}`;
        draftFill = isClosing ? operationFill : 'none';
        draftStrokeDasharray = isClosing ? undefined : '6 4';

        const firstPoint = draft.points[0];
        if (firstPoint) {
          startIndicator = {
            point: firstPoint,
            color: operationStroke,
            highlighted: isClosing,
          };
        }

        if (previewPoint && firstPoint) {
          closingSegmentPath = `M${previewPoint.x} ${previewPoint.y} L${firstPoint.x} ${firstPoint.y}`;
          closingSegmentStroke = isClosing ? operationStroke : 'rgba(148,163,184,0.9)';
          closingSegmentDasharray = isClosing ? undefined : '4 4';
        }

        const labelAnchor = previewPoint ?? draft.points[draft.points.length - 1] ?? firstPoint;
        if (labelAnchor) {
          const hintText = isClosing
            ? t('cropMagicWandPolygonClose')
            : t('cropMagicWandPolygonHint');
          hintLabel = { point: labelAnchor, lines: hintText.split('\n') };
        }
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

      {closingSegmentPath && (
        <path
          d={closingSegmentPath}
          fill="none"
          stroke={closingSegmentStroke}
          strokeWidth={1.5}
          strokeDasharray={closingSegmentDasharray}
          vectorEffect="non-scaling-stroke"
        />
      )}

      {draftPath && (
        <path
          d={draftPath}
          fill={draftFill}
          stroke={draftStroke}
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
          strokeDasharray={draftStrokeDasharray}
        />
      )}

      {startIndicator && (
        <g>
          <circle
            cx={startIndicator.point.x}
            cy={startIndicator.point.y}
            r={startIndicator.highlighted ? 7 : 6}
            fill="rgba(15,23,42,0.75)"
            stroke={startIndicator.color}
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
          <circle
            cx={startIndicator.point.x}
            cy={startIndicator.point.y}
            r={startIndicator.highlighted ? 4 : 3}
            fill={startIndicator.highlighted ? startIndicator.color : 'rgba(255,255,255,0.95)'}
            stroke={startIndicator.color}
            strokeWidth={1.2}
            vectorEffect="non-scaling-stroke"
          />
        </g>
      )}

      {hintLabel && (
        <text
          x={hintLabel.point.x}
          y={hintLabel.point.y - 20 - Math.max(0, hintLabel.lines.length - 1) * 14}
          textAnchor="middle"
          fontSize={12}
          fill="#fff"
          stroke="rgba(15,23,42,0.75)"
          strokeWidth={3}
          paintOrder="stroke"
          className="select-none"
        >
          {hintLabel.lines.map((line, index) => (
            <tspan key={`${line}-${index}`} x={hintLabel.point.x} dy={index === 0 ? 0 : 14}>
              {line}
            </tspan>
          ))}
        </text>
      )}
    </g>
  );
};
