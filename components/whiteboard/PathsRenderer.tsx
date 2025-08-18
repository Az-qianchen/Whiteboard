/**
 * 本文件是 Whiteboard 的子组件，负责渲染所有已经完成并存储的绘图路径。
 * 它使用 RoughJS 库来创建手绘风格的 SVG 图形。
 */

import React, { useRef, useEffect } from 'react';
import type { RoughSVG } from 'roughjs/bin/svg';
import type { AnyPath } from '../../types';
import { renderPathNode } from '../../lib/export';

// For completed paths, we use RoughJS to render them in a hand-drawn style.
export const RoughPath: React.FC<{ rc: RoughSVG | null; data: AnyPath }> = React.memo(({ rc, data }) => {
  const gRef = useRef<SVGGElement>(null);

  useEffect(() => {
    if (!rc || !gRef.current) return;
    const g = gRef.current;
    while (g.firstChild) {
      g.removeChild(g.firstChild);
    }
    const node = renderPathNode(rc, data);
    if (node) {
      g.appendChild(node);
    }
  }, [rc, data]);

  return <g ref={gRef} className="pointer-events-none" />;
});

interface PathsRendererProps {
  paths: AnyPath[];
  rc: RoughSVG | null;
}

export const PathsRenderer: React.FC<PathsRendererProps> = React.memo(({ paths, rc }) => {
  return (
    <>
      {paths.map((path) => (
        <RoughPath key={path.id} rc={rc} data={path} />
      ))}
    </>
  );
});