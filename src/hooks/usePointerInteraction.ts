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
  viewTransform: {
    isPanning: boolean;
    setIsPanning: (v: boolean) => void;
    handlePanMove: (e: React.PointerEvent<SVGSVGElement>) => void;
    handleTouchStart: (e: React.PointerEvent<SVGSVGElement>) => void;
    handleTouchMove: (e: React.PointerEvent<SVGSVGElement>) => void;
    handleTouchEnd: (e: React.PointerEvent<SVGSVGElement>) => void;
    isPinching: boolean;
  };
  drawingInteraction: InteractionHandlers;
  selectionInteraction: InteractionHandlers;
  onSampleStrokeColor?: (e: React.PointerEvent<SVGSVGElement>) => boolean;
}

const SELECTION_HANDLE_SELECTOR =
  '[data-handle],[data-anchor-index],[data-type="anchor"],[data-type="handleIn"],[data-type="handleOut"]';

const isSelectionHandleTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(target.closest(SELECTION_HANDLE_SELECTOR));
};

/**
 * A simplified coordinator hook that dispatches pointer events to the appropriate
 * interaction hook (useDrawing or useSelection) based on the current tool.
 */
export const usePointerInteraction = ({
  tool,
  viewTransform,
  drawingInteraction,
  selectionInteraction,
  onSampleStrokeColor,
}: PointerInteractionProps) => {

  const { isPanning, setIsPanning } = viewTransform;
  const altPanState = React.useRef<{
    pointerId: number;
    startX: number;
    startY: number;
  } | null>(null);

  // 处理指针按下
  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === 'touch') {
      viewTransform.handleTouchStart(e);
      if (viewTransform.isPinching) return;
    }
    // Middle-mouse-button panning is always available
    if (e.button === 1) {
      e.currentTarget.setPointerCapture(e.pointerId);
      setIsPanning(true);
      return;
    }
    const shouldBypassAltOverride = tool === 'selection' && isSelectionHandleTarget(e.target);

    if (e.altKey && !shouldBypassAltOverride) {
      e.currentTarget.setPointerCapture(e.pointerId);
      if (e.button === 0 && onSampleStrokeColor) {
        altPanState.current = {
          pointerId: e.pointerId,
          startX: e.clientX,
          startY: e.clientY,
        };
      } else {
        setIsPanning(true);
      }
      return;
    }
    if (e.button !== 0) return;

    if (tool === 'selection') {
      selectionInteraction.onPointerDown(e);
    } else {
      drawingInteraction.onPointerDown(e);
    }
  };

  // 处理指针移动
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === 'touch') {
      viewTransform.handleTouchMove(e);
      if (viewTransform.isPinching) return;
    }
    if (altPanState.current && altPanState.current.pointerId === e.pointerId) {
      const { startX, startY } = altPanState.current;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const distanceSq = dx * dx + dy * dy;
      const thresholdSq = 16; // ~4px movement before starting pan

      if (!isPanning) {
        if (distanceSq > thresholdSq) {
          setIsPanning(true);
          viewTransform.handlePanMove(e);
        }
        return;
      }
    }

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

  // 处理指针抬起
  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === 'touch') {
      viewTransform.handleTouchEnd(e);
      if (viewTransform.isPinching) return;
    }
    if (altPanState.current && altPanState.current.pointerId === e.pointerId) {
      if (e.currentTarget && e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }

      if (isPanning) {
        setIsPanning(false);
      } else {
        onSampleStrokeColor?.(e);
      }
      altPanState.current = null;
      return;
    }

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
  
  // 处理指针离开画布
  const onPointerLeave = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === 'touch') {
      viewTransform.handleTouchEnd(e);
      if (viewTransform.isPinching) return;
    }
    if (altPanState.current && altPanState.current.pointerId === e.pointerId) {
      if (e.currentTarget && e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      altPanState.current = null;
      return;
    }

    if (isPanning) {
      if (e.currentTarget && e.currentTarget.hasPointerCapture(e.pointerId)) {
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
