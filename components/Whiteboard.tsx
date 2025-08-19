/**
 * 本文件定义了白板的核心组件。
 * 它负责渲染所有的绘图路径、实时预览、选择框以及编辑控件，
 * 并处理画布上的所有指针事件（如鼠标按下、移动、抬起）。
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import rough from 'roughjs/bin/rough';
import type { RoughSVG } from 'roughjs/bin/svg';
import type { AnyPath, VectorPathData, LivePath, Point, DrawingShape, Tool, DragState, SelectionMode } from '../types';
import { getPointerPosition } from '../lib/utils';

// Import new sub-components
import { Grid } from './whiteboard/Grid';
import { PathsRenderer } from './whiteboard/PathsRenderer';
import { LivePreviewRenderer } from './whiteboard/LivePreviewRenderer';
import { ControlsRenderer } from './whiteboard/ControlsRenderer';
import { Marquee } from './whiteboard/Marquee';
import { Lasso } from './whiteboard/Lasso';


interface WhiteboardProps {
  paths: AnyPath[];
  tool: Tool;
  selectionMode: SelectionMode;
  currentLivePath: LivePath | null;
  drawingShape: DrawingShape | null;
  currentPenPath: VectorPathData | null;
  currentLinePath: VectorPathData | null;
  previewD: string | null;
  selectedPathIds: string[];
  marquee: { start: Point; end: Point } | null;
  lassoPath: Point[] | null;
  onPointerDown: (e: React.PointerEvent<SVGSVGElement>) => void;
  onPointerMove: (e: React.PointerEvent<SVGSVGElement>) => void;
  onPointerUp: (e: React.PointerEvent<SVGSVGElement>) => void;
  onPointerLeave: (e: React.PointerEvent<SVGSVGElement>) => void;
  onWheel: (e: React.WheelEvent<HTMLDivElement>) => void;
  onContextMenu: (e: React.MouseEvent<HTMLDivElement>) => void;
  viewTransform: { scale: number, translateX: number, translateY: number };
  cursor: string;
  isGridVisible: boolean;
  gridSize: number;
  dragState: DragState | null;
}

export const Whiteboard: React.FC<WhiteboardProps> = ({
  paths,
  tool,
  selectionMode,
  currentLivePath,
  drawingShape,
  currentPenPath,
  currentLinePath,
  previewD,
  selectedPathIds,
  marquee,
  lassoPath,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerLeave,
  onWheel,
  onContextMenu,
  viewTransform,
  cursor,
  isGridVisible,
  gridSize,
  dragState,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [rc, setRc] = useState<RoughSVG | null>(null);
  const [currentPointerPos, setCurrentPointerPos] = useState<Point | null>(null);

  useEffect(() => {
    if (svgRef.current) {
      setRc(rough.svg(svgRef.current));
    }
  }, []);

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (svgRef.current) {
        const point = getPointerPosition(e, svgRef.current, viewTransform);
        setCurrentPointerPos(point);
    }
    onPointerMove(e);
  };

  const handlePointerLeave = (e: React.PointerEvent<SVGSVGElement>) => {
    setCurrentPointerPos(null);
    onPointerLeave(e);
  };

  const selectedPaths = useMemo(() => {
    return paths.filter(p => selectedPathIds.includes(p.id));
  }, [paths, selectedPathIds]);

  return (
    <div
      className="w-full h-full bg-transparent overflow-hidden touch-none"
      onWheel={onWheel}
      style={{ cursor }}
      onContextMenu={onContextMenu}
    >
      <svg
        ref={svgRef}
        className="w-full h-full"
        onPointerDown={onPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={handlePointerLeave}
      >
        <Grid isGridVisible={isGridVisible} gridSize={gridSize} viewTransform={viewTransform} />
        
        <g style={{ transform: `translate(${viewTransform.translateX}px, ${viewTransform.translateY}px) scale(${viewTransform.scale})` }}>
          
          <PathsRenderer paths={paths} rc={rc} />

          <LivePreviewRenderer
            currentLivePath={currentLivePath}
            drawingShape={drawingShape}
            currentPenPath={currentPenPath}
            currentLinePath={currentLinePath}
            previewD={previewD}
            rc={rc}
            viewTransform={viewTransform}
          />
          
          <ControlsRenderer
            tool={tool}
            selectionMode={selectionMode}
            selectedPaths={selectedPaths}
            currentPenPath={currentPenPath}
            currentLinePath={currentLinePath}
            scale={viewTransform.scale}
            dragState={dragState}
            hoveredPoint={currentPointerPos}
          />
          
          <Marquee marquee={marquee} viewTransform={viewTransform} />
          <Lasso lassoPath={lassoPath} />
          
        </g>
      </svg>
    </div>
  );
};