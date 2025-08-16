
import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Point, DragState, Anchor, AnyPath, VectorPathData, DrawingShape, RectangleData, EllipseData, ResizeHandlePosition, LivePath, ImageData } from '../types';
import { dist, updatePathAnchors, insertAnchorOnCurve, movePath, getSqDistToSegment, rotatePath } from '../lib/utils';
import { getPathsBoundingBox, resizePath, getMarqueeRect } from '../lib/geometry';
import { isPointHittingPath, isPathIntersectingMarquee } from '../lib/hit-testing';
import { sampleCubicBezier, pointsToPathD } from '../lib/path-fitting';

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
  const isClosingPath = useRef<{ pathId: string; anchorIndex: number } | null>(null);

  const { setIsPanning, isPanning, viewTransform: vt } = viewTransform;
  const {
    paths, setPaths, currentBrushPath, setCurrentBrushPath, currentPenPath, currentLinePath,
    setCurrentPenPath, setCurrentLinePath, selectedPathIds, setSelectedPathIds, finishBrushPath,
    handleFinishPenPath, handleCancelPenPath, handleFinishLinePath, handleCancelLinePath,
    beginCoalescing, endCoalescing,
  } = pathState;
  const { tool, color, strokeWidth, roughness, bowing, fillWeight, hachureAngle, hachureGap, curveTightness, curveStepCount, fill, fillStyle } = toolbarState;

  const snapToGrid = useCallback((point: Point): Point => {
    if (!isGridVisible || tool === 'brush') return point;
    return { x: Math.round(point.x / gridSize) * gridSize, y: Math.round(point.y / gridSize) * gridSize };
  }, [isGridVisible, gridSize, tool]);

  const cancelDrawingShape = useCallback(() => {
    setDrawingShape(null);
    shapeStartPoint.current = null;
  }, []);

  useEffect(() => {
    if (tool !== 'rectangle' && tool !== 'ellipse' && tool !== 'line') cancelDrawingShape();
    if (tool !== 'line' && currentLinePath) handleCancelLinePath();
  }, [tool, cancelDrawingShape, currentLinePath, handleCancelLinePath]);

  // --- Pointer Down Logic ---

  const handlePointerDownForDrawing = (snappedPoint: Point, point: Point) => {
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
    }
  };

  const handlePointerDownForPen = (snappedPoint: Point, e: React.PointerEvent<SVGSVGElement>) => {
    const newShapeId = Date.now().toString();
    const sharedShapeProps = { id: newShapeId, color, strokeWidth, roughness, bowing, fill, fillStyle, fillWeight, hachureAngle, hachureGap, curveTightness, curveStepCount };
    
    const createCorner = e.shiftKey;
    if (currentPenPath && currentPenPath.anchors.length > 1 && dist(snappedPoint, currentPenPath.anchors[0].point) < HIT_RADIUS / vt.scale) {
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
  };

  const handlePointerDownForMove = (point: Point, e: React.PointerEvent<SVGSVGElement>) => {
    const handle = (e.target as SVGElement).dataset.handle as ResizeHandlePosition | 'rotate' | undefined;
    if (handle && selectedPathIds.length > 0) {
      const selected = paths.filter(p => selectedPathIds.includes(p.id));
      const bbox = getPathsBoundingBox(selected, false);
      if (!bbox) return;
      
      beginCoalescing();

      if (handle === 'rotate') {
        const center = { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height / 2 };
        const startAngle = Math.atan2(point.y - center.y, point.x - center.x);
        setDragState({ type: 'rotate', pathIds: selectedPathIds, originalPaths: selected, center, initialAngle: startAngle });
      } else {
        setDragState({ type: 'scale', pathIds: selectedPathIds, handle, originalPaths: selected, initialPointerPos: point, initialSelectionBbox: bbox });
      }
      return;
    }

    if (selectedPathIds.length > 0) {
      const selected = paths.filter(p => selectedPathIds.includes(p.id));
      const selectionHitBbox = getPathsBoundingBox(selected, true);
      if (selectionHitBbox && point.x >= selectionHitBbox.x && point.x <= selectionHitBbox.x + selectionHitBbox.width && point.y >= selectionHitBbox.y && point.y <= selectionHitBbox.y + selectionHitBbox.height) {
        beginCoalescing();
        const selectionGeometricBbox = getPathsBoundingBox(selected, false);
        if (!selectionGeometricBbox) return; 
        setDragState({ type: 'move', pathIds: selectedPathIds, originalPaths: selected, initialPointerPos: point, initialSelectionBbox: selectionGeometricBbox });
        return;
      }
    }

    let clickedPathId: string | null = null;
    for (let i = paths.length - 1; i >= 0; i--) {
      if (isPointHittingPath(point, paths[i], vt.scale)) {
        clickedPathId = paths[i].id;
        break;
      }
    }
    
    if (clickedPathId) {
      const isSelected = selectedPathIds.includes(clickedPathId);
      let nextSelection = e.shiftKey ? (isSelected ? selectedPathIds.filter(id => id !== clickedPathId) : [...selectedPathIds, clickedPathId]) : (isSelected ? selectedPathIds : [clickedPathId]);
      setSelectedPathIds(nextSelection);
      const pathsToMove = paths.filter(p => nextSelection.includes(p.id));
      const initialSelectionBbox = getPathsBoundingBox(pathsToMove);
      if (pathsToMove.length > 0 && initialSelectionBbox) {
        beginCoalescing();
        setDragState({ type: 'move', pathIds: nextSelection, originalPaths: pathsToMove, initialPointerPos: point, initialSelectionBbox });
      }
    } else {
      if (!e.shiftKey) setSelectedPathIds([]);
      setMarquee({ start: point, end: point });
    }
  };

  const handlePointerDownForEdit = (point: Point, e: React.PointerEvent<SVGSVGElement>) => {
    const target = e.target as SVGElement;
    const type = target.dataset.type as 'anchor' | 'handleIn' | 'handleOut' | undefined;
    const pathId = target.dataset.pathId;
    const anchorIndexStr = target.dataset.anchorIndex;

    if (type && pathId && anchorIndexStr) {
      const anchorIndex = parseInt(anchorIndexStr, 10);
      const path = paths.find(p => p.id === pathId);

      if (e.altKey && type === 'anchor' && path) {
        setPaths((prev: AnyPath[]) => prev.map(p => {
            if (p.id === pathId && 'anchors' in p && p.anchors && p.anchors.length > 1) {
                const newAnchors = [...p.anchors]; newAnchors.splice(anchorIndex, 1);
                return { ...p, anchors: newAnchors };
            }
            return p;
        }).filter(p => p && (!('anchors' in p) || p.anchors.length > 0)));
        setSelectedPathIds(ids => ids.filter(id => id !== pathId));
        return;
      }
      
      if (path && 'anchors' in path && path.anchors && anchorIndex < path.anchors.length) {
        beginCoalescing();
        setDragState({ type: (e.shiftKey && type === 'anchor' ? 'handleOut' : type), pathId, anchorIndex });
      }
      return;
    }
    
    const singleSelectedPath = selectedPathIds.length === 1 ? paths.find(p => p.id === selectedPathIds[0]) : null;
    if (e.ctrlKey && singleSelectedPath && 'anchors' in singleSelectedPath && singleSelectedPath.anchors && singleSelectedPath.anchors.length >= 2) {
      const path = singleSelectedPath as VectorPathData;
      const thresholdSq = Math.pow(10 / vt.scale, 2);
      let closest = null, minDistanceSq = Infinity;
      for (let i = 0; i < path.anchors.length - 1; i++) {
        const [startAnchor, endAnchor] = [path.anchors[i], path.anchors[i+1]];
        const segmentPoints = sampleCubicBezier(startAnchor.point, startAnchor.handleOut, endAnchor.handleIn, endAnchor.point, 20);
        for (let j = 0; j < segmentPoints.length - 1; j++) {
            const { distSq, t: segmentT } = getSqDistToSegment(point, segmentPoints[j], segmentPoints[j+1]);
            if (distSq < minDistanceSq) { minDistanceSq = distSq; closest = { index: i, t: (j + segmentT) / (segmentPoints.length - 1) }; }
        }
      }
      if (closest && minDistanceSq < thresholdSq) {
        const { index, t } = closest;
        const newAnchor = insertAnchorOnCurve(path.anchors[index], path.anchors[index + 1], t);
        const newAnchors = [...path.anchors]; newAnchors.splice(index + 1, 0, newAnchor);
        setPaths((prev: AnyPath[]) => prev.map(p => p.id === path.id ? { ...p, anchors: newAnchors } : p));
        return;
      }
    }
    
    if (selectedPathIds.length === 1) {
      const handle = (e.target as SVGElement).dataset.handle as ResizeHandlePosition | undefined;
      if (handle && singleSelectedPath && (singleSelectedPath.tool === 'rectangle' || singleSelectedPath.tool === 'ellipse')) {
        beginCoalescing();
        setDragState({ type: 'resize', pathId: singleSelectedPath.id, handle, originalPath: singleSelectedPath as RectangleData | EllipseData, initialPointerPos: point });
        return;
      }
    }
    
    let clickedPathId: string | null = null;
    for (let i = paths.length - 1; i >= 0; i--) {
      if (isPointHittingPath(point, paths[i], vt.scale)) { clickedPathId = paths[i].id; break; }
    }
    setSelectedPathIds(clickedPathId ? [clickedPathId] : []);
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button === 1 || (e.altKey && !dragState && (tool !== 'edit' && tool !== 'move'))) {
      setIsPanning(true);
      return;
    }
    if (e.button !== 0) return;
    
    const point = getPointerPosition(e, e.currentTarget);
    const snappedPoint = snapToGrid(point);
    setPreviewD(null);

    switch (tool) {
      case 'rectangle':
      case 'ellipse':
      case 'brush':
      case 'line':
        handlePointerDownForDrawing(snappedPoint, point);
        break;
      case 'pen':
        handlePointerDownForPen(snappedPoint, e);
        break;
      case 'move':
        handlePointerDownForMove(point, e);
        break;
      case 'edit':
        handlePointerDownForEdit(point, e);
        break;
    }
  };

  // --- Pointer Move Logic ---
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (isPanning) { viewTransform.handlePanMove(e); return; }
    const movePoint = getPointerPosition(e, e.currentTarget);
    const snappedMovePoint = snapToGrid(movePoint);

    if (dragState) {
      let finalMovePoint = snappedMovePoint;
      if (dragState.type === 'anchor') {
          isClosingPath.current = null;
          const pathBeingEdited = paths.find(p => p.id === dragState.pathId);
          if (pathBeingEdited && 'anchors' in pathBeingEdited && pathBeingEdited.tool !== 'line' && !pathBeingEdited.isClosed && pathBeingEdited.anchors.length > 2 && (dragState.anchorIndex === 0 || dragState.anchorIndex === pathBeingEdited.anchors.length - 1)) {
              const otherEndpoint = pathBeingEdited.anchors[dragState.anchorIndex === 0 ? pathBeingEdited.anchors.length - 1 : 0];
              if (dist(snappedMovePoint, otherEndpoint.point) < HIT_RADIUS / vt.scale) {
                  finalMovePoint = otherEndpoint.point;
                  isClosingPath.current = { pathId: pathBeingEdited.id, anchorIndex: dragState.anchorIndex };
              }
          }
      }
      
      if (dragState.type === 'anchor' || dragState.type === 'handleIn' || dragState.type === 'handleOut') {
        const updatePoint = dragState.type === 'anchor' ? finalMovePoint : snappedMovePoint;              
        if (currentPenPath && currentPenPath.id === dragState.pathId) {
          setCurrentPenPath(p => p ? updatePathAnchors(p, dragState, updatePoint, e.shiftKey) : p);
        } else {
           setPaths(prev => prev.map(p => {
             if (p.id === dragState.pathId) {
               return updatePathAnchors(p, dragState, updatePoint, e.shiftKey);
             }
             return p;
           }));
        }
      } else {
        let transformedShapes: AnyPath[] = [];
        switch (dragState.type) {
          case 'rotate': {
              const { center, originalPaths, initialAngle } = dragState;
              const currentAngle = Math.atan2(snappedMovePoint.y - center.y, snappedMovePoint.x - center.x);
              let angleDelta = currentAngle - initialAngle;
              if (e.shiftKey) angleDelta = Math.round(angleDelta / (15 * Math.PI / 180)) * (15 * Math.PI / 180);
              transformedShapes = originalPaths.map(p => rotatePath(p, center, angleDelta));
              break;
          }
          case 'scale': {
              const { originalPaths, initialSelectionBbox, handle, initialPointerPos } = dragState;
              const dummyRect: RectangleData = { ...initialSelectionBbox, tool: 'rectangle', id: '', color: '', fill: '', fillStyle: '', strokeWidth: 0, roughness: 0, bowing: 0, fillWeight: 0, hachureAngle: 0, hachureGap: 0, curveTightness: 0, curveStepCount: 0 };
              const newBbox = resizePath(dummyRect, handle, snappedMovePoint, initialPointerPos, e.shiftKey) as RectangleData;
              if (newBbox.width !== 0 && newBbox.height !== 0 && initialSelectionBbox.width !== 0 && initialSelectionBbox.height !== 0) {
                const [scaleX, scaleY] = [newBbox.width / initialSelectionBbox.width, newBbox.height / initialSelectionBbox.height];
                const pivot = { x: handle.includes('left') ? initialSelectionBbox.x + initialSelectionBbox.width : initialSelectionBbox.x, y: handle.includes('top') ? initialSelectionBbox.y + initialSelectionBbox.height : initialSelectionBbox.y };
                if (handle === 'top' || handle === 'bottom') pivot.x = initialSelectionBbox.x + initialSelectionBbox.width / 2;
                if (handle === 'left' || handle === 'right') pivot.y = initialSelectionBbox.y + initialSelectionBbox.height / 2;
                const scalePoint = (pt: Point) => ({ x: pivot.x + (pt.x - pivot.x) * scaleX, y: pivot.y + (pt.y - pivot.y) * scaleY });
                
                transformedShapes = originalPaths.map(p => {
                    let scaledPath: AnyPath;
                    if ('anchors' in p) {
                        scaledPath = { ...p, anchors: p.anchors.map(a => ({ point: scalePoint(a.point), handleIn: scalePoint(a.handleIn), handleOut: scalePoint(a.handleOut) }))};
                    } else if ('x' in p && 'y' in p && 'width' in p && 'height' in p){
                        scaledPath = { ...p, x: pivot.x + (p.x - pivot.x) * scaleX, y: pivot.y + (p.y - pivot.y) * scaleY, width: p.width * scaleX, height: p.height * scaleY };
                    } else {
                        scaledPath = p;
                    }
                    return scaledPath;
                });
              }
              break;
          }
          case 'move': {
              const [totalDx, totalDy] = [movePoint.x - dragState.initialPointerPos.x, movePoint.y - dragState.initialPointerPos.y];
              let [finalDx, finalDy] = [totalDx, totalDy];
              if (isGridVisible) {
                  const { initialSelectionBbox } = dragState;
                  finalDx = Math.round((initialSelectionBbox.x + totalDx) / gridSize) * gridSize - initialSelectionBbox.x;
                  finalDy = Math.round((initialSelectionBbox.y + totalDy) / gridSize) * gridSize - initialSelectionBbox.y;
              }
              transformedShapes = dragState.originalPaths.map(op => movePath(op, finalDx, finalDy));
              break;
          }
          case 'resize': {
              const resizedShape = resizePath(dragState.originalPath, dragState.handle, snappedMovePoint, dragState.initialPointerPos, e.shiftKey);
              transformedShapes = [resizedShape];
              break;
          }
        }
        if (transformedShapes.length > 0) {
          const transformedMap = new Map(transformedShapes.map(p => [p.id, p]));
          setPaths(prev => prev.map(p => transformedMap.get(p.id) || p));
        }
      }
    } else if (drawingShape) {
        if (drawingShape.tool === 'line') {
          setDrawingShape(prev => {
            if (prev?.tool !== 'line') return prev;
            let endPoint = snappedMovePoint;
            if (e.shiftKey && shapeStartPoint.current) {
              const start = shapeStartPoint.current;
              const [dx, dy] = [endPoint.x - start.x, endPoint.y - start.y];
              const angle = Math.atan2(dy, dx);
              const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
              const distance = Math.sqrt(dx * dx + dy * dy);
              endPoint = { x: start.x + distance * Math.cos(snappedAngle), y: start.y + distance * Math.sin(snappedAngle) };
            }
            const endAnchor: Anchor = { point: endPoint, handleIn: endPoint, handleOut: endPoint };
            const newAnchors = [prev.anchors[0], endAnchor];
            return { ...prev, anchors: newAnchors };
          });
        } else if (drawingShape.tool === 'rectangle' || drawingShape.tool === 'ellipse') {
          setDrawingShape(prev => {
            if (!prev || !('x' in prev) || !shapeStartPoint.current) return prev as any;
            const start = shapeStartPoint.current;
            let [newWidth, newHeight] = [snappedMovePoint.x - start.x, snappedMovePoint.y - start.y];
            if (e.shiftKey) {
              const size = Math.max(Math.abs(newWidth), Math.abs(newHeight));
              newWidth = size * Math.sign(newWidth);
              newHeight = size * Math.sign(newHeight);
            }
            return { ...prev, x: newWidth > 0 ? start.x : start.x + newWidth, y: newHeight > 0 ? start.y : start.y + newHeight, width: Math.abs(newWidth), height: Math.abs(newHeight) } as any;
          });
        }
    } else if (tool === 'brush' && isDrawingBrush.current && currentBrushPath) {
        setCurrentBrushPath((prev: LivePath | null) => (prev ? { ...prev, points: [...prev.points, movePoint] } : null));
    } else if (marquee) {
        setMarquee(m => m ? { ...m, end: movePoint } : null);
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
    if (isPanning) { setIsPanning(false); return; }
    
    if (tool === 'line' && shapeStartPoint.current && !drawingShape) {
        const point = shapeStartPoint.current;
        const newAnchor: Anchor = { point, handleIn: point, handleOut: point };
        const newShapeId = Date.now().toString();
        const sharedProps = { id: newShapeId, color, strokeWidth, roughness, bowing, fill, fillStyle, fillWeight, hachureAngle, hachureGap, curveTightness, curveStepCount };
        setCurrentLinePath({ ...sharedProps, tool: 'line', anchors: [newAnchor], isClosed: false });
        shapeStartPoint.current = null;
        return;
    }

    if (drawingShape && shapeStartPoint.current) {
        if ( (drawingShape.tool === 'rectangle' && (drawingShape.width > MIN_SHAPE_SIZE || drawingShape.height > MIN_SHAPE_SIZE)) ||
             (drawingShape.tool === 'ellipse' && (drawingShape.width > MIN_SHAPE_SIZE || drawingShape.height > MIN_SHAPE_SIZE)) ||
             (drawingShape.tool === 'line' && dist(drawingShape.anchors[0].point, drawingShape.anchors[1].point) > MIN_SHAPE_SIZE) ) {
            setPaths(prev => [...prev, drawingShape as AnyPath]);
            setSelectedPathIds([drawingShape.id]);
        }
        cancelDrawingShape();
    }

    if (tool === 'brush' && isDrawingBrush.current) {
        isDrawingBrush.current = false;
        finishBrushPath();
    }
    
    if (dragState) {
      if (isClosingPath.current) {
          setPaths(prev => prev.map(p => {
              if (p.id === isClosingPath.current!.pathId) {
                  return { ...p, isClosed: true };
              }
              return p;
          }));
      }
      
      endCoalescing();
      isClosingPath.current = null;
      setDragState(null);
    }
    
    if (marquee) {
        if (dist(marquee.start, marquee.end) >= DRAG_THRESHOLD) {
            const marqueeRect = getMarqueeRect(marquee);
            const intersectingIds = paths.filter(path => isPathIntersectingMarquee(path, marqueeRect)).map(path => path.id);
            if (tool === 'move' && e.shiftKey) {
                setSelectedPathIds(ids => Array.from(new Set([...ids, ...intersectingIds])));
            } else if (tool === 'move') {
                setSelectedPathIds(intersectingIds);
            }
        }
        setMarquee(null);
    }
    
    setPreviewD(null);
  };
  
  const onPointerLeave = () => {
    if (isPanning) setIsPanning(false);
    if (isDrawingBrush.current) { isDrawingBrush.current = false; finishBrushPath(); }
    if (dragState) { 
      endCoalescing(); 
      setDragState(null); 
    }
    if (marquee) setMarquee(null);
    if (previewD) setPreviewD(null);
    if (drawingShape) cancelDrawingShape();
    shapeStartPoint.current = null;
  };

  return { onPointerDown, onPointerMove, onPointerUp, onPointerLeave, marquee, previewD, drawingShape, cancelDrawingShape, dragState };
};
