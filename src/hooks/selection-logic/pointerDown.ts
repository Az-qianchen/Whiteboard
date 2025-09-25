/**
 * 本文件包含了 useSelection hook 中处理 pointerDown 事件的复杂逻辑。
 */
import type { MutableRefObject, Dispatch, SetStateAction } from 'react';
import type {
  Point,
  DragState,
  AnyPath,
  VectorPathData,
  ResizeHandlePosition,
  ImageData,
  BBox,
  SelectionPathState,
  SelectionToolbarState,
  SelectionViewTransform,
  GradientControlHandle,
} from '@/types';
import { updatePathAnchors, insertAnchorOnCurve, getSqDistToSegment, getPathsBoundingBox, dist, sampleCubicBezier, rotateResizeHandle } from '@/lib/drawing';
import { isPointHittingPath, findDeepestHitPath } from '@/lib/hit-testing';
import { recursivelyUpdatePaths } from './utils';

const HIT_RADIUS = 10; // 点击命中控制点的半径

/**
 * 处理在“移动/变换”模式下的指针按下事件。
 * @param point - 指针在画布坐标系中的位置。
 * @param e - React 指针事件。
 * @param clickedPath - 在指针位置下被击中的路径，如果存在的话。
 * @param props - 包含状态和设置器的对象。
 */
const handlePointerDownForMove = (
  point: Point,
  e: React.PointerEvent<SVGSVGElement>,
  clickedPath: AnyPath | null,
  props: {
    pathState: SelectionPathState;
    setDragState: Dispatch<SetStateAction<DragState>>;
    setMarquee: Dispatch<SetStateAction<{ start: Point; end: Point } | null>>;
  }
) => {
    const { pathState, setDragState, setMarquee } = props;
    const { paths, selectedPathIds, setSelectedPathIds, beginCoalescing } = pathState;

    const startMoveDrag = (selectionIds: string[]) => {
      if (selectionIds.length === 0) return;
      const selectedPaths = paths.filter((p: AnyPath) => selectionIds.includes(p.id));
      const selectionGeometricBbox = getPathsBoundingBox(selectedPaths, false);
  
      if (selectedPaths.length > 0 && selectionGeometricBbox) {
          beginCoalescing();
          setDragState({
              type: 'move',
              pathIds: selectionIds,
              originalPaths: selectedPaths,
              initialPointerPos: point,
              initialSelectionBbox: selectionGeometricBbox,
              axisLock: null,
          });
      }
    };

    if (clickedPath) {
      const isSelected = selectedPathIds.includes(clickedPath.id);
      let nextSelection = e.shiftKey ? (isSelected ? selectedPathIds.filter((id: string) => id !== clickedPath.id) : [...selectedPathIds, clickedPath.id]) : (isSelected ? selectedPathIds : [clickedPath.id]);
      setSelectedPathIds(nextSelection);
      startMoveDrag(nextSelection);
    } else { 
      const selected = paths.filter((p: AnyPath) => selectedPathIds.includes(p.id));
      const selectionHitBbox = getPathsBoundingBox(selected, true);
      if (selectionHitBbox && point.x >= selectionHitBbox.x && point.x <= selectionHitBbox.x + selectionHitBbox.width && point.y >= selectionHitBbox.y && point.y <= selectionHitBbox.y + selectionHitBbox.height) {
        startMoveDrag(selectedPathIds);
      } else {
        if (!e.shiftKey) setSelectedPathIds([]);
        setMarquee({ start: point, end: point });
      }
    }
};

/**
 * 处理在“编辑锚点”模式下的指针按下事件。
 * @param point - 指针在画布坐标系中的位置。
 * @param e - React 指针事件。
 * @param clickedPath - 在指针位置下被击中的路径，如果存在的话。
 * @param props - 包含状态和设置器的对象。
 */
