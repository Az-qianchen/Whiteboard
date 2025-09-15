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
import { updatePathAnchors, movePath, rotatePath, getPathsBoundingBox, resizePath, scalePath, transformCropRect, dist } from '@/lib/drawing';
import { isPointHittingPath } from '@/lib/hit-testing';
import { recursivelyUpdatePaths } from './utils';

const HIT_RADIUS = 10;

// Coalesce frequent move-updates into a single render per frame to improve
// responsiveness when dragging, especially for large groups or rough shapes.
let moveRafId: number | null = null;
let pendingTransformedShapes: AnyPath[] | null = null;
let pendingPathsSnapshot: AnyPath[] | null = null;

interface HandlePointerMoveProps {
  e: React.PointerEvent<SVGSVGElement>;
  movePoint: Point;
  dragState: DragState;
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
    const { e, movePoint, dragState, marquee, setMarquee, lassoPath, setLassoPath, pathState, toolbarState, viewTransform, setIsHoveringMovable, setIsHoveringEditable, isClosingPath, snapToGrid, setCurrentCropRect } = props;
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
                const { originalPaths, initialPointerPos, initialSelectionBbox } = dragState;
                const raw_dx = movePoint.x - initialPointerPos.x; const raw_dy = movePoint.y - initialPointerPos.y;
                const snappedBboxTopLeft = snapToGrid({ x: initialSelectionBbox.x + raw_dx, y: initialSelectionBbox.y + raw_dy });
                const final_dx = snappedBboxTopLeft.x - initialSelectionBbox.x; const final_dy = snappedBboxTopLeft.y - initialSelectionBbox.y;
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
                setPaths(recursivelyUpdatePaths(paths, (p: AnyPath) => p.id === dragState.pathId ? updatePathAnchors(p, dragState, finalMovePoint, e.shiftKey) as AnyPath : null)); return;
            }
            case 'arc': {
                const { pathId, pointIndex } = dragState;
                const snappedMovePoint = snapToGrid(movePoint);
                setPaths(recursivelyUpdatePaths(paths, (p: AnyPath) => {
                    if (p.id === pathId && p.tool === 'arc') {
                        const newPoints = [...(p as any).points]; newPoints[pointIndex] = snappedMovePoint;
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
                const snappedMovePoint = snapToGrid(movePoint);
                
                const dx = snappedMovePoint.x - initialPointerPos.x;
                const dy = snappedMovePoint.y - initialPointerPos.y;

                let newWidth = initialSelectionBbox.width;
                let newHeight = initialSelectionBbox.height;

                // Adjust dimensions based on which handle is being dragged
                if (handle.includes('right')) newWidth += dx;
                if (handle.includes('left')) newWidth -= dx;
                if (handle.includes('bottom')) newHeight += dy;
                if (handle.includes('top')) newHeight -= dy;

                // Enforce aspect ratio if shift is held
                if (e.shiftKey && initialSelectionBbox.width !== 0 && initialSelectionBbox.height !== 0) {
                    const originalAspectRatio = initialSelectionBbox.width / initialSelectionBbox.height;
                    const isCorner = (handle.includes('left') || handle.includes('right')) && (handle.includes('top') || handle.includes('bottom'));

                    if (!isCorner) {
                        if (handle.includes('left') || handle.includes('right')) {
                            newHeight = newWidth / originalAspectRatio;
                        } else { // top or bottom
                            newWidth = newHeight * originalAspectRatio;
                        }
                    } else {
                        // For corner handles, maintain aspect ratio based on the dominant mouse movement axis
                        if (Math.abs(dx) * originalAspectRatio > Math.abs(dy)) {
                            newHeight = newWidth / originalAspectRatio;
                        } else {
                            newWidth = newHeight * originalAspectRatio;
                        }
                    }
                }

                // Calculate scale factors, which can now be negative, allowing for flips
                const scaleX = initialSelectionBbox.width === 0 ? 1 : newWidth / initialSelectionBbox.width;
                const scaleY = initialSelectionBbox.height === 0 ? 1 : newHeight / initialSelectionBbox.height;
                
                // Determine the pivot point for scaling (the side/corner opposite to the handle)
                const pivot = {
                    x: handle.includes('right') ? initialSelectionBbox.x : (handle.includes('left') ? initialSelectionBbox.x + initialSelectionBbox.width : initialSelectionBbox.x + initialSelectionBbox.width / 2),
                    y: handle.includes('bottom') ? initialSelectionBbox.y : (handle.includes('top') ? initialSelectionBbox.y + initialSelectionBbox.height : initialSelectionBbox.y + initialSelectionBbox.height / 2)
                };
                
                transformedShapes = originalPaths.map((p: AnyPath) => scalePath(p, pivot, scaleX, scaleY));
                break;
            }
            case 'resize': {
                const { originalPath, handle, initialPointerPos } = dragState;
                const snappedMovePoint = snapToGrid(movePoint);
                let keepAspectRatio: boolean;
                if (originalPath.tool === 'image') {
                    // For images, lock aspect ratio by default. Unlock with Shift.
                    keepAspectRatio = !e.shiftKey;
                } else {
                    // For other shapes, free resize by default. Lock with Shift.
                    keepAspectRatio = e.shiftKey;
                }
                transformedShapes = [resizePath(originalPath, handle, snappedMovePoint, initialPointerPos, keepAspectRatio)];
                break;
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
