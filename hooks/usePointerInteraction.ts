

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Point, DragState, Anchor, AnyPath, VectorPathData, BrushPathData, DrawingShape, RectangleData, EllipseData, ResizeHandlePosition, LivePath } from '../types';
import { dist, updatePathAnchors, insertAnchorOnCurve, movePath, getSqDistToSegment } from '../lib/utils';
import { getPathBoundingBox, doBboxesIntersect, getMarqueeRect, resizePath } from '../lib/geometry';
import { isPointHittingPath } from '../lib/hit-testing';
import { sampleCubicBezier, anchorsToPathD, pointsToPathD } from '../lib/path-fitting';

// 定义钩子接收的属性
interface PointerInteractionProps {
  pathState: any; // 从 usePaths 返回的状态和设置器
  toolbarState: any; // 从 useToolbarState 返回的状态和设置器
  viewTransform: any; // 从 useViewTransform 返回的状态和设置器
  getPointerPosition: (e: { clientX: number; clientY: number }, svg: SVGSVGElement) => Point;
  isGridVisible: boolean;
  gridSize: number;
}

const HIT_RADIUS = 10; // 用于选中锚点或控制柄的点击半径
const MIN_SHAPE_SIZE = 5; // 最终形状的最小尺寸
const DRAG_THRESHOLD = 4; // 区分点击和拖动的像素阈值

/**
 * 自定义钩子，管理所有与指针相关的交互。
 * 包括绘图、编辑、选择和画布平移。
 */
