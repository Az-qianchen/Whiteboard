/**
 * 本文件是 Whiteboard 的子组件，负责在画布背景上渲染网格图案。
 * 网格的可见性和大小由外部传入的 props 控制。
 */

import React from 'react';

interface GridProps {
  isGridVisible: boolean;
  gridSize: number;
  viewTransform: { scale: number; translateX: number; translateY: number };
  gridSubdivisions: number;
  gridOpacity: number;
}

export const Grid: React.FC<GridProps> = React.memo(({ isGridVisible, gridSize, viewTransform, gridSubdivisions, gridOpacity }) => {
  if (!isGridVisible || gridSize <= 0) {
    return null;
  }

  const SUBGRID_VISIBILITY_THRESHOLD = 5; // 如果二级网格线之间的距离小于5像素，则隐藏它们。
  const scaledGridSize = gridSize * viewTransform.scale;
  if (scaledGridSize <= 0) {
    return null;
  }

  const effectiveSubdivisions = gridSubdivisions > 0 ? gridSubdivisions : 1;
  const scaledSubGridSize = scaledGridSize / effectiveSubdivisions;
  const showSubgrid = gridSubdivisions > 1 && scaledSubGridSize >= SUBGRID_VISIBILITY_THRESHOLD;

  // 使用模运算使网格相对于画布原点保持静止。
  // 主图案的偏移足以使嵌套的子图案在平移时保持静止。
  const patternX = viewTransform.translateX % scaledGridSize;
  const patternY = viewTransform.translateY % scaledGridSize;


  return (
    <>
      <defs>
        {showSubgrid && (
          <pattern
            id="subgrid"
            width={scaledSubGridSize}
            height={scaledSubGridSize}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${scaledSubGridSize} 0 L 0 0 0 ${scaledSubGridSize}`}
              fill="none"
              stroke="var(--subgrid-line)"
              strokeWidth="1.5"
              strokeDasharray="8 6"
              strokeOpacity={0.4}
            />
          </pattern>
        )}
        <pattern
          id="grid"
          width={scaledGridSize}
          height={scaledGridSize}
          patternUnits="userSpaceOnUse"
          x={patternX}
          y={patternY}
        >
          {showSubgrid && <rect width={scaledGridSize} height={scaledGridSize} fill="url(#subgrid)" />}
          <path
            d={`M ${scaledGridSize} 0 L 0 0 0 ${scaledGridSize}`}
            fill="none"
            stroke="var(--grid-line)"
            strokeWidth="4"
          />
        </pattern>
      </defs>
      <rect
        className="pointer-events-none"
        width="100%"
        height="100%"
        fill="url(#grid)"
        opacity={gridOpacity}
      />
    </>
  );
});