/**
 * 本文件是 Whiteboard 的子组件，负责渲染正在绘制的图形的实时预览效果。
 * 这包括画笔的笔迹、正在拖拽的矩形/椭圆的虚线框，以及钢笔工具的预览线段。
 */

import React from 'react';
import type { RoughSVG } from 'roughjs/bin/svg';
import type { LivePath, DrawingShape, VectorPathData } from '../../types';
import { pointsToSimplePathD, anchorsToPathD } from '../../lib/path-fitting';
import { getPolygonPathD } from '../../lib/drawing';
import { RoughPath } from './PathsRenderer';

// For live brush previews, we use a simple, performant path.
const LivePathPreview: React.FC<{ data: LivePath }> = React.memo(({ data }) => {
  const d = pointsToSimplePathD(data.points);
  return (
    <path
      d={d}
      stroke={data.color}
      strokeWidth={data.strokeWidth}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="pointer-events-none"
    />
  );
});

interface LivePreviewRendererProps {
  currentLivePath: LivePath | null;
  drawingShape: DrawingShape | null;
  currentPenPath: VectorPathData | null;
  currentLinePath: VectorPathData | null;
  previewD: string | null;
  rc: RoughSVG | null;
  viewTransform: { scale: number };
}

export const LivePreviewRenderer: React.FC<LivePreviewRendererProps> = React.memo(({
  currentLivePath,
  drawingShape,
  currentPenPath,
  currentLinePath,
  previewD,
  rc,
  viewTransform,
}) => {
  return (
    <>
      {/* Render live brush path */}
      {currentLivePath && <LivePathPreview data={currentLivePath} />}

      {/* Render live shape drawing */}
      {drawingShape && (
        <g>
          {drawingShape.tool === 'rectangle' && (
            <rect
              x={drawingShape.x}
              y={drawingShape.y}
              width={drawingShape.width}
              height={drawingShape.height}
              fill={drawingShape.fill === 'transparent' ? 'none' : drawingShape.fill}
              stroke={drawingShape.color}
              strokeWidth={1 / viewTransform.scale}
              strokeDasharray={`4 ${4 / viewTransform.scale}`}
              className="pointer-events-none"
            />
          )}
          {drawingShape.tool === 'ellipse' && (
            <ellipse
              cx={drawingShape.x + drawingShape.width / 2}
              cy={drawingShape.y + drawingShape.height / 2}
              rx={Math.abs(drawingShape.width / 2)}
              ry={Math.abs(drawingShape.height / 2)}
              fill={drawingShape.fill === 'transparent' ? 'none' : drawingShape.fill}
              stroke={drawingShape.color}
              strokeWidth={1 / viewTransform.scale}
              strokeDasharray={`4 ${4 / viewTransform.scale}`}
              className="pointer-events-none"
            />
          )}
          {drawingShape.tool === 'polygon' && (
            <path
              d={getPolygonPathD(
                drawingShape.x,
                drawingShape.y,
                drawingShape.width,
                drawingShape.height,
                drawingShape.sides,
                drawingShape.borderRadius
              )}
              fill={drawingShape.fill === 'transparent' ? 'none' : drawingShape.fill}
              stroke={drawingShape.color}
              strokeWidth={1 / viewTransform.scale}
              strokeDasharray={`4 ${4 / viewTransform.scale}`}
              strokeLinejoin="round"
              className="pointer-events-none"
            />
          )}
          {drawingShape.tool === 'line' && drawingShape.anchors.length > 1 && (
            <path d={anchorsToPathD(drawingShape.anchors)} fill="none" stroke={drawingShape.color} strokeWidth={1 / viewTransform.scale} strokeDasharray={`4 ${4 / viewTransform.scale}`} className="pointer-events-none" />
          )}
        </g>
      )}

      {/* Render pen preview path */}
      {previewD && (
        <path
          d={previewD}
          fill="none"
          stroke="var(--accent-primary)"
          strokeWidth={1 / viewTransform.scale}
          strokeDasharray={`4 ${4 / viewTransform.scale}`}
          className="pointer-events-none"
        />
      )}

      {/* Render current pen/line path, treated as "selected" for correct curve preview */}
      {currentPenPath && <RoughPath rc={rc} data={currentPenPath} />}
      {currentLinePath && <RoughPath rc={rc} data={currentLinePath} />}
    </>
  );
});