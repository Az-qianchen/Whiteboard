/**
 * 本文件定义了白板的核心组件。
 * 它负责渲染所有的绘图路径、实时预览、选择框以及编辑控件，
 * 并处理画布上的所有指针事件（如鼠标按下、移动、抬起）。
 */

import React, { useRef, useEffect, useState, useMemo, useLayoutEffect } from 'react';
import rough from 'roughjs/bin/rough';
import type { RoughSVG } from 'roughjs/bin/svg';
import type { AnyPath, VectorPathData, LivePath, Point, DrawingShape, Tool, DragState, SelectionMode, ImageData, BBox } from '../types';
import { getPointerPosition } from '../lib/utils';
import { collectPathsByIds } from '@/lib/pathTree';
import { useViewTransformStore } from '@/context/viewTransformStore';
import { getPathsBoundingBox } from '@/lib/drawing';

// Import new sub-components
import { Grid } from './whiteboard/Grid';
import { PathsRenderer } from './whiteboard/PathsRenderer';
import { LivePreviewRenderer } from './whiteboard/LivePreviewRenderer';
import { ControlsRenderer } from './whiteboard/ControlsRenderer';
import { Marquee } from './whiteboard/Marquee';
import { Lasso } from './whiteboard/Lasso';
import { CropOverlay } from './whiteboard/CropOverlay';
import { MagicWandOverlay } from './whiteboard/MagicWandOverlay';


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
  onWheel: (e: WheelEvent) => void;
  onContextMenu: (e: React.MouseEvent<HTMLDivElement>) => void;
  viewTransform: { scale: number, translateX: number, translateY: number };
  cursor: string;
  isGridVisible: boolean;
  gridSize: number;
  gridSubdivisions: number;
  gridOpacity: number;
  dragState: DragState | null;
  croppingState: { pathId: string; originalPath: ImageData; } | null;
  currentCropRect: BBox | null;
  cropTool: 'crop' | 'magic-wand';
  cropSelectionContours: Array<{ d: string; inner: boolean }> | null;
  cropManualDraft?: {
    mode: 'freehand' | 'polygon';
    operation: 'add' | 'subtract' | 'replace';
    points: Point[];
    previewPoint?: Point;
  } | null;
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
  croppingState,
  currentCropRect,
  cropTool,
  cropSelectionContours,
  cropManualDraft,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [rc, setRc] = useState<RoughSVG | null>(null);
  const [currentPointerPos, setCurrentPointerPos] = useState<Point | null>(null);
  const lastPointerPosRef = useRef<Point | null>(null);
  const rafPendingRef = useRef(false);
  const setLastPointerPosition = useViewTransformStore(s => s.setLastPointerPosition);
  const pendingFitToContent = useViewTransformStore(s => s.pendingFitToContent);
  const setViewTransformState = useViewTransformStore(s => s.setViewTransform);
  const consumeFitToContent = useViewTransformStore(s => s.consumeFitToContent);

  useEffect(() => {
    if (svgRef.current) {
      setRc(rough.svg(svgRef.current));
    }
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handle = (e: WheelEvent) => onWheel(e);
    el.addEventListener('wheel', handle, { passive: false });
    return () => {
      el.removeEventListener('wheel', handle);
    };
  }, [onWheel]);

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
  const selectedPaths = useMemo(
    () => collectPathsByIds(paths, selectedPathIds),
    [paths, selectedPathIds],
  );
  
  // 记忆化计算可见的路径，仅排除显式隐藏的路径
  const visiblePaths = useMemo(() => paths.filter(p => p.isVisible !== false), [paths]);

  useLayoutEffect(() => {
    if (!pendingFitToContent) return;
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width === 0 || height === 0) return;

    const pathsToFit = visiblePaths.length > 0 ? visiblePaths : paths;
    if (!pathsToFit || pathsToFit.length === 0) {
      consumeFitToContent();
      return;
    }

    const bbox = getPathsBoundingBox(pathsToFit, true);
    if (!bbox) {
      consumeFitToContent();
      return;
    }

    const padding = Math.min(width, height) * 0.1;
    const availableWidth = Math.max(width - padding * 2, 1);
    const availableHeight = Math.max(height - padding * 2, 1);
    const targetWidth = Math.max(bbox.width, 1);
    const targetHeight = Math.max(bbox.height, 1);

    let scale = Math.min(availableWidth / targetWidth, availableHeight / targetHeight);
    if (!isFinite(scale) || scale <= 0) {
      scale = 1;
    }
    scale = Math.max(0.1, Math.min(10, scale));

    const centerX = bbox.x + bbox.width / 2;
    const centerY = bbox.y + bbox.height / 2;

    const translateX = width / 2 - centerX * scale;
    const translateY = height / 2 - centerY * scale;

    setViewTransformState(() => ({ scale, translateX, translateY }));
    consumeFitToContent();
  }, [pendingFitToContent, visiblePaths, paths, setViewTransformState, consumeFitToContent]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-transparent overflow-hidden touch-none overscroll-none"
      style={{ cursor }}
      onContextMenu={onContextMenu}
    >
      <svg
        ref={svgRef}
        className="w-full h-full touch-none"
        data-whiteboard-canvas="true"
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
          {croppingState && ((cropSelectionContours && cropSelectionContours.length > 0) || (cropManualDraft && cropManualDraft.points.length > 0)) && (
            <MagicWandOverlay
              contours={cropSelectionContours ?? []}
              draft={cropManualDraft ?? null}
              viewScale={viewTransform.scale}
            />
          )}

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
            cropTool={cropTool}
          />
          
          <Marquee marquee={marquee} viewTransform={viewTransform} />
          <Lasso lassoPath={lassoPath} viewTransform={viewTransform} />
          
        </g>
      </svg>
    </div>
  );
};