export const usePointerInteraction = ({
  pathState,
  toolbarState,
  viewTransform,
  getPointerPosition,
  isGridVisible,
  gridSize,
}: PointerInteractionProps) => {
  const [dragState, setDragState] = useState<DragState>(null);
  const [marquee, setMarquee] = useState<{ start: Point; end: Point } | null>(null);
  const [previewD, setPreviewD] = useState<string | null>(null);
  const [drawingShape, setDrawingShape] = useState<DrawingShape | null>(null);
  const isDrawingBrush = useRef(false);
  const shapeStartPoint = useRef<Point | null>(null);
  const { setIsPanning, isPanning } = viewTransform;

  const isClosingPath = useRef<{ pathId: string; anchorIndex: number } | null>(null);

  const {
    paths,
    setPaths,
    currentBrushPath,
    setCurrentBrushPath,
    currentPenPath,
    currentLinePath,
    setCurrentPenPath,
    setCurrentLinePath,
    selectedPathIds,
    setSelectedPathIds,
    finishBrushPath,
    handleFinishPenPath,
    handleCancelPenPath,
    handleFinishLinePath,
    handleCancelLinePath,
    beginCoalescing,
    endCoalescing,
  } = pathState;

  const { tool, color, strokeWidth, roughness, bowing, fillWeight, hachureAngle, hachureGap, curveTightness, curveStepCount, fill, fillStyle } = toolbarState;

  const snapToGrid = useCallback((point: Point): Point => {
    if (!isGridVisible || tool === 'brush') return point;
    return {
      x: Math.round(point.x / gridSize) * gridSize,
      y: Math.round(point.y / gridSize) * gridSize,
    };
  }, [isGridVisible, gridSize, tool]);

  const cancelDrawingShape = useCallback(() => {
    setDrawingShape(null);
    shapeStartPoint.current = null;
  }, []);
  
  const dragStartDetails = useRef<{
    pathIds: string[];
    initialPointerPos: Point;
  } | null>(null);


  useEffect(() => {
    if (tool !== 'rectangle' && tool !== 'ellipse' && tool !== 'line') {
      cancelDrawingShape();
    }
    if (tool !== 'line' && currentLinePath) {
        handleCancelLinePath();
    }
  }, [tool, cancelDrawingShape, currentLinePath, handleCancelLinePath]);

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    // 处理右键点击：完成钢笔路径并始终阻止上下文菜单
    if (e.button === 2) {
      e.preventDefault(); // 总是阻止画布上的默认上下文菜单
      if (tool === 'pen' && currentPenPath) {
        handleFinishPenPath();
      } else if (tool === 'line' && currentLinePath) {
        handleFinishLinePath();
      }
      return;
    }

    if (e.button === 1) {
      setIsPanning(true);
      return;
    }

    if (e.button !== 0) {
      return;
    }

    if (e.altKey && !dragState && tool !== 'edit') {
      setIsPanning(true);
      return;
    }
    
    const point = getPointerPosition(e, e.currentTarget);
    const snappedPoint = snapToGrid(point);
    setPreviewD(null);

    const newShapeId = Date.now().toString();
    const sharedShapeProps = { id: newShapeId, color, strokeWidth, roughness, bowing, fill, fillStyle, fillWeight, hachureAngle, hachureGap, curveTightness, curveStepCount };

    switch (tool) {
      case 'rectangle':
      case 'ellipse':
        shapeStartPoint.current = snappedPoint;
        setDrawingShape({ ...sharedShapeProps, tool, x: snappedPoint.x, y: snappedPoint.y, width: 0, height: 0 } as RectangleData | EllipseData);
        break;
      case 'line':
        if (currentLinePath) {
          const lastAnchor = currentLinePath.anchors[currentLinePath.anchors.length - 1];
          // Double click on last point to finish
          if (dist(snappedPoint, lastAnchor.point) < HIT_RADIUS / viewTransform.viewTransform.scale) {
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
        const createCorner = e.shiftKey;
        if (currentPenPath && currentPenPath.anchors.length > 1 && dist(snappedPoint, currentPenPath.anchors[0].point) < HIT_RADIUS / viewTransform.viewTransform.scale) {
          handleFinishPenPath(true);
          return;
        }

        const newAnchor: Anchor = { point: snappedPoint, handleIn: snappedPoint, handleOut: snappedPoint };
        const newPathId = currentPenPath ? currentPenPath.id : Date.now().toString();
        
        if (!currentPenPath) {
          setCurrentPenPath({ ...sharedShapeProps, id: newPathId, tool: 'pen', anchors: [newAnchor], isClosed: false });
        } else {
          setCurrentPenPath((prev: VectorPathData) => ({ ...prev, anchors: [...prev.anchors, newAnchor] }));
        }
        
        if (!createCorner) {
          beginCoalescing();
          setDragState({ type: 'handleOut', pathId: newPathId, anchorIndex: currentPenPath ? currentPenPath.anchors.length : 0 });
        }
        break;
      }

      case 'edit': {
        const targetElement = e.target as SVGElement;
        const type = targetElement.dataset.type as 'anchor' | 'handleIn' | 'handleOut' | undefined;
        const pathId = targetElement.dataset.pathId;
        const anchorIndexStr = targetElement.dataset.anchorIndex;

        // Priority 1: Anchor / Handle editing (including deletion)
        if (type && pathId && anchorIndexStr && (type === 'anchor' || type === 'handleIn' || type === 'handleOut')) {
            const anchorIndex = parseInt(anchorIndexStr, 10);
            
            // ALT-CLICK TO DELETE NODE
            if (e.altKey && type === 'anchor') {
                setPaths((prevPaths: AnyPath[]) =>
                    prevPaths.map(p => {
                        if (p.id === pathId && 'anchors' in p && p.anchors) {
                            if (p.anchors.length <= 1) return undefined;
                            const newAnchors = [...p.anchors];
                            newAnchors.splice(anchorIndex, 1);
                            if (newAnchors.length === 0) return undefined;
                            return { ...p, anchors: newAnchors };
                        }
                        return p;
                    }).filter(Boolean) as AnyPath[]
                );

                const path = paths.find(p => p.id === pathId);
                if (path && 'anchors' in path && path.anchors && path.anchors.length <= 1) {
                    setSelectedPathIds(ids => ids.filter(id => id !== pathId));
                }
                return; // Deletion handled
            }

            // Normal drag start - DEFENSIVE CHECK
            const path = paths.find(p => p.id === pathId);
            if (path && 'anchors' in path && path.anchors && anchorIndex < path.anchors.length) {
              beginCoalescing();
              setDragState({ type, pathId, anchorIndex });
            }
            return; // Interaction handled
        }
        
        // Priority 1.5: Add a node to a selected path (CTRL-CLICK)
        const singleSelectedPath = selectedPathIds.length === 1 ? paths.find(p => p.id === selectedPathIds[0]) : null;
        if (e.ctrlKey && singleSelectedPath && ('anchors' in singleSelectedPath) && singleSelectedPath.anchors && singleSelectedPath.anchors.length >= 2) {
            const path = singleSelectedPath as VectorPathData | BrushPathData;
            const threshold = (10 / viewTransform.viewTransform.scale);
            const thresholdSq = threshold * threshold;

            let closest = null;
            let minDistanceSq = Infinity;

            for (let i = 0; i < path.anchors.length - 1; i++) {
                const startAnchor = path.anchors[i];
                const endAnchor = path.anchors[i+1];
                const segmentPoints = sampleCubicBezier(startAnchor.point, startAnchor.handleOut, endAnchor.handleIn, endAnchor.point, 20);

                for (let j = 0; j < segmentPoints.length - 1; j++) {
                    const p1 = segmentPoints[j];
                    const p2 = segmentPoints[j+1];
                    const { distSq, t: segmentT } = getSqDistToSegment(point, p1, p2);

                    if (distSq < minDistanceSq) {
                        minDistanceSq = distSq;
                        const overallT = (j + segmentT) / (segmentPoints.length - 1);
                        closest = { index: i, t: overallT };
                    }
                }
            }

            if (closest && minDistanceSq < thresholdSq) {
                const { index, t } = closest;
                const startAnchor = path.anchors[index];
                const endAnchor = path.anchors[index + 1];

                const newAnchor = insertAnchorOnCurve(startAnchor, endAnchor, t);

                const newAnchors = [...path.anchors];
                newAnchors.splice(index + 1, 0, newAnchor);
                
                setPaths((prevPaths: AnyPath[]) => prevPaths.map(p => p.id === path.id ? { ...p, anchors: newAnchors } : p));
                return; // Node added, interaction handled.
            }
        }
        
        // Priority 2: Check for resize handle interaction
        const handle = targetElement.dataset.handle as ResizeHandlePosition | undefined;
        if (handle && singleSelectedPath) {
            beginCoalescing();
            setDragState({ type: 'resize', pathId: singleSelectedPath.id, handle, originalPath: singleSelectedPath as RectangleData | EllipseData | BrushPathData, initialPointerPos: point });
            return;
        }
        
        // Priority 3: Check for move interaction (or click-to-select)
        dragStartDetails.current = { initialPointerPos: point, pathIds: selectedPathIds };
        
        // Priority 4: Fallback to marquee if clicked on empty space
        setMarquee({ start: point, end: point });
        break;
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (isPanning) {
      viewTransform.handlePanMove(e);
      return;
    }

    const movePoint = getPointerPosition(e, e.currentTarget);
    const snappedMovePoint = snapToGrid(movePoint);

    if (tool === 'line' && shapeStartPoint.current && !currentLinePath && !drawingShape) {
        if (dist(snappedMovePoint, shapeStartPoint.current) > DRAG_THRESHOLD) {
            const start = shapeStartPoint.current; // Already snapped
            const startAnchor: Anchor = { point: start, handleIn: start, handleOut: start };
            const endAnchor: Anchor = { point: snappedMovePoint, handleIn: snappedMovePoint, handleOut: snappedMovePoint };

            const newShapeId = Date.now().toString();
            const sharedShapeProps = { id: newShapeId, color, strokeWidth, roughness, bowing, fill, fillStyle, fillWeight, hachureAngle, hachureGap, curveTightness, curveStepCount };
            const linePath: VectorPathData = { ...sharedShapeProps, tool: 'line', anchors: [startAnchor, endAnchor], isClosed: false };
            setDrawingShape(linePath);
        }
    }

    if (dragStartDetails.current && dist(movePoint, dragStartDetails.current.initialPointerPos) > 3) {
      const selectedPaths = paths.filter(p => dragStartDetails.current!.pathIds.includes(p.id));
      const clickedOnSelected = selectedPaths.some(p => isPointHittingPath(dragStartDetails.current!.initialPointerPos, p, viewTransform.viewTransform.scale));

      if (clickedOnSelected) {
        beginCoalescing();
        const originalPaths = paths.filter(p => dragStartDetails.current!.pathIds.includes(p.id));
        setDragState({
            type: 'move',
            pathIds: dragStartDetails.current.pathIds,
            originalPaths: originalPaths,
            initialPointerPos: dragStartDetails.current.initialPointerPos
        });
      }
      dragStartDetails.current = null;
    }
    
    if (dragState) {
        let finalMovePoint = snappedMovePoint;

        if (dragState.type === 'anchor') {
            isClosingPath.current = null; // Reset
            const path = paths.find(p => p.id === dragState.pathId);

            if (path && 'anchors' in path && path.tool !== 'line' && !path.isClosed && path.anchors.length > 2 && (dragState.anchorIndex === 0 || dragState.anchorIndex === path.anchors.length - 1)) {
                const otherEndpointIndex = dragState.anchorIndex === 0 ? path.anchors.length - 1 : 0;
                const otherEndpoint = path.anchors[otherEndpointIndex];
                if (dist(snappedMovePoint, otherEndpoint.point) < HIT_RADIUS / viewTransform.viewTransform.scale) {
                    finalMovePoint = otherEndpoint.point; // Snap point
                    isClosingPath.current = { pathId: path.id, anchorIndex: dragState.anchorIndex };
                }
            }
        }
        
        beginCoalescing();
        switch (dragState.type) {
            case 'move': {
                const dx = movePoint.x - dragState.initialPointerPos.x;
                const dy = movePoint.y - dragState.initialPointerPos.y;
                
                setPaths((prevPaths: AnyPath[]) => {
                    const movedPathMap = new Map<string, AnyPath>();
                    for (const originalPath of dragState.originalPaths) {
                        movedPathMap.set(originalPath.id, movePath(originalPath, dx, dy));
                    }
                    return prevPaths.map(p => movedPathMap.get(p.id) || p);
                });
                break;
            }
            case 'resize': {
                setPaths((prevPaths: AnyPath[]) =>
                    prevPaths.map(p =>
                        p.id === dragState.pathId
                            ? resizePath(dragState.originalPath, dragState.handle, snappedMovePoint, dragState.initialPointerPos, e.shiftKey)
                            : p
                    )
                );
                break;
            }
            case 'anchor':
            case 'handleIn':
            case 'handleOut': {
              const updatePoint = dragState.type === 'anchor' ? finalMovePoint : snappedMovePoint;              
              if (currentPenPath && currentPenPath.id === dragState.pathId) {
                setCurrentPenPath(updatePathAnchors(currentPenPath, dragState, updatePoint, e.shiftKey));
              } else {
                setPaths((prevPaths: AnyPath[]) => prevPaths.map(p => {
                    if (p.id === dragState.pathId && 'anchors' in p) {
                      return updatePathAnchors(p as VectorPathData | BrushPathData, dragState, updatePoint, e.shiftKey) as AnyPath;
                    }
                    return p;
                  }
                ));
              }
              break;
            }
        }
    }


    if (drawingShape) {
      if (drawingShape.tool === 'line') {
        setDrawingShape(prev => {
          if (prev?.tool !== 'line') return prev;

          const newAnchors = [...prev.anchors];
          let endPoint = snappedMovePoint;
          if (e.shiftKey && shapeStartPoint.current) {
            const start = shapeStartPoint.current;
            const dx = endPoint.x - start.x;
            const dy = endPoint.y - start.y;
            const angle = Math.atan2(dy, dx);
            const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
            const distance = Math.sqrt(dx * dx + dy * dy);
            endPoint = {
              x: start.x + distance * Math.cos(snappedAngle),
              y: start.y + distance * Math.sin(snappedAngle)
            };
          }
          const endAnchor: Anchor = { point: endPoint, handleIn: endPoint, handleOut: endPoint };
          newAnchors[1] = endAnchor;
          return { ...prev, anchors: newAnchors };
        });
      } else { // Rectangle and Ellipse
        setDrawingShape(prev => {
          if (!prev || !('x' in prev) || !shapeStartPoint.current) return prev;
          
          const start = shapeStartPoint.current;
          let end = snappedMovePoint;
  
          let newWidth = end.x - start.x;
          let newHeight = end.y - start.y;
          
          if (e.shiftKey) {
              const size = Math.max(Math.abs(newWidth), Math.abs(newHeight));
              newWidth = size * Math.sign(newWidth);
              newHeight = size * Math.sign(newHeight);
          }
  
          return {
              ...prev,
              x: newWidth > 0 ? start.x : start.x + newWidth,
              y: newHeight > 0 ? start.y : start.y + newHeight,
              width: Math.abs(newWidth),
              height: Math.abs(newHeight),
          };
        });
      }
    } else if (tool === 'pen' && currentPenPath && !dragState) {
      const lastAnchor = currentPenPath.anchors[currentPenPath.anchors.length - 1];
      const d = `M ${lastAnchor.point.x},${lastAnchor.point.y} C ${lastAnchor.handleOut.x},${lastAnchor.handleOut.y} ${snappedMovePoint.x},${snappedMovePoint.y} ${snappedMovePoint.x},${snappedMovePoint.y}`;
      setPreviewD(d);
    } else if (tool === 'line' && currentLinePath && !dragState) {
        const points = [...currentLinePath.anchors.map(a => a.point), snappedMovePoint];
        const d = pointsToPathD(points);
        setPreviewD(d);
    } else if (previewD) {
      setPreviewD(null);
    }

    if (tool === 'brush') {
      if (!isDrawingBrush.current || !currentBrushPath) return;
      setCurrentBrushPath((prev: LivePath | null) => (prev ? { ...prev, points: [...prev.points, movePoint] } : null));
    } else if (marquee && !dragState) {
        setMarquee(m => m ? { ...m, end: movePoint } : null);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    dragStartDetails.current = null;

    if (isPanning) {
      setIsPanning(false);
      return;
    }
    
    // Case 1: A click with the line tool (no drag happened) -> Start a polyline
    if (tool === 'line' && shapeStartPoint.current && !drawingShape) {
        const point = shapeStartPoint.current; // Already snapped
        const newAnchor: Anchor = { point, handleIn: point, handleOut: point };
        const newShapeId = Date.now().toString();
        const sharedShapeProps = { id: newShapeId, color, strokeWidth, roughness, bowing, fill, fillStyle, fillWeight, hachureAngle, hachureGap, curveTightness, curveStepCount };
        const newPath: VectorPathData = { ...sharedShapeProps, tool: 'line', anchors: [newAnchor], isClosed: false };
        setCurrentLinePath(newPath);
        shapeStartPoint.current = null;
        return;
    }

    // Case 2: A shape was being drawn (drag operation)
    if (drawingShape && shapeStartPoint.current) {
        if (
            (drawingShape.tool === 'rectangle' && ((drawingShape as RectangleData).width > MIN_SHAPE_SIZE || (drawingShape as RectangleData).height > MIN_SHAPE_SIZE)) ||
            (drawingShape.tool === 'ellipse' && ((drawingShape as EllipseData).width > MIN_SHAPE_SIZE || (drawingShape as EllipseData).height > MIN_SHAPE_SIZE)) ||
            (drawingShape.tool === 'line' && dist(drawingShape.anchors[0].point, drawingShape.anchors[1].point) > MIN_SHAPE_SIZE)
        ) {
            setPaths(prev => [...prev, drawingShape as AnyPath]);
            setSelectedPathIds([drawingShape.id]);
        }
        cancelDrawingShape();
    }

    if (tool === 'brush' && isDrawingBrush.current) {
      isDrawingBrush.current = false;
      finishBrushPath();
    }
    
    if (previewD) {
      setPreviewD(null);
    }

    if (dragState) {
        if (isClosingPath.current) {
            const { pathId } = isClosingPath.current;
            // The path was already updated with the snapped anchor during pointer move.
            // Here, we just finalize it by setting the `isClosed` flag.
            setPaths(prev => prev.map(p => p.id === pathId ? { ...p, isClosed: true } : p));
        }
        endCoalescing();
    }
    isClosingPath.current = null; // Clean up ref
    
    if (marquee) {
        const point = getPointerPosition(e, e.currentTarget);
        const isClick = dist(marquee.start, point) < 5;

        if (isClick) {
            let clickedPathId: string | null = null;
            // Iterate in reverse to find the top-most path using precise hit detection
            for (let i = paths.length - 1; i >= 0; i--) {
                const path = paths[i];
                if (isPointHittingPath(point, path, viewTransform.viewTransform.scale)) {
                    clickedPathId = path.id;
                    break;
                }
            }

            if (clickedPathId) {
                if (e.shiftKey) {
                    setSelectedPathIds(ids => 
                        ids.includes(clickedPathId!)
                        ? ids.filter(id => id !== clickedPathId)
                        : [...ids, clickedPathId!]
                    );
                } else {
                    setSelectedPathIds([clickedPathId]);
                }
            } else {
                 if (!e.shiftKey) setSelectedPathIds([]);
            }
        } else { // Marquee selection
            const marqueeRect = getMarqueeRect(marquee);
            const newlySelected = paths
                .filter(path => doBboxesIntersect(getPathBoundingBox(path), marqueeRect))
                .map(path => path.id);
            
            if (e.shiftKey) {
                setSelectedPathIds(ids => {
                    const currentIds = new Set(ids);
                    newlySelected.forEach(id => {
                        if (currentIds.has(id)) {
                            currentIds.delete(id);
                        } else {
                            currentIds.add(id);
                        }
                    });
                    return Array.from(currentIds);
                });
            } else {
                setSelectedPathIds(newlySelected);
            }
        }
        setMarquee(null);
    }
    setDragState(null);
  };
  
  const handlePointerLeave = (e: React.PointerEvent<SVGSVGElement>) => {
    if (isPanning) setIsPanning(false);
    if (tool === 'brush' && isDrawingBrush.current) {
      isDrawingBrush.current = false;
      finishBrushPath();
    }
    if (dragState) {
      endCoalescing();
      setDragState(null);
    }
    if (marquee) setMarquee(null);
    if (previewD) setPreviewD(null);
    if (drawingShape) cancelDrawingShape();
    dragStartDetails.current = null;
    shapeStartPoint.current = null;
  };

  return {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerLeave: handlePointerLeave,
    marquee,
    previewD,
    drawingShape,
    cancelDrawingShape,
  };
};