const handlePointerDownForEdit = (
  point: Point,
  e: React.PointerEvent<SVGSVGElement>,
  clickedPath: AnyPath | null,
  props: {
    pathState: SelectionPathState;
    viewTransform: SelectionViewTransform;
    setMarquee: Dispatch<SetStateAction<{ start: Point; end: Point } | null>>;
  }
) => {
    const { pathState, viewTransform, setMarquee } = props;
    const { paths, setPaths, setSelectedPathIds } = pathState;
    const { viewTransform: vt } = viewTransform;

    if (e.ctrlKey && clickedPath && (clickedPath.tool === 'pen' || clickedPath.tool === 'line') && clickedPath.anchors && clickedPath.anchors.length >= 2) {
        const path = clickedPath as VectorPathData;
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
            setPaths(recursivelyUpdatePaths(paths, p => {
                if (p.id === path.id) {
                    const newAnchors = [...(p as VectorPathData).anchors];
                    newAnchors.splice(index + 1, 0, newAnchorToAdd);
                    return { ...p, anchors: newAnchors };
                }
                return null;
            }));
            return;
        }
    }

    if (clickedPath) {
      const isSelected = pathState.selectedPathIds.includes(clickedPath.id);
      if (e.shiftKey) {
        setSelectedPathIds((prev: string[]) => isSelected ? prev.filter(id => id !== clickedPath.id) : [...prev, clickedPath.id]);
      } else {
        setSelectedPathIds([clickedPath.id]);
      }
    } else {
      if (!e.shiftKey) setSelectedPathIds([]);
      setMarquee({ start: point, end: point });
    }
};

/**
 * 处理在“套索选择”模式下的指针按下事件。
 * @param point - 指针在画布坐标系中的位置。
 * @param e - React 指针事件。
 * @param props - 包含状态和设置器的对象。
 */
const handlePointerDownForLasso = (
  point: Point,
  e: React.PointerEvent<SVGSVGElement>,
  props: {
    pathState: SelectionPathState;
    setLassoPath: Dispatch<SetStateAction<Point[] | null>>;
  }
) => {
  if (!e.shiftKey) props.pathState.setSelectedPathIds([]);
  props.setLassoPath([point]);
};

interface HandlePointerDownProps {
  e: React.PointerEvent<SVGSVGElement>;
  point: Point;
  setDragState: Dispatch<SetStateAction<DragState>>;
  setMarquee: Dispatch<SetStateAction<{ start: Point; end: Point } | null>>;
  setLassoPath: Dispatch<SetStateAction<Point[] | null>>;
  pathState: SelectionPathState;
  toolbarState: SelectionToolbarState;
  viewTransform: SelectionViewTransform;
  onDoubleClick: (path: AnyPath) => void;
  lastClickRef: MutableRefObject<{ time: number; pathId: string | null }>;
  croppingState: { pathId: string; originalPath: ImageData } | null;
  currentCropRect: BBox | null;
  cropTool: 'crop' | 'magic-wand';
  onMagicWandSample: (point: Point) => void;
}

/**
 * 协调指针按下事件的逻辑。
 * @param props - 包含事件对象、状态和设置器的对象。
 */
