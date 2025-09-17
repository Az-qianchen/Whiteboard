/**
 * 本文件定义了一个自定义 Hook (useSelection)，用于封装所有与选择工具相关的交互逻辑。
 * 它处理路径的选择、移动、缩放、旋转以及锚点和控制手柄的编辑。
 * 该 Hook 协调状态管理，并将复杂的事件处理逻辑委托给 `selection-logic.ts`。
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import type {
  Point,
  DragState,
  AnyPath,
  ImageData,
  BBox,
  SelectionPathState,
  SelectionToolbarState,
  SelectionViewTransform,
  CroppingTool,
} from '../types';
import { handlePointerDownLogic, handlePointerMoveLogic, handlePointerUpLogic } from './selection-logic/index';

// 定义 Hook 将接收的 props
interface SelectionInteractionProps {
  pathState: SelectionPathState; // from usePaths
  toolbarState: SelectionToolbarState; // from useToolbarState
  viewTransform: SelectionViewTransform; // from useViewTransform
  isGridVisible: boolean;
  gridSize: number;
  gridSubdivisions: number;
  onDoubleClick: (path: AnyPath) => void;
  croppingState: { pathId: string, originalPath: ImageData } | null;
  currentCropRect: BBox | null;
  setCurrentCropRect: React.Dispatch<React.SetStateAction<BBox | null>>;
  pushCropHistory: (rect: BBox) => void;
  croppingTool: CroppingTool;
}

/**
 * 自定义钩子，用于管理所有与 SELECTION 工具相关的指针交互。
 * 它协调状态管理和从 'selection-logic' 模块导入的复杂逻辑。
 */
export const useSelection = ({
  pathState,
  toolbarState,
  viewTransform,
  isGridVisible,
  gridSize,
  gridSubdivisions,
  onDoubleClick,
  croppingState,
  currentCropRect,
  setCurrentCropRect,
  pushCropHistory,
  croppingTool,
}: SelectionInteractionProps) => {
  const [dragState, setDragState] = useState<DragState>(null);
  const [marquee, setMarquee] = useState<{ start: Point; end: Point } | null>(null);
  const [lassoPath, setLassoPath] = useState<Point[] | null>(null);
  const [isHoveringMovable, setIsHoveringMovable] = useState(false);
  const [isHoveringEditable, setIsHoveringEditable] = useState(false);
  const isClosingPath = useRef<{ pathId: string; anchorIndex: number } | null>(null);
  const lastClickRef = useRef<{ time: number; pathId: string | null }>({ time: 0, pathId: null });

  const { getPointerPosition } = viewTransform;
  const { paths } = pathState;
  
  /**
   * 将点吸附到网格。
   * @param point - 要吸附的原始点。
   * @returns 吸附到网格后的新点。
   */
  const snapToGrid = useCallback((point: Point): Point => {
    if (!isGridVisible) return point;
    const snapSize = gridSubdivisions > 1 ? gridSize / gridSubdivisions : gridSize;
    return {
      x: Math.round(point.x / snapSize) * snapSize,
      y: Math.round(point.y / snapSize) * snapSize,
    };
  }, [isGridVisible, gridSize, gridSubdivisions]);

  // 当路径从外部更改时，自动清除过时的拖拽状态
  useEffect(() => {
    if (dragState) {
      const pathExists = (pathId: string) => paths.some((p: AnyPath) => p.id === pathId);
      let isStale = false;
      if (['anchor', 'handleIn', 'handleOut', 'resize', 'border-radius', 'arc', 'crop'].includes(dragState.type)) {
        if (!pathExists((dragState as any).pathId)) isStale = true;
      } else if (['move', 'scale', 'rotate'].includes(dragState.type)) {
        if (!(dragState as any).pathIds.every(pathExists)) isStale = true;
      }
      if (isStale) setDragState(null);
    }
  }, [paths, dragState]);

  /**
   * 处理选择工具的所有指针按下事件的统一入口点。
   * @param e - React 指针事件。
   */
  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const point = getPointerPosition(e, e.currentTarget);
    
    handlePointerDownLogic({
      e, point, setDragState, setMarquee, setLassoPath,
      pathState, toolbarState, viewTransform,
      onDoubleClick, lastClickRef, croppingState,
      currentCropRect,
      croppingTool,
    });
  };

  /**
   * 处理指针移动事件，根据当前拖拽状态更新图形或选择框。
   * @param e - React 指针事件。
   */
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const movePoint = getPointerPosition(e, e.currentTarget);
    
    handlePointerMoveLogic({
      e, movePoint, dragState, marquee, setMarquee, lassoPath, setLassoPath,
      pathState, toolbarState, viewTransform,
      setIsHoveringMovable, setIsHoveringEditable, isClosingPath, snapToGrid,
      setCurrentCropRect,
    });
  };
  
  /**
   * 处理指针抬起事件，完成拖拽、选择或关闭路径操作。
   * @param e - React 指针事件。
   */
  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.currentTarget && e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
    }
    
    handlePointerUpLogic({
      e, dragState, setDragState, marquee, setMarquee, lassoPath, setLassoPath,
      pathState, isClosingPath, pushCropHistory,
    });
    
    setIsHoveringMovable(false);
    setIsHoveringEditable(false);
  };

  /**
   * 处理指针离开画布事件，通常用于取消或完成进行中的操作。
   * @param e - React 指针事件。
   */
  const onPointerLeave = (e: React.PointerEvent<SVGSVGElement>) => {
      if (dragState || marquee || lassoPath) {
          onPointerUp(e);
      }
      setIsHoveringMovable(false);
      setIsHoveringEditable(false);
  };
  
  return { onPointerDown, onPointerMove, onPointerUp, onPointerLeave, dragState, marquee, lassoPath, isHoveringMovable, isHoveringEditable };
};