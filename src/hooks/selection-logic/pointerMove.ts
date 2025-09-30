/**
 * 本文件包含了 useSelection hook 中处理 pointerMove 事件的复杂逻辑。
 */
import type { MutableRefObject, Dispatch, SetStateAction } from 'react';
import type {
  Point,
  DragState,
  AnyPath,
  RectangleData,
  BBox,
  SelectionPathState,
  SelectionToolbarState,
  SelectionViewTransform,
} from '@/types';
import { updatePathAnchors, movePath, rotatePath, getPathsBoundingBox, resizePath, scalePath, transformCropRect, dist, skewPath } from '@/lib/drawing';
import { getLinearHandles, updateLinearGradientHandles, updateRadialGradientHandles } from '@/lib/gradient';
import { getGradientHandleSpace } from '@/lib/gradientHandles';
import { isPointHittingPath } from '@/lib/hit-testing';
import { recursivelyUpdatePaths } from './utils';

const HIT_RADIUS = 10;
const AXIS_LOCK_SWITCH_THRESHOLD = 4;
const SNAP_EPSILON = 1e-6;

const computeSnapContext = (
  initial: Point,
  current: Point,
  snapFn: (point: Point) => Point,
) => {
  const snapped = snapFn(current);

  const deltaX = current.x - initial.x;
  const deltaY = current.y - initial.y;
  const movedX = Math.abs(deltaX) > SNAP_EPSILON;
  const movedY = Math.abs(deltaY) > SNAP_EPSILON;

  const snapX = movedX && Math.abs(snapped.x - current.x) > SNAP_EPSILON;
  const snapY = movedY && Math.abs(snapped.y - current.y) > SNAP_EPSILON;

  return {
    snapped,
    snapX,
    snapY,
    effective: {
      x: snapX ? snapped.x : current.x,
      y: snapY ? snapped.y : current.y,
    },
  };
};

// Coalesce frequent move-updates into a single render per frame to improve
// responsiveness when dragging, especially for large groups or rough shapes.
let moveRafId: number | null = null;
let pendingTransformedShapes: AnyPath[] | null = null;
let pendingPathsSnapshot: AnyPath[] | null = null;

interface HandlePointerMoveProps {
  e: React.PointerEvent<SVGSVGElement>;
  movePoint: Point;
  dragState: DragState;
  setDragState: Dispatch<SetStateAction<DragState>>;
  marquee: { start: Point; end: Point } | null;
  setMarquee: Dispatch<SetStateAction<{ start: Point; end: Point } | null>>;
  lassoPath: Point[] | null;
  setLassoPath: Dispatch<SetStateAction<Point[] | null>>;
  pathState: SelectionPathState;
  toolbarState: SelectionToolbarState;
  viewTransform: SelectionViewTransform;
  setIsHoveringMovable: (hovering: boolean) => void;
  setIsHoveringEditable: (hovering: boolean) => void;
  isClosingPath: MutableRefObject<{ pathId: string; anchorIndex: number } | null>;
  snapToGrid: (point: Point) => Point;
  setCurrentCropRect: Dispatch<SetStateAction<BBox | null>>;
}

/**
 * 协调指针移动事件的逻辑。
 * @param props - 包含事件对象、状态和设置器的对象。
 */
