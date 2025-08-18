import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { Point, DragState, AnyPath, VectorPathData, DrawingShape, RectangleData, EllipseData, ResizeHandlePosition, ImageData, PolygonData, BrushPathData } from '../types';
import { updatePathAnchors, insertAnchorOnCurve, movePath, getSqDistToSegment, rotatePath, getPathsBoundingBox, resizePath, getMarqueeRect, dist, sampleCubicBezier, scalePath } from '../lib/drawing';
import { isPointHittingPath, isPathIntersectingMarquee } from '../lib/hit-testing';

// Define the props the hook will receive
interface SelectionInteractionProps {
  pathState: any; // from usePaths
  toolbarState: any; // from useToolbarState
  viewTransform: any; // from useViewTransform
  isGridVisible: boolean;
  gridSize: number;
}

const HIT_RADIUS = 10; // Click radius for hitting controls
const DRAG_THRESHOLD = 4; // Pixels to move before it's a drag, not a click

/**
 * Custom hook to manage all pointer interactions related to the SELECTION tool.
 */
export const useSelection = ({
  pathState,
  toolbarState,
  viewTransform,
  isGridVisible,
  gridSize,
}: SelectionInteractionProps) => {
  const [dragState, setDragState] = useState<DragState>(null);
  const [marquee, setMarquee] = useState<{ start: Point; end: Point } | null>(null);
  const isClosingPath = useRef<{ pathId: string; anchorIndex: number } | null>(null);

  const { getPointerPosition, viewTransform: vt } = viewTransform;
  const { paths, setPaths, selectedPathIds, setSelectedPathIds, beginCoalescing, endCoalescing } = pathState;
  const { selectionMode } = toolbarState;
  
  const snapToGrid = useCallback((point: Point): Point => {
    if (!isGridVisible) return point;
    return { x: Math.round(point.x / gridSize) * gridSize, y: Math.round(point.y / gridSize) * gridSize };
  }, [isGridVisible, gridSize]);

  // Effect to automatically clear stale drag state if paths change from underneath it
  useEffect(() => {
    if (dragState) {
      const pathExists = (pathId: string) => paths.some((p: AnyPath) => p.id === pathId);

      let isStale = false;
      if (dragState.type === 'anchor' || dragState.type === 'handleIn' || dragState.type === 'handleOut' || dragState.type === 'resize' || dragState.type === 'border-radius') {
        if (!pathExists(dragState.pathId)) {
          isStale = true;
        }
      } else if (dragState.type === 'move' || dragState.type === 'scale' || dragState.type === 'rotate') {
        if (!dragState.pathIds.every(pathExists)) {
          isStale = true;
        }
      }

      if (isStale) {
        setDragState(null);
      }
    }
  }, [paths, dragState]);


  // --- Pointer Down Logic ---

  const handlePointerDownForMove = (point: Point, e: React.PointerEvent<SVGSVGElement>) => {
    const target = e.target as SVGElement;
    const handle = target.dataset.handle as ResizeHandlePosition | 'rotate' | 'border-radius' | undefined;
    const pathId = target.dataset.pathId;

    if (handle && selectedPathIds.length > 0) {
      if (handle === 'border-radius' && pathId) {
        const path = paths.find((p: AnyPath) => p.id === pathId);
        if (path && (path.tool === 'rectangle' || path.tool === 'image' || path.tool === 'polygon')) {
          beginCoalescing();
          setDragState({ type: 'border-radius', pathId: path.id, originalPath: path as RectangleData | ImageData | PolygonData, initialPointerPos: point });
          return;
        }
      }

      const selected = paths.filter((p: AnyPath) => selectedPathIds.includes(p.id));
      const bbox = getPathsBoundingBox(selected, false);
      if (!bbox) return;
      
      beginCoalescing();

      if (handle === 'rotate') {
        const center = { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height / 2 };
        const startAngle = Math.atan2(point.y - center.y, point.x - center.x);
        setDragState({ type: 'rotate', pathIds: selectedPathIds, originalPaths: selected, center, initialAngle: startAngle });
      } else if (handle !== 'border-radius') { // Check it's not the border-radius handle to avoid falling through
        setDragState({ type: 'scale', pathIds: selectedPathIds, handle: handle as ResizeHandlePosition, originalPaths: selected, initialPointerPos: point, initialSelectionBbox: bbox });
      }
      return;
    }

    if (selectedPathIds.length > 0) {
      const selected = paths.filter((p: AnyPath) => selectedPathIds.includes(p.id));
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
      let nextSelection = e.shiftKey ? (isSelected ? selectedPathIds.filter((id: string) => id !== clickedPathId) : [...selectedPathIds, clickedPathId]) : (isSelected ? selectedPathIds : [clickedPathId]);
      setSelectedPathIds(nextSelection);
      const pathsToMove = paths.filter((p: AnyPath) => nextSelection.includes(p.id));
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
    const handle = target.dataset.handle as ResizeHandlePosition | 'border-radius' | undefined;

    if (type && pathId && anchorIndexStr) {
      const anchorIndex = parseInt(anchorIndexStr, 10);
      const path = paths.find((p: AnyPath) => p.id === pathId);

      if (e.altKey && type === 'anchor' && path) {
        setPaths((prev: AnyPath[]) => prev.map(p => {
            if (p.id === pathId && 'anchors' in p && p.anchors && p.anchors.length > 1) {
                const newAnchors = [...p.anchors]; newAnchors.splice(anchorIndex, 1);
                return { ...p, anchors: newAnchors };
            }
            return p;
        }).filter(p => p && (!('anchors' in p) || p.anchors.length > 0)));
        return;
      }
      
      if (path && 'anchors' in path && path.anchors && anchorIndex < path.anchors.length) {
        beginCoalescing();
        setDragState({ type: (e.shiftKey && type === 'anchor' ? 'handleOut' : type), pathId, anchorIndex });
      }
      return;
    }

    if (handle && pathId) {
      const path = paths.find((p: AnyPath) => p.id === pathId);
      if (path && (path.tool === 'rectangle' || path.tool === 'ellipse' || path.tool === 'image' || path.tool === 'polygon')) {
          beginCoalescing();
          if (handle === 'border-radius') {
              setDragState({ type: 'border-radius', pathId: path.id, originalPath: path as RectangleData | ImageData | PolygonData, initialPointerPos: point });
          } else {
              setDragState({ type: 'resize', pathId: path.id, handle, originalPath: path as RectangleData | EllipseData | ImageData | PolygonData, initialPointerPos: point });
          }
          return;
      }
    }
    
    if (e.ctrlKey) {
      let pathToAddTo: VectorPathData | null = null;
      for (let i = paths.length - 1; i >= 0; i--) {
        const p = paths[i];
        if ((p.tool === 'pen' || p.tool === 'line') && isPointHittingPath(point, p, vt.scale)) {
          pathToAddTo = p as VectorPathData;
          break;
        }
      }

      if (pathToAddTo && pathToAddTo.anchors && pathToAddTo.anchors.length >= 2) {
        const path = pathToAddTo;
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
            const startAnchor = path.anchors[index];
            const endAnchor = path.anchors[index + 1];

            const newAnchorToAdd = insertAnchorOnCurve(startAnchor, endAnchor, t);

            const newAnchors = [...path.anchors];
            newAnchors.splice(index + 1, 0, newAnchorToAdd);

            setPaths((prev: AnyPath[]) => prev.map(p => p.id === path.id ? { ...p, anchors: newAnchors } : p));
            return;
        }
      }
      return;
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
      if (e.shiftKey) {
        setSelectedPathIds((prev: string[]) => isSelected ? prev.filter(id => id !== clickedPathId) : [...prev, clickedPathId]);
      } else {
        // The previous logic was flawed. When not holding shift, a click
        // should always result in the clicked item being the sole selection,
        // regardless of its previous selection state.
        setSelectedPathIds([clickedPathId]);
      }
    } else {
      if (!e.shiftKey) setSelectedPathIds([]);
      setMarquee({ start: point, end: point });
    }
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const point = getPointerPosition(e, e.currentTarget);
    if (selectionMode === 'move') {
      handlePointerDownForMove(point, e);
    } else { // 'edit'
      handlePointerDownForEdit(point, e);
    }
  };

  // --- Pointer Move Logic ---
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const movePoint = getPointerPosition(e, e.currentTarget);

    if (dragState) {
      if (dragState.type === 'anchor' || dragState.type === 'handleIn' || dragState.type === 'handleOut') {
        const snappedMovePoint = snapToGrid(movePoint);
        let finalMovePoint = snappedMovePoint;
        if (dragState.type === 'anchor') {
          isClosingPath.current = null;
          const path = paths.find((p: AnyPath) => p.id === dragState.pathId);
          if (path && 'anchors' in path && path.tool !== 'line' && !path.isClosed && path.anchors.length > 2 && (dragState.anchorIndex === 0 || dragState.anchorIndex === path.anchors.length - 1)) {
            const otherEndpoint = path.anchors[dragState.anchorIndex === 0 ? path.anchors.length - 1 : 0];
            if (dist(snappedMovePoint, otherEndpoint.point) < HIT_RADIUS / vt.scale) {
              finalMovePoint = otherEndpoint.point;
              isClosingPath.current = { pathId: path.id, anchorIndex: dragState.anchorIndex };
            }
          }
        }
        setPaths((prev: AnyPath[]) => prev.map(p => p.id === dragState.pathId ? updatePathAnchors(p, dragState, finalMovePoint, e.shiftKey) : p));
      } else {
        let transformedShapes: AnyPath[] = [];
        switch (dragState.type) {
          case 'border-radius': {
            const { originalPath, initialPointerPos } = dragState;
            const dx = movePoint.x - initialPointerPos.x;
            const originalRadius = originalPath.borderRadius ?? 0;
            const rawRadius = originalRadius + dx;

            const maxRadius = Math.min(originalPath.width / 2, originalPath.height / 2);
            const newRadius = Math.max(0, Math.min(rawRadius, maxRadius));
            
            transformedShapes = [{ ...originalPath, borderRadius: newRadius }];
            break;
          }
          case 'rotate': {
            const { center, originalPaths, initialAngle } = dragState;
            const currentAngle = Math.atan2(movePoint.y - center.y, movePoint.x - center.x);
            let angleDelta = currentAngle - initialAngle;
            if (e.shiftKey) angleDelta = Math.round(angleDelta / (15 * Math.PI / 180)) * (15 * Math.PI / 180);
            transformedShapes = originalPaths.map(p => rotatePath(p, center, angleDelta));
            break;
          }
          case 'scale': {
            const { originalPaths, initialSelectionBbox, handle, initialPointerPos } = dragState;
            const snappedMovePoint = snapToGrid(movePoint);
            const dummyRect: RectangleData = { ...initialSelectionBbox, tool: 'rectangle', id: '', color: '', fill: '', fillStyle: '', strokeWidth: 0, roughness: 0, bowing: 0, fillWeight: 0, hachureAngle: 0, hachureGap: 0, curveTightness: 0, curveStepCount: 0 };
            const newBbox = resizePath(dummyRect, handle, snappedMovePoint, initialPointerPos, e.shiftKey) as RectangleData;
            
            if (newBbox.width !== 0 && newBbox.height !== 0 && initialSelectionBbox.width !== 0 && initialSelectionBbox.height !== 0) {
              const scaleX = newBbox.width / initialSelectionBbox.width;
              const scaleY = newBbox.height / initialSelectionBbox.height;
              
              const handleIsLeft = handle.includes('left');
              const handleIsTop = handle.includes('top');
              let pivot: Point;
              if (handle === 'top' || handle === 'bottom') {
                pivot = { x: initialSelectionBbox.x + initialSelectionBbox.width / 2, y: handleIsTop ? initialSelectionBbox.y + initialSelectionBbox.height : initialSelectionBbox.y };
              } else if (handle === 'left' || handle === 'right') {
                pivot = { x: handleIsLeft ? initialSelectionBbox.x + initialSelectionBbox.width : initialSelectionBbox.x, y: initialSelectionBbox.y + initialSelectionBbox.height / 2 };
              } else {
                pivot = { x: handleIsLeft ? initialSelectionBbox.x + initialSelectionBbox.width : initialSelectionBbox.x, y: handleIsTop ? initialSelectionBbox.y + initialSelectionBbox.height : initialSelectionBbox.y };
              }
              
              transformedShapes = originalPaths.map(p => scalePath(p, pivot, scaleX, scaleY));
            }
            break;
          }
          case 'move': {
            const { initialPointerPos, initialSelectionBbox, originalPaths } = dragState;
            const dxUnsnapped = movePoint.x - initialPointerPos.x;
            const dyUnsnapped = movePoint.y - initialPointerPos.y;
            const newBboxTopLeft = {
              x: initialSelectionBbox.x + dxUnsnapped,
              y: initialSelectionBbox.y + dyUnsnapped,
            };
            const snappedBboxTopLeft = snapToGrid(newBboxTopLeft);
            const dx = snappedBboxTopLeft.x - initialSelectionBbox.x;
            const dy = snappedBboxTopLeft.y - initialSelectionBbox.y;
            transformedShapes = originalPaths.map(op => movePath(op, dx, dy));
            break;
          }
          case 'resize': {
            const snappedMovePoint = snapToGrid(movePoint);
            const resizedShape = resizePath(dragState.originalPath, dragState.handle, snappedMovePoint, dragState.initialPointerPos, e.shiftKey);
            transformedShapes = [resizedShape];
            break;
          }
        }
        if (transformedShapes.length > 0) {
          const transformedMap = new Map(transformedShapes.map(p => [p.id, p]));
          setPaths((prev: AnyPath[]) => prev.map(p => transformedMap.get(p.id) || p));
        }
      }
    } else if (marquee) {
        setMarquee(m => m ? { ...m, end: movePoint } : null);
    }
  };

  // --- Pointer Up/Leave Logic ---

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (dragState) {
      if (isClosingPath.current) {
        const { pathId, anchorIndex } = isClosingPath.current;
        setPaths((prev: AnyPath[]) => prev.map(p => {
            if (p.id === pathId) {
                const vectorPath = p as VectorPathData;
                const anchors = [...vectorPath.anchors];
                const len = anchors.length;
                if (len < 2) return { ...vectorPath, isClosed: true };

                if (anchorIndex === 0) { // Dragged start anchor to end
                    const startAnchor = anchors.shift()!; // Remove start anchor
                    anchors[anchors.length - 1].handleOut = startAnchor.handleOut;
                } else { // Dragged end anchor to start
                    const endAnchor = anchors.pop()!; // Remove end anchor
                    anchors[0].handleIn = endAnchor.handleIn;
                }
                
                return { ...vectorPath, anchors, isClosed: true };
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
        const intersectingIds = paths.filter((path: AnyPath) => isPathIntersectingMarquee(path, marqueeRect)).map((path: AnyPath) => path.id);
        
        if (e.shiftKey) {
          setSelectedPathIds((ids: string[]) => Array.from(new Set([...ids, ...intersectingIds])));
        } else {
          setSelectedPathIds(intersectingIds);
        }
      }
      setMarquee(null);
    }
  };
  
  const onPointerLeave = () => {
    if (dragState) { 
      endCoalescing(); 
      setDragState(null); 
    }
    if (marquee) setMarquee(null);
  };

  return { onPointerDown, onPointerMove, onPointerUp, onPointerLeave, marquee, dragState };
};