export const handlePointerDownLogic = (props: HandlePointerDownProps) => {
    const { e, point, setDragState, pathState, toolbarState, viewTransform, onDoubleClick, lastClickRef, croppingState, currentCropRect, cropTool, onMagicWandSample } = props;
    const { paths, setPaths, selectedPathIds, beginCoalescing, endCoalescing, setSelectedPathIds } = pathState;
    const { selectionMode } = toolbarState;
    const { viewTransform: vt } = viewTransform;
    const target = e.target as SVGElement;

    const handle = target.dataset.handle as ResizeHandlePosition | 'rotate' | 'border-radius' | 'arc' | undefined;
    const type = target.dataset.type as 'anchor' | 'handleIn' | 'handleOut' | undefined;
    const gradientHandle = target.dataset.gradientHandle as GradientControlHandle | undefined;
    const pathId = target.dataset.pathId;
    
    // If in cropping mode, only allow interaction with crop handles for the correct image.
    // Prevent all other canvas interactions.
    if (croppingState) {
        if (cropTool === 'magic-wand') {
            if (e.button === 0) {
                onMagicWandSample(point);
            }
        } else if (currentCropRect && pathId === croppingState.pathId && handle && handle !== 'rotate' && handle !== 'border-radius' && handle !== 'arc') {
            beginCoalescing();
            setDragState({
                type: 'crop',
                pathId,
                handle: handle as ResizeHandlePosition,
                initialCropRect: currentCropRect,
                originalImage: croppingState.originalPath,
                initialPointerPos: point,
            });
        }
        // Any other click (on another shape, empty space, etc.) does nothing.
        return;
    }


    if (gradientHandle && pathId) {
        if (selectionMode === 'move') {
            const path = paths.find((p: AnyPath) => p.id === pathId);
            if (path && path.fillGradient && !path.isLocked) {
                beginCoalescing();
                setDragState({ type: 'gradient', pathId, handle: gradientHandle });
            }
        }
        return;
    }

    if ((handle || type) && pathId) {
        beginCoalescing();
        if (selectionMode === 'move' && handle) {
            const selected = paths.filter((p: AnyPath) => selectedPathIds.includes(p.id));
            const bbox = getPathsBoundingBox(selected, false);
            if (handle === 'rotate') {
                if (!bbox) { endCoalescing(); return; }
                const center = { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height / 2 };
                const startAngle = Math.atan2(point.y - center.y, point.x - center.x);
                setDragState({ type: 'rotate', pathIds: selectedPathIds, originalPaths: selected, center, initialAngle: startAngle });
            } else if (handle === 'border-radius' && selected.length === 1) {
                const path = selected[0];
                if (path.tool === 'rectangle' || path.tool === 'image' || path.tool === 'polygon') setDragState({ type: 'border-radius', pathId: path.id, originalPath: path as any, initialPointerPos: point });
            } else if (handle !== 'border-radius' && handle !== 'arc') {
                if (selected.length === 0) {
                    endCoalescing();
                    return;
                }
                const path = selected[0];
                const isSimpleShape = selected.length === 1 && (path.tool === 'rectangle' || path.tool === 'ellipse' || path.tool === 'image' || path.tool === 'polygon' || path.tool === 'frame');

                if (isSimpleShape) {
                    if (e.ctrlKey || e.metaKey) {
                        setDragState({ type: 'skew', pathId: path.id, handle, originalPath: path as any, initialPointerPos: point });
                    } else {
                        setDragState({ type: 'resize', pathId: path.id, handle, originalPath: path as any, initialPointerPos: point });
                    }
                } else {
                    if (!bbox) { endCoalescing(); return; }
                    setDragState({ type: 'scale', pathIds: selectedPathIds, handle, originalPaths: selected, initialPointerPos: point, initialSelectionBbox: bbox });
                }
            }
        } else if (selectionMode === 'edit') {
            const path = paths.find((p: AnyPath) => p.id === pathId);
            if (!path) { endCoalescing(); return; }

            if (type && target.dataset.anchorIndex) {
                 const anchorIndex = parseInt(target.dataset.anchorIndex, 10);
                 if (e.altKey) {
                    setPaths(recursivelyUpdatePaths(paths, p => {
                        if (p.id === pathId && 'anchors' in p && p.anchors && p.anchors.length > 1) {
                            const newAnchors = [...p.anchors]; newAnchors.splice(anchorIndex, 1); return { ...p, anchors: newAnchors };
                        } return null;
                    }));
                    endCoalescing();
                 } else setDragState({ type: (e.shiftKey && type === 'anchor' ? 'handleOut' : type), pathId, anchorIndex });
            } else if (handle === 'border-radius' && (path.tool === 'rectangle' || path.tool === 'image' || path.tool === 'polygon')) setDragState({ type: 'border-radius', pathId, originalPath: path, initialPointerPos: point });
            else if (handle === 'arc' && path.tool === 'arc' && target.dataset.pointIndex) setDragState({ type: 'arc', pathId, pointIndex: parseInt(target.dataset.pointIndex, 10) as 0 | 1 | 2 });
            else if (handle && handle !== 'rotate' && handle !== 'border-radius' && handle !== 'arc') {
                if (path.tool === 'rectangle' || path.tool === 'ellipse' || path.tool === 'image' || path.tool === 'polygon' || path.tool === 'frame') setDragState({ type: 'resize', pathId, handle, originalPath: path as any, initialPointerPos: point });
            }
        } return;
    }
    
    let clickedPath: AnyPath | null = selectionMode === 'edit' ? findDeepestHitPath(point, paths, vt.scale) : paths.slice().reverse().find((p: AnyPath) => !p.isLocked && isPointHittingPath(point, p, vt.scale)) || null;

    if (clickedPath) {
        const now = Date.now();
        if (lastClickRef.current.pathId === clickedPath.id && now - lastClickRef.current.time < 300) {
            // DON'T allow another double-click action if we are already cropping
            if (!croppingState) {
                onDoubleClick(clickedPath);
            }
            lastClickRef.current = { time: 0, pathId: null };
            return;
        }
        lastClickRef.current = { time: now, pathId: clickedPath.id };
    } else {
        lastClickRef.current = { time: 0, pathId: null };
    }
    
    if (selectionMode === 'move') handlePointerDownForMove(point, e, clickedPath, props);
    else if (selectionMode === 'edit') handlePointerDownForEdit(point, e, clickedPath, props);
    else if (selectionMode === 'lasso') handlePointerDownForLasso(point, e, props);
};