export const handlePointerMoveLogic = (props: HandlePointerMoveProps) => {
    const { e, movePoint, dragState, setDragState, marquee, setMarquee, lassoPath, setLassoPath, pathState, toolbarState, viewTransform, setIsHoveringMovable, setIsHoveringEditable, isClosingPath, snapToGrid, setCurrentCropRect } = props;
    const { paths, setPaths } = pathState;
    const { selectionMode } = toolbarState;
    const { viewTransform: vt } = viewTransform;

    if (lassoPath) { setLassoPath([...(lassoPath ?? []), movePoint]); return; }
    if (dragState) {
        if (dragState.type === 'crop') {
            const { initialCropRect, originalImage, handle, initialPointerPos } = dragState;
            const newCropRect = transformCropRect(initialCropRect, originalImage, handle, movePoint, initialPointerPos);
            setCurrentCropRect(newCropRect);
            return;
        }

        let transformedShapes: AnyPath[] = [];
        switch (dragState.type) {
            case 'move': {
                const { originalPaths, initialPointerPos, initialSelectionBbox, axisLock: currentAxisLock } = dragState;
                const raw_dx = movePoint.x - initialPointerPos.x; const raw_dy = movePoint.y - initialPointerPos.y;
                const pointerSnap = computeSnapContext(initialPointerPos, movePoint, snapToGrid);
                const absDx = Math.abs(raw_dx); const absDy = Math.abs(raw_dy);

                let nextAxisLock = currentAxisLock;
                if (e.shiftKey) {
                    if (!currentAxisLock) {
                        if (absDx > absDy) {
                            nextAxisLock = 'x';
                        } else if (absDy > absDx) {
                            nextAxisLock = 'y';
                        }
                    } else if (currentAxisLock === 'x' && absDy - absDx > AXIS_LOCK_SWITCH_THRESHOLD) {
                        nextAxisLock = 'y';
                    } else if (currentAxisLock === 'y' && absDx - absDy > AXIS_LOCK_SWITCH_THRESHOLD) {
                        nextAxisLock = 'x';
                    }
                } else {
                    nextAxisLock = null;
                }

                if (nextAxisLock !== currentAxisLock) {
                    setDragState(prev => (prev && prev.type === 'move' ? { ...prev, axisLock: nextAxisLock } : prev));
                }

                const rawTarget = { x: initialSelectionBbox.x + raw_dx, y: initialSelectionBbox.y + raw_dy };
                const snappedTarget = snapToGrid(rawTarget);
                const targetX = pointerSnap.snapX ? snappedTarget.x : rawTarget.x;
                const targetY = pointerSnap.snapY ? snappedTarget.y : rawTarget.y;
                let final_dx = targetX - initialSelectionBbox.x; let final_dy = targetY - initialSelectionBbox.y;
                if (nextAxisLock === 'x') {
                    final_dy = 0;
                } else if (nextAxisLock === 'y') {
                    final_dx = 0;
                }
                transformedShapes = originalPaths.map((p: AnyPath) => movePath(p, final_dx, final_dy));

                // Schedule a single paths update for this animation frame using the
                // latest computed shapes, reducing redundant renders and rough re-draws.
                pendingTransformedShapes = transformedShapes;
                pendingPathsSnapshot = paths;
                if (moveRafId == null) {
                    moveRafId = window.requestAnimationFrame(() => {
                        moveRafId = null;
                        if (!pendingTransformedShapes || !pendingPathsSnapshot) return;
                        const transformedMap = new Map(pendingTransformedShapes.map(p => [p.id, p]));
                        setPaths(recursivelyUpdatePaths(pendingPathsSnapshot, (p: AnyPath) => transformedMap.get(p.id) || null));
                        pendingTransformedShapes = null;
                        pendingPathsSnapshot = null;
                    });
                }
                return; // Early return: we'll update via rAF
            }
            case 'anchor': case 'handleIn': case 'handleOut': {
                const snapContext = computeSnapContext(dragState.initialPoint, movePoint, snapToGrid);
                let finalMovePoint = snapContext.effective;
                if (dragState.type === 'anchor') {
                    isClosingPath.current = null;
                    const path = paths.find((p: AnyPath) => p.id === dragState.pathId);
                    if (path && 'anchors' in path && path.tool !== 'line' && !path.isClosed && path.anchors.length > 2 && (dragState.anchorIndex === 0 || dragState.anchorIndex === path.anchors.length - 1)) {
                        const otherEndpoint = path.anchors[dragState.anchorIndex === 0 ? path.anchors.length - 1 : 0];
                        if (dist(finalMovePoint, otherEndpoint.point) < HIT_RADIUS / vt.scale) {
                            finalMovePoint = otherEndpoint.point;
                            isClosingPath.current = { pathId: path.id, anchorIndex: dragState.anchorIndex };
                        }
                    }
                }
                setPaths(recursivelyUpdatePaths(paths, (p: AnyPath) => p.id === dragState.pathId ? updatePathAnchors(p, dragState, finalMovePoint, e.shiftKey) as AnyPath : null)); return;
            }
            case 'arc': {
                const { pathId, pointIndex } = dragState;
                const snapContext = computeSnapContext(dragState.initialPoint, movePoint, snapToGrid);
                const effectiveMovePoint = snapContext.effective;
                setPaths(recursivelyUpdatePaths(paths, (p: AnyPath) => {
                    if (p.id === pathId && p.tool === 'arc') {
                        const newPoints = [...(p as any).points]; newPoints[pointIndex] = effectiveMovePoint;
                        return { ...p, points: newPoints as [Point, Point, Point] };
                    } return null;
                })); return;
            }
            case 'border-radius': {
                const { originalPath, initialPointerPos } = dragState;
                const dx = movePoint.x - initialPointerPos.x;
                const newRadius = Math.max(0, Math.min((originalPath.borderRadius ?? 0) + dx, Math.min(originalPath.width / 2, originalPath.height / 2)));
                transformedShapes = [{ ...originalPath, borderRadius: newRadius }];
                break;
            }
            case 'rotate': {
                const { center, originalPaths, initialAngle } = dragState;
                const currentAngle = Math.atan2(movePoint.y - center.y, movePoint.x - center.x);
                let angleDelta = currentAngle - initialAngle;
                if (e.shiftKey) angleDelta = Math.round(angleDelta / (15 * Math.PI / 180)) * (15 * Math.PI / 180);
                transformedShapes = originalPaths.map((p: AnyPath) => rotatePath(p, center, angleDelta));
                break;
            }
            case 'scale': {
                const { originalPaths, initialSelectionBbox, handle, initialPointerPos } = dragState;
                const snapContext = computeSnapContext(initialPointerPos, movePoint, snapToGrid);
                const effectivePoint = snapContext.effective;

                const dx = effectivePoint.x - initialPointerPos.x;
                const dy = effectivePoint.y - initialPointerPos.y;

                let proposedWidth = initialSelectionBbox.width;
                let proposedHeight = initialSelectionBbox.height;

                // Adjust dimensions based on which handle is being dragged
                if (handle.includes('right')) proposedWidth += dx;
                if (handle.includes('left')) proposedWidth -= dx;
                if (handle.includes('bottom')) proposedHeight += dy;
                if (handle.includes('top')) proposedHeight -= dy;

                // Enforce aspect ratio if shift is held
                if (e.shiftKey && initialSelectionBbox.width !== 0 && initialSelectionBbox.height !== 0) {
                    const originalAspectRatio = initialSelectionBbox.width / initialSelectionBbox.height;
                    const isCorner = (handle.includes('left') || handle.includes('right')) && (handle.includes('top') || handle.includes('bottom'));

                    if (!isCorner) {
                        if (handle.includes('left') || handle.includes('right')) {
                            proposedHeight = proposedWidth / originalAspectRatio;
                        } else { // top or bottom
                            proposedWidth = proposedHeight * originalAspectRatio;
                        }
                    } else {
                        // For corner handles, maintain aspect ratio based on the dominant mouse movement axis
                        if (Math.abs(dx) * originalAspectRatio > Math.abs(dy)) {
                            proposedHeight = proposedWidth / originalAspectRatio;
                        } else {
                            proposedWidth = proposedHeight * originalAspectRatio;
                        }
                    }
                }

                const initialMinX = initialSelectionBbox.x;
                const initialMaxX = initialSelectionBbox.x + initialSelectionBbox.width;
                const initialMinY = initialSelectionBbox.y;
                const initialMaxY = initialSelectionBbox.y + initialSelectionBbox.height;

                let targetMinX: number;
                let targetMaxX: number;
                if (handle.includes('left')) {
                    targetMaxX = initialMaxX;
                    targetMinX = targetMaxX - proposedWidth;
                } else if (handle.includes('right')) {
                    targetMinX = initialMinX;
                    targetMaxX = targetMinX + proposedWidth;
                } else {
                    targetMinX = initialMinX + (initialSelectionBbox.width - proposedWidth) / 2;
                    targetMaxX = targetMinX + proposedWidth;
                }

                let targetMinY: number;
                let targetMaxY: number;
                if (handle.includes('top')) {
                    targetMaxY = initialMaxY;
                    targetMinY = targetMaxY - proposedHeight;
                } else if (handle.includes('bottom')) {
                    targetMinY = initialMinY;
                    targetMaxY = targetMinY + proposedHeight;
                } else {
                    targetMinY = initialMinY + (initialSelectionBbox.height - proposedHeight) / 2;
                    targetMaxY = targetMinY + proposedHeight;
                }

                const snappedMin = snapToGrid({ x: targetMinX, y: targetMinY });
                const snappedMax = snapToGrid({ x: targetMaxX, y: targetMaxY });

                const desiredMinX = snapContext.snapX ? snappedMin.x : targetMinX;
                const desiredMaxX = snapContext.snapX ? snappedMax.x : targetMaxX;
                const desiredMinY = snapContext.snapY ? snappedMin.y : targetMinY;
                const desiredMaxY = snapContext.snapY ? snappedMax.y : targetMaxY;

                const finalWidth = desiredMaxX - desiredMinX;
                const finalHeight = desiredMaxY - desiredMinY;

                // Calculate scale factors, which can now be negative, allowing for flips
                const scaleX = initialSelectionBbox.width === 0 ? 1 : finalWidth / initialSelectionBbox.width;
                const scaleY = initialSelectionBbox.height === 0 ? 1 : finalHeight / initialSelectionBbox.height;

                // Determine the pivot point for scaling (the side/corner opposite to the handle)
                const pivot = {
                    x: handle.includes('right')
                        ? initialMinX
                        : (handle.includes('left')
                            ? initialMaxX
                            : initialMinX + initialSelectionBbox.width / 2),
                    y: handle.includes('bottom')
                        ? initialMinY
                        : (handle.includes('top')
                            ? initialMaxY
                            : initialMinY + initialSelectionBbox.height / 2)
                };

                const targetPivot = {
                    x: handle.includes('right')
                        ? desiredMinX
                        : (handle.includes('left')
                            ? desiredMaxX
                            : (desiredMinX + desiredMaxX) / 2),
                    y: handle.includes('bottom')
                        ? desiredMinY
                        : (handle.includes('top')
                            ? desiredMaxY
                            : (desiredMinY + desiredMaxY) / 2)
                };

                const translateX = targetPivot.x - pivot.x;
                const translateY = targetPivot.y - pivot.y;

                transformedShapes = originalPaths.map((p: AnyPath) => {
                    const scaled = scalePath(p, pivot, scaleX, scaleY);
                    if (Math.abs(translateX) > SNAP_EPSILON || Math.abs(translateY) > SNAP_EPSILON) {
                        return movePath(scaled, translateX, translateY);
                    }
                    return scaled;
                });
                break;
            }
            case 'resize': {
                const { originalPath, handle, initialPointerPos } = dragState;
                const snapContext = computeSnapContext(initialPointerPos, movePoint, snapToGrid);
                const effectiveMovePoint = snapContext.effective;
                let keepAspectRatio: boolean;
                if (originalPath.tool === 'image') {
                    // For images, lock aspect ratio by default. Unlock with Shift.
                    keepAspectRatio = !e.shiftKey;
                } else {
                    // For other shapes, free resize by default. Lock with Shift.
                    keepAspectRatio = e.shiftKey;
                }
                transformedShapes = [resizePath(originalPath, handle, effectiveMovePoint, initialPointerPos, keepAspectRatio)];
                break;
            }
            case 'skew': {
                const { originalPath, handle } = dragState;
                const snapContext = computeSnapContext(dragState.initialPointerPos, movePoint, snapToGrid);
                const effectiveMovePoint = snapContext.effective;
                transformedShapes = [skewPath(originalPath, handle, effectiveMovePoint)];
                break;
            }
            case 'gradient': {
                const { pathId, handle } = dragState;
                const path = paths.find((p: AnyPath) => p.id === pathId);
                if (!path || !path.fillGradient) {
                    return;
                }

                const space = getGradientHandleSpace(path);
                if (!space) {
                    return;
                }

                const normalized = space.fromCanvas(movePoint);
                if (!normalized) {
                    return;
                }

                const gradient = path.fillGradient;
                if (gradient.type === 'linear') {
                    if (handle !== 'start' && handle !== 'end') {
                        return;
                    }
                    const currentHandles = getLinearHandles(gradient);
                    const updatedHandles = handle === 'start'
                        ? [normalized, currentHandles[1]]
                        : [currentHandles[0], normalized];
                    const nextGradient = updateLinearGradientHandles(gradient, updatedHandles);

                    setPaths(recursivelyUpdatePaths(paths, (p: AnyPath) => (
                        p.id === pathId ? { ...p, fillGradient: nextGradient } as AnyPath : null
                    )));
                } else {
                    if (handle !== 'center' && handle !== 'edge') {
                        return;
                    }
                    const nextGradient = handle === 'center'
                        ? updateRadialGradientHandles(gradient, { center: normalized })
                        : updateRadialGradientHandles(gradient, { edge: normalized });

                    setPaths(recursivelyUpdatePaths(paths, (p: AnyPath) => (
                        p.id === pathId ? { ...p, fillGradient: nextGradient } as AnyPath : null
                    )));
                }
                return;
            }
        }
        const transformedMap = new Map(transformedShapes.map(p => [p.id, p]));
        setPaths(recursivelyUpdatePaths(paths, (p: AnyPath) => transformedMap.get(p.id) || null));

    } else if (marquee) {
        setMarquee({ start: marquee.start, end: movePoint });
    } else {
        let isHovering = (selectionMode === 'move' || selectionMode === 'edit') && paths.slice().reverse().some((p: AnyPath) => !p.isLocked && isPointHittingPath(movePoint, p, vt.scale));
        setIsHoveringMovable(selectionMode === 'move' && isHovering);
        setIsHoveringEditable(selectionMode === 'edit' && isHovering);
    }
};
