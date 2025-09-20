/**
 * 本文件定义了一个指针交互的协调器 Hook (usePointerInteraction)。
 * 它根据当前选择的工具，将画布上的指针事件（如按下、移动、抬起）分发给相应的处理逻辑（例如，绘图或选择）。
 */

import React from 'react';
import type { Point, Tool } from '../types';

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
    getPointerPosition: (e: { clientX: number; clientY: number }, svg: SVGSVGElement) => Point;
  };
  drawingInteraction: InteractionHandlers;
  selectionInteraction: InteractionHandlers;
  sampleStrokeColor?: (point: Point) => boolean;
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
  sampleStrokeColor,
}: PointerInteractionProps) => {

  const { isPanning, setIsPanning } = viewTransform;

  // 处理指针按下
  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (
      e.pointerType !== 'touch' &&
      e.button === 0 &&
      e.altKey &&
      tool !== 'selection' &&
      sampleStrokeColor
    ) {
      const point = viewTransform.getPointerPosition(e, e.currentTarget);
      if (sampleStrokeColor(point)) {
        return;
      }
    }

    if (e.pointerType === 'touch') {
      viewTransform.handleTouchStart(e);
      if (viewTransform.isPinching) return;
    }
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

  // 处理指针移动
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === 'touch') {
      viewTransform.handleTouchMove(e);
      if (viewTransform.isPinching) return;
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
