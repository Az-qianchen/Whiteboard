/**
 * 本文件定义了一个指针交互的协调器 Hook (usePointerInteraction)。
 * 它根据当前选择的工具，将画布上的指针事件（如按下、移动、抬起）分发给相应的处理逻辑（例如，绘图或选择）。
 */

import React from 'react';
import type { AnyPath, Point, Tool } from '../types';
import { findDeepestHitPath } from '@/lib/hit-testing';

interface InteractionHandlers {
  onPointerDown: (e: React.PointerEvent<SVGSVGElement>) => void;
  onPointerMove: (e: React.PointerEvent<SVGSVGElement>) => void;
  onPointerUp: (e: React.PointerEvent<SVGSVGElement>) => void | Promise<void>;
  onPointerLeave: (e: React.PointerEvent<SVGSVGElement>) => void;
}

interface PointerInteractionProps {
  tool: Tool;
  viewTransform: {
    viewTransform: { scale: number };
    isPanning: boolean;
    setIsPanning: (v: boolean) => void;
    handlePanMove: (e: React.PointerEvent<SVGSVGElement>) => void;
    handleTouchStart: (e: React.PointerEvent<SVGSVGElement>) => void;
    handleTouchMove: (e: React.PointerEvent<SVGSVGElement>) => void;
    handleTouchEnd: (e: React.PointerEvent<SVGSVGElement>) => void;
    isPinching: boolean;
    getPointerPosition: (e: { clientX: number; clientY: number }, svg: SVGSVGElement) => { x: number; y: number };
  };
  drawingInteraction: InteractionHandlers;
  selectionInteraction: InteractionHandlers;
  textInteraction: InteractionHandlers;
  paths: AnyPath[];
  setStrokeColor: (color: string) => void;
  setFillColor: (color: string) => void;
  backgroundColor: string;
  sampleImageColorAtPoint: (point: Point, path: AnyPath) => Promise<string | null>;
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
  textInteraction,
  paths,
  setStrokeColor,
  setFillColor,
  backgroundColor,
  sampleImageColorAtPoint,
}: PointerInteractionProps) => {

  const { isPanning, setIsPanning } = viewTransform;

  // 处理指针按下
  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === 'touch') {
      viewTransform.handleTouchStart(e);
      if (viewTransform.isPinching) return;
    }
    if (e.altKey) {
      const isShiftSampling = e.shiftKey;
      const svg = e.currentTarget;
      const point = viewTransform.getPointerPosition(
        { clientX: e.clientX, clientY: e.clientY },
        svg
      );
      const scale = viewTransform.viewTransform.scale || 1;
      const hitPath = findDeepestHitPath(point, paths, scale);

      if (hitPath?.tool === 'image') {
        void sampleImageColorAtPoint(point, hitPath).then(sampledColor => {
          if (!sampledColor) return;
          if (isShiftSampling) {
            setFillColor(sampledColor);
          } else {
            setStrokeColor(sampledColor);
          }
        });
        return;
      }

      const resolveFillColor = (path: AnyPath | null): string | null => {
        if (!path) {
          return backgroundColor;
        }
        if (path.fillGradient && path.fillGradient.stops?.length) {
          return path.fillGradient.stops[0]?.color ?? null;
        }
        const rawFill = path.fill ?? '';
        if (rawFill.trim() && rawFill.toLowerCase() !== 'none') {
          return rawFill;
        }
        return path.color ?? null;
      };

      const resolveStrokeColor = (path: AnyPath | null): string | null => {
        if (!path) {
          return backgroundColor;
        }
        return path.color ?? null;
      };

      const sampledColor = isShiftSampling
        ? resolveFillColor(hitPath)
        : resolveStrokeColor(hitPath);

      if (sampledColor) {
        if (isShiftSampling) {
          setFillColor(sampledColor);
        } else {
          setStrokeColor(sampledColor);
        }
      }
      return;
    }
    // Middle-mouse-button panning is always available
    if (e.button === 1) {
      e.currentTarget.setPointerCapture(e.pointerId);
      setIsPanning(true);
      return;
    }
    if (e.button !== 0) return;

    if (tool === 'selection') {
      selectionInteraction.onPointerDown(e);
      return;
    }

    if (tool === 'text') {
      textInteraction.onPointerDown(e);
      return;
    }

    drawingInteraction.onPointerDown(e);
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
      return;
    }

    if (tool === 'text') {
      textInteraction.onPointerMove(e);
      return;
    }

    drawingInteraction.onPointerMove(e);
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
      return;
    }

    if (tool === 'text') {
      textInteraction.onPointerUp(e);
      return;
    }

    drawingInteraction.onPointerUp(e);
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
      return;
    }

    if (tool === 'text') {
      textInteraction.onPointerLeave(e);
      return;
    }

    drawingInteraction.onPointerLeave(e);
  };

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerLeave,
  };
};
