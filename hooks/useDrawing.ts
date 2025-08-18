/**
 * 本文件定义了一个自定义 Hook (useDrawing)，用于封装所有与绘图工具相关的交互逻辑。
 * 当用户使用画笔、钢笔、矩形等工具时，此 Hook 会处理指针事件来创建和更新图形。
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Point, LivePath, DrawingShape, VectorPathData, Anchor, AnyPath, DrawingArcData, ArcData } from '../types';
import { snapAngle, dist } from '../lib/drawing';
import { pointsToPathD } from '../lib/path-fitting';
import { calculateArcPathD, getCircleFromThreePoints } from '../lib/drawing/arc';

// Props definition
interface DrawingInteractionProps {
  pathState: any;
  toolbarState: any;
  viewTransform: any;
  isGridVisible: boolean;
  gridSize: number;
}

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
  const [drawingShape, setDrawingShape] = useState<DrawingShape | null>(null);
  const [previewD, setPreviewD] = useState<string | null>(null);
  const [isDraggingPenHandle, setIsDraggingPenHandle] = useState(false);
  const isDrawingShape = !!drawingShape;
  const initialPointRef = useRef<Point | null>(null);

  const {
    setCurrentBrushPath, currentBrushPath, finishBrushPath,
    setCurrentPenPath, currentPenPath,
    setCurrentLinePath, currentLinePath,
    setPaths,
  } = pathState;

  const { getPointerPosition } = viewTransform;

  const {
    tool, color, fill, fillStyle, strokeWidth, opacity, borderRadius, sides,
    strokeLineDash, strokeLineCapStart, strokeLineCapEnd, strokeLineJoin,
    endpointSize, endpointFill,
    isRough, roughness, bowing, fillWeight, hachureAngle, hachureGap,
    curveTightness, curveStepCount, preserveVertices,
    disableMultiStroke, disableMultiStrokeFill
  } = toolbarState;

  // Effect to clear the preview line when the pen/line path is finalized or cancelled.
  useEffect(() => {
    if (!currentPenPath && !currentLinePath) {
        setPreviewD(null);
    }
  }, [currentPenPath, currentLinePath]);

  const snapToGrid = useCallback((point: Point): Point => {
    if (!isGridVisible) return point;
    return {
      x: Math.round(point.x / gridSize) * gridSize,
      y: Math.round(point.y / gridSize) * gridSize,
    };
  }, [isGridVisible, gridSize]);

  const cancelDrawingShape = useCallback(() => {
    setDrawingShape(null);
    setPreviewD(null);
  }, []);

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const point = getPointerPosition(e, e.currentTarget);
    const snappedPoint = snapToGrid(point);
    const id = Date.now().toString();

    const sharedProps = {
        color, fill, fillStyle, strokeWidth, opacity, strokeLineDash,
        strokeLineCapStart, strokeLineCapEnd, strokeLineJoin,
        endpointSize, endpointFill,
        isRough, roughness, bowing, fillWeight, hachureAngle, hachureGap,
        curveTightness, curveStepCount, preserveVertices,
        disableMultiStroke, disableMultiStrokeFill,
    };

    switch (tool) {
      case 'brush': {
        const newPath: LivePath = {
          id,
          tool: 'brush',
          points: [point],
          ...sharedProps,
        };
        setCurrentBrushPath(newPath);
        break;
      }
      case 'rectangle':
      case 'polygon':
      case 'ellipse': {
        initialPointRef.current = snappedPoint;
        const newShape: DrawingShape = {
          id,
          tool,
          x: snappedPoint.x,
          y: snappedPoint.y,
          width: 0,
          height: 0,
          borderRadius: (tool === 'rectangle' || tool === 'polygon') ? borderRadius ?? 0 : undefined,
          sides: tool === 'polygon' ? sides ?? 6 : undefined,
          ...sharedProps,
        };
        setDrawingShape(newShape);
        break;
      }
      case 'arc': {
        if (drawingShape && drawingShape.tool === 'arc') {
            const currentArc = drawingShape as DrawingArcData;
            if (currentArc.points.length === 1) {
                // Second click: finalize the end point
                setDrawingShape({ ...currentArc, points: [...currentArc.points, snappedPoint] });
                setPreviewD(null); // clear the line preview
            } else if (currentArc.points.length === 2) {
                // Third click: finalize the arc
                // Check for collinearity before creating the final shape.
                const circle = getCircleFromThreePoints(currentArc.points[0], currentArc.points[1], snappedPoint);
                if (!circle) {
                    setDrawingShape(null); // Cancel drawing if points are collinear
                    setPreviewD(null);
                    return;
                }

                const finalArc: ArcData = {
                    ...(currentArc as Omit<DrawingArcData, 'points'>),
                    tool: 'arc',
                    points: [currentArc.points[0], currentArc.points[1], snappedPoint],
                };
                setPaths((prev: AnyPath[]) => [...prev, finalArc]);
                setDrawingShape(null);
                setPreviewD(null);
            }
        } else {
            // First click: start the arc
            const newArc: DrawingArcData = {
                id,
                tool: 'arc',
                points: [snappedPoint],
                ...sharedProps,
            };
            setDrawingShape(newArc);
        }
        break;
      }
      case 'line': {
        const newAnchor: Anchor = { point: snappedPoint, handleIn: snappedPoint, handleOut: snappedPoint };
        if (currentLinePath) {
          setCurrentLinePath((prev: VectorPathData) => ({
            ...prev,
            anchors: [...prev.anchors, newAnchor],
          }));
        } else {
          const newPath: VectorPathData = {
            id,
            tool,
            anchors: [newAnchor],
            ...sharedProps,
          };
          setCurrentLinePath(newPath);
        }
        break;
      }
      case 'pen': {
        setIsDraggingPenHandle(true); // Start dragging handle immediately
        const newAnchor: Anchor = { point: snappedPoint, handleIn: snappedPoint, handleOut: snappedPoint };
        
        if (currentPenPath) {
          setCurrentPenPath((prev: VectorPathData) => ({
            ...prev,
            anchors: [...prev.anchors, newAnchor],
          }));
        } else {
          const newPath: VectorPathData = {
            id,
            tool,
            anchors: [newAnchor],
            ...sharedProps,
          };
          setCurrentPenPath(newPath);
        }
        break;
      }
    }
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const point = getPointerPosition(e, e.currentTarget);
    const snappedPoint = snapToGrid(point);

    if (tool === 'pen' && isDraggingPenHandle) {
        if (currentPenPath) {
            setPreviewD(null);
            setCurrentPenPath((prev: VectorPathData | null) => {
                if (!prev || prev.anchors.length === 0) return prev;
                const updatedAnchors = [...prev.anchors];
                const lastAnchorIndex = updatedAnchors.length - 1;
                const lastAnchor = { ...updatedAnchors[lastAnchorIndex] };

                const dx = point.x - lastAnchor.point.x;
                const dy = point.y - lastAnchor.point.y;
                
                lastAnchor.handleOut = { x: lastAnchor.point.x + dx, y: lastAnchor.point.y + dy };
                lastAnchor.handleIn = { x: lastAnchor.point.x - dx, y: lastAnchor.point.y - dy };
                
                updatedAnchors[lastAnchorIndex] = lastAnchor;
                return { ...prev, anchors: updatedAnchors };
            });
        }
    } else if (currentBrushPath) {
      setCurrentBrushPath({
        ...currentBrushPath,
        points: [...currentBrushPath.points, point],
      });
    } else if (drawingShape) {
      if (drawingShape.tool === 'rectangle' || drawingShape.tool === 'ellipse' || drawingShape.tool === 'polygon') {
        if (!initialPointRef.current) return;
        const startPoint = initialPointRef.current;

        let width = snappedPoint.x - startPoint.x;
        let height = snappedPoint.y - startPoint.y;

        if (e.shiftKey) {
            const side = Math.max(Math.abs(width), Math.abs(height));
            width = side * (width < 0 ? -1 : 1);
            height = side * (height < 0 ? -1 : 1);
        }

        let newX = startPoint.x;
        let newY = startPoint.y;

        if (width < 0) {
            newX = startPoint.x + width;
            width = -width;
        }
        if (height < 0) {
            newY = startPoint.y + height;
            height = -height;
        }

        setDrawingShape({
          ...drawingShape,
          x: newX,
          y: newY,
          width,
          height,
        });
      } else if (drawingShape.tool === 'arc') {
          const arcData = drawingShape as DrawingArcData;
          if (arcData.points.length === 1) {
              const d = `M ${arcData.points[0].x} ${arcData.points[0].y} L ${point.x} ${point.y}`;
              setPreviewD(d);
          } else if (arcData.points.length === 2) {
              const d = calculateArcPathD(arcData.points[0], arcData.points[1], point);
              setPreviewD(d);
          }
      }
    } else if (currentPenPath) {
        if (currentPenPath.anchors.length > 0) {
            const lastAnchor = currentPenPath.anchors[currentPenPath.anchors.length - 1];
            let endPoint = snappedPoint;

            const isDrawingStraightSegment = lastAnchor.handleOut.x === lastAnchor.point.x && lastAnchor.handleOut.y === lastAnchor.point.y;
            if (e.shiftKey && isDrawingStraightSegment) {
                endPoint = snapAngle(snappedPoint, lastAnchor.point);
            }
            
            // Use a Quadratic Bezier for a stable curve preview.
            // M = move to, Q = quadratic curve to end point with one control point.
            // This correctly shows a smooth curve from the last anchor, controlled by its handleOut, towards the cursor.
            const previewD = `M ${lastAnchor.point.x},${lastAnchor.point.y} Q ${lastAnchor.handleOut.x},${lastAnchor.handleOut.y} ${endPoint.x},${endPoint.y}`;
            setPreviewD(previewD);
        }
    } else if (currentLinePath) {
        if (currentLinePath.anchors.length > 0) {
            const lastAnchor = currentLinePath.anchors[currentLinePath.anchors.length - 1];
            let endPoint = snappedPoint;
            if (e.shiftKey) {
                endPoint = snapAngle(snappedPoint, lastAnchor.point);
            }
            
            // To create a curved preview, we need all points in the current path plus the new endpoint.
            const previewPoints = currentLinePath.anchors.map(a => a.point);
            previewPoints.push(endPoint);

            // Generate a smoothed curve through these points for the preview.
            const previewD = pointsToPathD(previewPoints, curveTightness);
            setPreviewD(previewD);
        }
    }
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    initialPointRef.current = null;
    if (tool === 'pen' && isDraggingPenHandle) {
        setIsDraggingPenHandle(false);
    }

    if (currentBrushPath) {
      finishBrushPath();
    } else if (drawingShape && drawingShape.tool !== 'arc') {
      let isZeroSize = false;
      if (drawingShape.tool === 'rectangle' || drawingShape.tool === 'ellipse' || drawingShape.tool === 'polygon') {
          isZeroSize = drawingShape.width < 1 || drawingShape.height < 1;
      }

      if (!isZeroSize) {
         setPaths((prev: AnyPath[]) => [...prev, drawingShape as AnyPath]);
      }
      setDrawingShape(null);
    }
  };

  const onPointerLeave = (e: React.PointerEvent<SVGSVGElement>) => {
    // If the mouse leaves while drawing, we treat it like a pointer up to finalize the shape.
    if (currentBrushPath || (isDrawingShape && drawingShape.tool !== 'arc')) {
      onPointerUp(e);
    }
    if (isDraggingPenHandle) {
        setIsDraggingPenHandle(false);
    }
    if (previewD) {
      setPreviewD(null);
    }
  };

  return { onPointerDown, onPointerMove, onPointerUp, onPointerLeave, drawingShape, cancelDrawingShape, previewD };
};