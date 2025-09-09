/**
 * 本文件是 Whiteboard 的子组件，负责渲染拖拽套索选择时出现的虚线选择路径（Lasso）。
 */
import React from 'react';
import type { Point } from '../../types';

interface LassoProps {
  lassoPath: Point[] | null;
  viewTransform: { scale: number };
}

export const Lasso: React.FC<LassoProps> = React.memo(({ lassoPath, viewTransform }) => {
  if (!lassoPath || lassoPath.length < 2) {
    return null;
  }

  const pointsString = lassoPath.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <polygon
      points={pointsString}
      fill="var(--accent-highlight-fill)"
      stroke="var(--accent-highlight-stroke)"
      strokeWidth={1 / viewTransform.scale}
      strokeDasharray={`${4 / viewTransform.scale} ${4 / viewTransform.scale}`}
      strokeLinejoin="round"
      className="pointer-events-none"
    />
  );
});
