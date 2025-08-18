/**
 * 本文件是 Whiteboard 的子组件，负责在画布背景上渲染网格图案。
 * 网格的可见性和大小由外部传入的 props 控制。
 */

import React from 'react';

interface GridProps {
  isGridVisible: boolean;
  gridSize: number;
  viewTransform: { scale: number; translateX: number; translateY: number };
}

export const Grid: React.FC<GridProps> = React.memo(({ isGridVisible, gridSize, viewTransform }) => {
  if (!isGridVisible) {
    return null;
  }

  return (
    <>
      <defs>
        <pattern
          id="grid"
          width={gridSize * viewTransform.scale}
          height={gridSize * viewTransform.scale}
          patternUnits="userSpaceOnUse"
          x={viewTransform.translateX}
          y={viewTransform.translateY}
        >
          <path
            d={`M ${gridSize * viewTransform.scale} 0 L 0 0 0 ${gridSize * viewTransform.scale}`}
            fill="none"
            stroke="var(--grid-line)"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect
        className="pointer-events-none"
        width="100%"
        height="100%"
        fill="url(#grid)"
      />
    </>
  );
});