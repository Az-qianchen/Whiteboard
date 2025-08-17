
import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Point, Anchor, AnyPath, VectorPathData, DrawingShape, RectangleData, EllipseData, LivePath } from '../types';
import { dist } from '../lib/geometry';
import { pointsToPathD } from '../lib/path-fitting';

// Define the props the hook will receive
interface DrawingInteractionProps {
  pathState: any; // from usePaths
  toolbarState: any; // from useToolbarState
  viewTransform: any; // from useViewTransform
  isGridVisible: boolean;
  gridSize: number;
}

const MIN_SHAPE_SIZE = 5; // The minimum size for a shape to be kept
const HIT_RADIUS = 10; // Click radius for closing a path or finishing a line

/**
 * Custom hook to manage all pointer interactions related to DRAWING tools.
 */
export const useDrawing = ({
  pathState,
  toolbarState,
  viewTransform,
  isGridVisible,
  gridSize,
}: DrawingInteractionProps) => {
  const [previewD, setPreviewD] = useState<string | null>(null);
  const [drawingShape, setDrawingShape] = useState<DrawingShape | null>(null);
  
  const isDrawingBrush = useRef(false);
  const isDraggingNewPenHandle = useRef(false);
  const shapeStartPoint = useRef<Point | null>(null);

  const { getPointerPosition, viewTransform: vt } = viewTransform;
  const {
    setCurrentBrushPath, currentBrushPath, currentPenPath, setCurrentPenPath, currentLinePath, setCurrentLinePath,
    setPaths, setSelectedPathIds, finishBrushPath, handleFinishPenPath, handleCancelPenPath,
    handleFinishLinePath, handleCancelLinePath, beginCoalescing, endCoalescing,
  } = pathState;
  const { tool, color, strokeWidth, opacity, roughness, bowing, fillWeight, hachureAngle, hachureGap, curveTightness, curveStepCount, curveFitting, fill, fillStyle, borderRadius, strokeLineDash, preserveVertices, disableMultiStroke, disableMultiStrokeFill, simplification, strokeLineCapStart, strokeLineCapEnd, strokeLineJoin, endpointSize } = toolbarState;

  const snapToGrid = useCallback((point: Point): Point => {
    if (!isGridVisible || tool === 'brush') return point;
    return { x: Math.round(point.x / gridSize) * gridSize, y: Math.round(point.y / gridSize) * gridSize };
  }, [isGridVisible, gridSize, tool]);

  const cancelDrawingShape = useCallback(() => {
    setDrawingShape(null);
    shapeStartPoint.current = null;
  }, []);

  // Effect to clean up drawing state when the tool changes
  useEffect(() => {
    if (tool !== 'rectangle' && tool !== 'ellipse' && tool !== 'line') cancelDrawingShape();
    if (tool !== 'line' && currentLinePath) handleCancelLinePath();
  }, [tool, cancelDrawingShape, currentLinePath, handleCancelLinePath]);

  // --- Pointer Down Logic ---

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const point = getPointerPosition(e, e.currentTarget);
    const snappedPoint = snapToGrid(point);
    setPreviewD(null);

    const newShapeId = Date.now().toString();
    const sharedShapeProps = { id: newShapeId, color, strokeWidth, opacity, roughness, bowing, fill, fillStyle, fillWeight, hachureAngle, hachureGap, curveTightness, curveStepCount, curveFitting, strokeLineDash, borderRadius: tool === 'rectangle' ? borderRadius : undefined, preserveVertices, disableMultiStroke, disableMultiStrokeFill, simplification, strokeLineCapStart, strokeLineCapEnd, strokeLineJoin, endpointSize };

    switch (tool) {
      case 'rectangle':
      case 'ellipse':
        shapeStartPoint.current = snappedPoint;
        setDrawingShape({ ...sharedShapeProps, tool, x: snappedPoint.x, y: snappedPoint.y, width: 0, height: 0 } as RectangleData | EllipseData);
        break;
      case 'line':
        if (currentLinePath) {
          const lastAnchor = currentLinePath.anchors[currentLinePath.anchors.length - 1];
          if (dist(snappedPoint, lastAnchor.point) < HIT_RADIUS / vt.scale) {
             handleFinishLinePath();
          } else {
            setCurrentLinePath((prev: VectorPathData) => {
              if (!prev) return prev;
              const newAnchor: Anchor = { point: snappedPoint, handleIn: snappedPoint, handleOut: snappedPoint };
              return { ...prev, anchors: [...prev.anchors, newAnchor] };
            });
          }
        } else {
            shapeStartPoint.current = snappedPoint;
        }
        break;
      case 'brush':
        isDrawingBrush.current = true;
        setCurrentBrushPath({ ...sharedShapeProps, tool: 'brush', points: [point] } as LivePath);
        break;
      case 'pen': {
        // Check if closing path
        if (currentPenPath && currentPenPath.anchors.length > 1 && dist(snappedPoint, currentPenPath.anchors[0].point) < HIT_RADIUS / vt.scale) {
          handleFinishPenPath(true);
          return;
        }
        
        const newAnchor: Anchor = { point: snappedPoint, handleIn: snappedPoint, handleOut: snappedPoint };
        const pathIdToDrag = currentPenPath ? currentPenPath.id : newShapeId;
        
        if (!currentPenPath) {
          setCurrentPenPath({ ...sharedShapeProps, id: pathIdToDrag, tool: 'pen', anchors: [newAnchor], isClosed: false });
        } else {
          setCurrentPenPath((prev: VectorPathData) => ({ ...prev, anchors: [...prev.anchors, newAnchor] }));
        }

        isDraggingNewPenHandle.current = true;
        beginCoalescing();
        break;
      }
    }
  };

  // --- Pointer Move Logic ---

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const movePoint = getPointerPosition(e, e.currentTarget);
    const snappedMovePoint = snapToGrid(movePoint);

    if (tool === 'pen' && isDraggingNewPenHandle.current && currentPenPath) {
      const lastAnchorIndex = currentPenPath.anchors.length - 1;
      if (lastAnchorIndex < 0) return;

      const anchorToUpdate = currentPenPath.anchors[lastAnchorIndex];
      const newHandleOut = snappedMovePoint;

      // Symmetrical handles if shift is not pressed
      let newHandleIn = anchorToUpdate.handleIn;
      if (!e.shiftKey) { 
          const dx = anchorToUpdate.point.x - newHandleOut.x;
          const dy = anchorToUpdate.point.y - newHandleOut.y;
          newHandleIn = { x: anchorToUpdate.point.x + dx, y: anchorToUpdate.point.y + dy };
      }
      
      setCurrentPenPath(prev => {
          if (!prev) return null;
          const newAnchors = [...prev.anchors];
          newAnchors[lastAnchorIndex] = {
              ...newAnchors[lastAnchorIndex],
              handleOut: newHandleOut,
              handleIn: newHandleIn,
          };
          return { ...prev, anchors: newAnchors };
      });
      return; // Prevent preview line from showing while dragging handle
    }

    if (drawingShape && shapeStartPoint.current) {
      if (drawingShape.tool === 'rectangle' || drawingShape.tool === 'ellipse') {
        const start = shapeStartPoint.current;
        let [newWidth, newHeight] = [snappedMovePoint.x - start.x, snappedMovePoint.y - start.y];
        if (e.shiftKey) {
          const size = Math.max(Math.abs(newWidth), Math.abs(newHeight));
          newWidth = size * Math.sign(newWidth);
          newHeight = size * Math.sign(newHeight);
        }
        setDrawingShape(prev => prev ? { ...prev, x: newWidth > 0 ? start.x : start.x + newWidth, y: newHeight > 0 ? start.y : start.y + newHeight, width: Math.abs(newWidth), height: Math.abs(newHeight) } as any : null);
      }
    } else if (tool === 'brush' && isDrawingBrush.current && currentBrushPath) {
        setCurrentBrushPath((prev: LivePath | null) => (prev ? { ...prev, points: [...prev.points, movePoint] } : null));
    } else if (tool === 'pen' && currentPenPath) {
        const lastAnchor = currentPenPath.anchors[currentPenPath.anchors.length - 1];
        setPreviewD(`M ${lastAnchor.point.x},${lastAnchor.point.y} C ${lastAnchor.handleOut.x},${lastAnchor.handleOut.y} ${snappedMovePoint.x},${snappedMovePoint.y} ${snappedMovePoint.x},${snappedMovePoint.y}`);
    } else if (tool === 'line' && currentLinePath) {
        setPreviewD(pointsToPathD([...currentLinePath.anchors.map(a => a.point), snappedMovePoint]));
    } else if (previewD) {
        setPreviewD(null);
    }
  };

  // --- Pointer Up/Leave Logic ---

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (tool === 'pen' && isDraggingNewPenHandle.current) {
        isDraggingNewPenHandle.current = false;
        endCoalescing();
        return;
    }

    if (tool === 'line' && shapeStartPoint.current && !drawingShape) {
        const point = shapeStartPoint.current;
        const newAnchor: Anchor = { point, handleIn: point, handleOut: point };
        const newShapeId = Date.now().toString();
        const sharedProps = { id: newShapeId, color, strokeWidth, opacity, roughness, bowing, fill, fillStyle, fillWeight, hachureAngle, hachureGap, curveTightness, curveStepCount, curveFitting, strokeLineDash, preserveVertices, disableMultiStroke, disableMultiStrokeFill, strokeLineCapStart, strokeLineCapEnd, strokeLineJoin, endpointSize };
        setCurrentLinePath({ ...sharedProps, tool: 'line', anchors: [newAnchor], isClosed: false });
        shapeStartPoint.current = null;
        return;
    }

    if (drawingShape && shapeStartPoint.current) {
        if ( (drawingShape.tool === 'rectangle' && (drawingShape.width > MIN_SHAPE_SIZE || drawingShape.height > MIN_SHAPE_SIZE)) ||
             (drawingShape.tool === 'ellipse' && (drawingShape.width > MIN_SHAPE_SIZE || drawingShape.height > MIN_SHAPE_SIZE)) ) {
            setPaths(prev => [...prev, drawingShape as AnyPath]);
            setSelectedPathIds([drawingShape.id]);
        }
        cancelDrawingShape();
    }

    if (tool === 'brush' && isDrawingBrush.current) {
        isDrawingBrush.current = false;
        finishBrushPath();
    }
    
    setPreviewD(null);
  };
  
  const onPointerLeave = () => {
    if (isDraggingNewPenHandle.current) {
      isDraggingNewPenHandle.current = false;
      endCoalescing();
    }
    if (isDrawingBrush.current) {
      isDrawingBrush.current = false;
      finishBrushPath();
    }
    if (previewD) setPreviewD(null);
    if (drawingShape) cancelDrawingShape();
    shapeStartPoint.current = null;
  };

  return { onPointerDown, onPointerMove, onPointerUp, onPointerLeave, previewD, drawingShape, cancelDrawingShape };
};