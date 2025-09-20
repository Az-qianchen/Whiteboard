/**
 * 本文件定义了一个自定义 Hook (useDrawing)，用于封装所有与绘图工具相关的交互逻辑。
 * 当用户使用画笔、钢笔、矩形等工具时，此 Hook 会处理指针事件来创建和更新图形。
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Point, LivePath, DrawingShape, VectorPathData, Anchor, AnyPath, DrawingArcData, ArcData, TextData, FrameData } from '../types';
import { snapAngle, dist, measureText } from '../lib/drawing';
import { pointsToPathD } from '../lib/path-fitting';
import { calculateArcPathD, getCircleFromThreePoints } from '../lib/drawing/arc';

// Props definition
interface DrawingInteractionProps {
  pathState: any;
  toolbarState: any;
  viewTransform: any;
  isGridVisible: boolean;
  gridSize: number;
  gridSubdivisions: number;
  beginTextEditing: (pathId: string, options?: { select?: boolean; initialText?: string }) => void;
}

/**
 * 自定义钩子，用于管理所有与绘图工具相关的指针交互。
 * @param props - 包含路径状态、工具栏状态、视图变换和网格设置的对象。
 * @returns 处理指针事件的函数和当前正在绘制的图形的状态。
 */
export const useDrawing = ({
  pathState,
  toolbarState,
  viewTransform,
  isGridVisible,
  gridSize,
  gridSubdivisions,
  beginTextEditing,
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
    disableMultiStroke, disableMultiStrokeFill,
    fontSize, textAlign, text, fontFamily,
  } = toolbarState;

  // Effect to clear the preview line when the pen/line path is finalized or cancelled.
  useEffect(() => {
    if (!currentPenPath && !currentLinePath) {
        setPreviewD(null);
    }
  }, [currentPenPath, currentLinePath]);

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

  /**
   * 取消当前正在绘制的图形。
   */
  const cancelDrawingShape = useCallback(() => {
    setDrawingShape(null);
    setPreviewD(null);
  }, []);

  /**
   * 处理指针按下事件，根据当前选择的工具开始一个新的绘图操作。
   * @param e - React 指针事件。
   */
  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
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
      case 'frame': {
        initialPointRef.current = snappedPoint;
        const newShape: FrameData = {
          id,
          tool: 'frame',
          x: snappedPoint.x,
          y: snappedPoint.y,
          width: 0,
          height: 0,
          // Frames have a fixed style, not from the toolbar
          color: '#868e96', 
          fill: 'transparent',
          fillStyle: 'solid',
          strokeWidth: 2,
          isRough: false, 
          roughness: 0, bowing: 0, fillWeight: 0, hachureAngle: 0, hachureGap: 0, curveTightness: 0, curveStepCount: 9,
        };
        setDrawingShape(newShape);
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
      case 'text': {
        const defaultText = text || '文本';
        const { width, height } = measureText(defaultText, fontSize, fontFamily);

        const newText: TextData = {
            id,
            tool: 'text',
            text: defaultText,
            x: snappedPoint.x,
            y: snappedPoint.y,
            width,
            height,
            fontFamily,
            fontSize,
            textAlign,
            ...sharedProps,
            // Text specific overrides
            fill: 'transparent',
            fillStyle: 'solid',
            strokeWidth: 0,
        };
        setPaths((prev: AnyPath[]) => [...prev, newText]);
        toolbarState.setTool('selection');
        beginTextEditing(id, { initialText: defaultText });
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

  /**
   * 处理指针移动事件，根据当前绘图状态更新图形或预览。
   * @param e - React 指针事件。
   */
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
      if (drawingShape.tool === 'rectangle' || drawingShape.tool === 'ellipse' || drawingShape.tool === 'polygon' || drawingShape.tool === 'frame') {
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

  /**
   * 处理指针抬起事件，完成当前的绘图操作。
   * @param e - React 指针事件。
   */
  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.currentTarget && e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
    }
    initialPointRef.current = null;
    if (tool === 'pen' && isDraggingPenHandle) {
        setIsDraggingPenHandle(false);
    }

    if (currentBrushPath) {
      finishBrushPath();
    } else if (drawingShape && drawingShape.tool !== 'arc') {
      let isZeroSize = false;
      if (drawingShape.tool === 'rectangle' || drawingShape.tool === 'ellipse' || drawingShape.tool === 'polygon' || drawingShape.tool === 'frame') {
          isZeroSize = drawingShape.width < 5 || drawingShape.height < 5;
      }

      if (!isZeroSize) {
         setPaths((prev: AnyPath[]) => [...prev, drawingShape as AnyPath]);
      }
      setDrawingShape(null);
    }
  };

  /**
   * 处理指针离开画布事件，通常用于取消或完成进行中的绘图操作。
   * @param e - React 指针事件。
   */
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
