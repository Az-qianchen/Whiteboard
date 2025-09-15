/**
 * 本文件定义了白板的核心组件。
 * 它负责渲染所有的绘图路径、实时预览、选择框以及编辑控件，
 * 并处理画布上的所有指针事件（如鼠标按下、移动、抬起）。
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import rough from 'roughjs/bin/rough';
import type { RoughSVG } from 'roughjs/bin/svg';
import type { AnyPath, VectorPathData, LivePath, Point, DrawingShape, Tool, DragState, SelectionMode, ImageData, BBox } from '../types';
import { getPointerPosition } from '../lib/utils';
import { useViewTransformStore } from '@/context/viewTransformStore';

// Import new sub-components
import { Grid } from './whiteboard/Grid';
import { PathsRenderer } from './whiteboard/PathsRenderer';
import { LivePreviewRenderer } from './whiteboard/LivePreviewRenderer';
import { ControlsRenderer } from './whiteboard/ControlsRenderer';
import { Marquee } from './whiteboard/Marquee';
import { Lasso } from './whiteboard/Lasso';
import { CropOverlay } from './whiteboard/CropOverlay';


interface WhiteboardProps {
  paths: AnyPath[];
  onionSkinPaths: AnyPath[];
  backgroundPaths: AnyPath[];
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
  gridSubdivisions: number;
  gridOpacity: number;
  dragState: DragState | null;
  editingTextPathId: string | null;
  croppingState: { pathId: string; originalPath: ImageData; } | null;
  currentCropRect: BBox | null;
}

/**
 * 白板的核心渲染和交互组件。
 * @description 该组件集成了网格、路径渲染器、实时预览和编辑控件，并处理所有用户输入事件。
 * @param {WhiteboardProps} props - 组件的 props，包含了所有需要渲染和交互的数据。
 * @returns {React.ReactElement} 渲染后的白板 SVG 区域。
 */
export const Whiteboard: React.FC<WhiteboardProps> = ({
  paths,
  onionSkinPaths,
  backgroundPaths,
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
  gridSubdivisions,
  gridOpacity,
  dragState,
  editingTextPathId,
  croppingState,
  currentCropRect,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [rc, setRc] = useState<RoughSVG | null>(null);
  const [currentPointerPos, setCurrentPointerPos] = useState<Point | null>(null);
  const lastPointerPosRef = useRef<Point | null>(null);
  const rafPendingRef = useRef(false);
  const setLastPointerPosition = useViewTransformStore(s => s.setLastPointerPosition);

  useEffect(() => {
    if (svgRef.current) {
      setRc(rough.svg(svgRef.current));
    }
  }, []);

  /**
   * 处理指针在 SVG 画布上移动的事件。
   * @description 更新当前指针位置以用于悬停效果，并调用上层的 onPointerMove 处理函数。
   * @param {React.PointerEvent<SVGSVGElement>} e - 指针事件对象。
   */
  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (svgRef.current) {
      const point = getPointerPosition(e, svgRef.current, viewTransform);
      lastPointerPosRef.current = point;
      if (!rafPendingRef.current) {
        rafPendingRef.current = true;
        requestAnimationFrame(() => {
          rafPendingRef.current = false;
          // Only update state if value actually changed
          const p = lastPointerPosRef.current;
          if (!p && currentPointerPos) {
            setCurrentPointerPos(null);
            setLastPointerPosition(null);
          } else if (p && (!currentPointerPos || p.x !== currentPointerPos.x || p.y !== currentPointerPos.y)) {
            setCurrentPointerPos(p);
            setLastPointerPosition(p);
          }
        });
      }
    }
    onPointerMove(e);
  };

  /**
   * 处理指针离开 SVG 画布的事件。
   * @description 清除当前指针位置，并调用上层的 onPointerLeave 处理函数。
   * @param {React.PointerEvent<SVGSVGElement>} e - 指针事件对象。
   */
  const handlePointerLeave = (e: React.PointerEvent<SVGSVGElement>) => {
    setCurrentPointerPos(null);
    setLastPointerPosition(null);
    onPointerLeave(e);
  };

  // 记忆化计算选中的路径，以避免不必要的重渲染
  const selectedPaths = useMemo(() => {
    return paths.filter(p => selectedPathIds.includes(p.id));
  }, [paths, selectedPathIds]);
  
  // 记忆化计算可见的路径，排除不可见和正在编辑的文本路径
  const visiblePaths = useMemo(() => {
      // 检查当前正在编辑的文本路径是否也正在被移动。
      const isMovingEditedPath =
        dragState?.type === 'move' &&
        editingTextPathId &&
        'pathIds' in dragState &&
        (dragState as any).pathIds.includes(editingTextPathId);

      // 过滤规则：
      // 1. 路径必须是可见的。
      // 2. 如果一个路径不是正在编辑的文本，则它是可见的。
      // 3. 如果一个路径是正在编辑的文本，并且正在被移动，我们也会让它“可见”。
      //    这是为了防止在移动时选择高亮（这是SVG的一部分）消失，这种消失会被感知为“闪烁”。
      //    HTML <textarea> 编辑器会渲染在它的上面。虽然这可能会导致文本看起来更粗，
      //    但在拖动操作期间，这是一个可接受的折衷方案，以换取更流畅的视觉反馈。
      return paths.filter(p => p.isVisible !== false && (p.id !== editingTextPathId || isMovingEditedPath));
  }, [paths, editingTextPathId, dragState]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-transparent overflow-hidden touch-none overscroll-none"
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
        <Grid isGridVisible={isGridVisible} gridSize={gridSize} viewTransform={viewTransform} gridSubdivisions={gridSubdivisions} gridOpacity={gridOpacity} />
        
        <g style={{ transform: `translate(${viewTransform.translateX}px, ${viewTransform.translateY}px) scale(${viewTransform.scale})` }}>
          
          <PathsRenderer paths={backgroundPaths} rc={rc} isBackground />
          <PathsRenderer paths={onionSkinPaths} rc={rc} />
          <PathsRenderer paths={visiblePaths} rc={rc} />

          <LivePreviewRenderer
            currentLivePath={currentLivePath}
            drawingShape={drawingShape}
            currentPenPath={currentPenPath}
            currentLinePath={currentLinePath}
            previewD={previewD}
            rc={rc}
            viewTransform={viewTransform}
          />
          
          {croppingState && currentCropRect && <CropOverlay croppingState={croppingState} currentCropRect={currentCropRect} />}

          <ControlsRenderer
            tool={tool}
            selectionMode={selectionMode}
            selectedPaths={selectedPaths}
            currentPenPath={currentPenPath}
            currentLinePath={currentLinePath}
            scale={viewTransform.scale}
            dragState={dragState}
            hoveredPoint={currentPointerPos}
            croppingState={croppingState}
            currentCropRect={currentCropRect}
          />
          
          <Marquee marquee={marquee} viewTransform={viewTransform} />
          <Lasso lassoPath={lassoPath} viewTransform={viewTransform} />
          
        </g>
      </svg>
    </div>
  );
};
