/**
 * 本文件是 Whiteboard 的子组件，负责渲染拖拽套索选择时出现的虚线选择路径（Lasso）。
 */
import React from 'react';
import type { Point } from '../../types';

interface LassoProps {
  lassoPath: Point[] | null;
}

export const Lasso: React.FC<LassoProps> = React.memo(({ lassoPath }) => {
  if (!lassoPath || lassoPath.length < 2) {
    return null;
  }

  const pointsString = lassoPath.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <polyline
      points={pointsString}
      fill="rgba(22, 163, 175, 0.1)"
      stroke="rgba(22, 163, 175, 0.5)"
      strokeWidth={1}
      strokeDasharray="4 4"
      className="pointer-events-none"
    />
  );
});
