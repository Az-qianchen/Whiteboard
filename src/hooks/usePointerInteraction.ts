/**
 * 本文件定义了一个指针交互的协调器 Hook (usePointerInteraction)。
 * 它根据当前选择的工具，将画布上的指针事件（如按下、移动、抬起）分发给相应的处理逻辑（例如，绘图或选择）。
 */

import React from 'react';
import type { Tool } from '../types';

interface InteractionHandlers {
  onPointerDown: (e: React.PointerEvent<SVGSVGElement>) => void;
  onPointerMove: (e: React.PointerEvent<SVGSVGElement>) => void;
  onPointerUp: (e: React.PointerEvent<SVGSVGElement>) => void | Promise<void>;
  onPointerLeave: (e: React.PointerEvent<SVGSVGElement>) => void;
}

interface PointerInteractionProps {
  tool: Tool;
  viewTransform: any; // from useViewTransform
  drawingInteraction: InteractionHandlers;
  selectionInteraction: InteractionHandlers;
}

/**
 * A simplified coordinator hook that dispatches pointer events to the appropriate
 * interaction hook (useDrawing or useSelection) based on the current tool.
 */
export const usePointerInteraction = ({
  tool,
  viewTransform,
  drawingInteraction,
  selectionInteraction,
}: PointerInteractionProps) => {

  const { isPanning, setIsPanning } = viewTransform;

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    // Middle-mouse-button panning is always available
    if (e.button === 1 || (e.altKey && tool !== 'selection')) {
      e.currentTarget.setPointerCapture(e.pointerId);
      setIsPanning(true);
      return;
    }
    if (e.button !== 0) return;

    if (tool === 'selection') {
      selectionInteraction.onPointerDown(e);
    } else {
      drawingInteraction.onPointerDown(e);
    }
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (isPanning) {
      viewTransform.handlePanMove(e);
      return;
    }
    
    if (tool === 'selection') {
      selectionInteraction.onPointerMove(e);
    } else {
      drawingInteraction.onPointerMove(e);
    }
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (isPanning) {
      if (e.currentTarget && e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      setIsPanning(false);
      return;
    }
    
    if (tool === 'selection') {
      selectionInteraction.onPointerUp(e);
    } else {
      drawingInteraction.onPointerUp(e);
    }
  };
  
  const onPointerLeave = (e: React.PointerEvent<SVGSVGElement>) => {
    if (isPanning) {
        if (e.currentTarget && e.currentTarget.hasPointerCapture(e.pointerId)) {
            // FIX: Corrected method name to releasePointerCapture and completed the function.
            e.currentTarget.releasePointerCapture(e.pointerId);
        }
        setIsPanning(false);
        return;
    }
    
    if (tool === 'selection') {
      selectionInteraction.onPointerLeave(e);
    } else {
      drawingInteraction.onPointerLeave(e);
    }
  };

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerLeave,
  };
};
