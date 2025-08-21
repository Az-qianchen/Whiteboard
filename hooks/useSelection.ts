import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { Point, DragState, AnyPath, VectorPathData, DrawingShape, RectangleData, EllipseData, ResizeHandlePosition, ImageData, PolygonData, BrushPathData } from '../types';
import { updatePathAnchors, insertAnchorOnCurve, movePath, getSqDistToSegment, rotatePath, getPathsBoundingBox, resizePath, getMarqueeRect, dist, sampleCubicBezier, scalePath } from '../lib/drawing';
import { isPointHittingPath, isPathIntersectingMarquee, isPathIntersectingLasso } from '../lib/hit-testing';

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
  const [lassoPath, setLassoPath] = useState<Point[] | null>(null);
  const isClosingPath = useRef<{ pathId: string; anchorIndex: number } | null>(null);

  const { getPointerPosition, viewTransform: vt } = viewTransform;
  const { paths, setPaths, selectedPathIds, setSelectedPathIds, beginCoalescing, endCoalescing } = pathState;
  const { selectionMode, setSelectionMode } = toolbarState;
  
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
      if (paths[i].isLocked) continue;
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
        if (p.isLocked) continue;
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
      if (paths[i].isLocked) continue;
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
  
  const handlePointerDownForLasso = (point: Point, e: React.PointerEvent<SVGSVGElement>) => {
    if (!e.shiftKey) setSelectedPathIds([]);
    setLassoPath([point]);
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const point = getPointerPosition(e, e.currentTarget);
    if (selectionMode === 'move') {
      handlePointerDownForMove(point, e);
    } else if (selectionMode === 'edit') {
      handlePointerDownForEdit(point, e);
    } else if (selectionMode === 'lasso') {
      handlePointerDownForLasso(point, e);
    }
  };

  // --- Pointer Move Logic ---
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const movePoint = getPointerPosition(e, e.currentTarget);

    if (lassoPath) {
      setLassoPath(prev => [...(prev ?? []), movePoint]);
      return;
    }

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
            const dummyRect: RectangleData = { ...initialSelectionBbox, tool: 'rectangle', id: '', color: '', fill: '', fillStyle: '', strokeWidth: 0, roughness: 0, bowing: 0, fillWeight: 0, hachureAngle: 0, hachureGap: 4, curveTightness: 0, curveStepCount: 9 };
            const resizedRect = resizePath(dummyRect, handle, snappedMovePoint, initialPointerPos, e.shiftKey);
            const scaleX = resizedRect.width / initialSelectionBbox.width;
            const scaleY = resizedRect.height / initialSelectionBbox.height;
            const pivot = { x: 0, y: 0 };
            if (handle.includes('right')) pivot.x = initialSelectionBbox.x; else if (handle.includes('left')) pivot.x = initialSelectionBbox.x + initialSelectionBbox.width; else pivot.x = initialSelectionBbox.x + initialSelectionBbox.width / 2;
            if (handle.includes('bottom')) pivot.y = initialSelectionBbox.y; else if (handle.includes('top')) pivot.y = initialSelectionBbox.y + initialSelectionBbox.height; else pivot.y = initialSelectionBbox.y + initialSelectionBbox.height / 2;
            transformedShapes = originalPaths.map(p => scalePath(p, pivot, scaleX, scaleY));
            break;
          }
          case 'resize': {
            const { originalPath, handle, initialPointerPos } = dragState;
            const snappedMovePoint = snapToGrid(movePoint);
            transformedShapes = [resizePath(originalPath, handle, snappedMovePoint, initialPointerPos, e.shiftKey)];
            break;
          }
          case 'move': {
            const { originalPaths, initialPointerPos } = dragState;
            const dx = movePoint.x - initialPointerPos.x;
            const dy = movePoint.y - initialPointerPos.y;
            transformedShapes = originalPaths.map(p => movePath(p, dx, dy));
            break;
          }
        }
        const transformedMap = new Map(transformedShapes.map(p => [p.id, p]));
        setPaths((prev: AnyPath[]) => prev.map(p => transformedMap.get(p.id) || p));
      }
    } else if (marquee) {
      setMarquee({ start: marquee.start, end: movePoint });
    }
  };
  
  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (dragState) {
        if (isClosingPath.current) {
            const { pathId, anchorIndex } = isClosingPath.current;
            setPaths((prev: AnyPath[]) => prev.map(p => {
                if (p.id === pathId && 'anchors' in p && p.anchors) {
                    const newAnchors = [...p.anchors];
                    if (anchorIndex === 0) {
                        newAnchors.shift(); // remove first
                    } else {
                        newAnchors.pop(); // remove last
                    }
                    return { ...p, anchors: newAnchors, isClosed: true };
                }
                return p;
            }));
            isClosingPath.current = null;
        }
        endCoalescing();
        setDragState(null);
    }

    if (marquee) {
        const marqueeRect = getMarqueeRect(marquee);
        if (marqueeRect.width > 1 || marqueeRect.height > 1) {
            const intersectingIds = paths
                .filter((p: AnyPath) => !p.isLocked && isPathIntersectingMarquee(p, marqueeRect))
                .map((p: AnyPath) => p.id);

            if (e.shiftKey) {
                setSelectedPathIds((prev: string[]) => {
                    const newIds = new Set(prev);
                    intersectingIds.forEach((id: string) => {
                        if (newIds.has(id)) newIds.delete(id); else newIds.add(id);
                    });
                    return Array.from(newIds);
                });
            } else {
                setSelectedPathIds(intersectingIds);
            }
        }
        setMarquee(null);
    }

    if (lassoPath) {
        if (lassoPath.length > 2) {
            const intersectingIds = paths
                .filter((p: AnyPath) => !p.isLocked && isPathIntersectingLasso(p, lassoPath))
                .map((p: AnyPath) => p.id);
            
            if (e.shiftKey) {
                setSelectedPathIds((prev: string[]) => {
                    const newIds = new Set(prev);
                    intersectingIds.forEach((id: string) => {
                        if (newIds.has(id)) newIds.delete(id); else newIds.add(id);
                    });
                    return Array.from(newIds);
                });
            } else {
                setSelectedPathIds(intersectingIds);
            }
        }
        setLassoPath(null);
    }
  };

  const onPointerLeave = (e: React.PointerEvent<SVGSVGElement>) => {
      if (dragState || marquee || lassoPath) {
          onPointerUp(e);
      }
  };
  
  return { onPointerDown, onPointerMove, onPointerUp, onPointerLeave, dragState, marquee, lassoPath };
};
