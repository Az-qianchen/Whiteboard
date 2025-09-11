/**
 * 本文件包含了 useSelection hook 中处理 pointerUp 事件的复杂逻辑。
 */
// FIX: Removed 'React' from type import as it's not used and can cause errors.
import type { MutableRefObject } from 'react';
import type { Point, DragState, AnyPath, BrushPathData, SelectionMode } from '../../types';
import { getMarqueeRect } from '../../lib/drawing';
import { isPathIntersectingMarquee, isPathIntersectingLasso } from '../../lib/hit-testing';
import { brushToVectorPath } from '../../lib/drawing/convert';
import { performBooleanOperation } from '../../lib/drawing/boolean';

interface HandlePointerUpProps {
  e: React.PointerEvent<SVGSVGElement>;
  dragState: DragState;
  setDragState: (state: DragState) => void;
  marquee: { start: Point; end: Point } | null;
  setMarquee: (marquee: { start: Point; end: Point } | null) => void;
  lassoPath: Point[] | null;
  setLassoPath: (path: Point[] | null) => void;
  pathState: any;
  isClosingPath: MutableRefObject<{ pathId: string; anchorIndex: number } | null>;
  selectionMode: SelectionMode;
}

/**
 * 协调指针抬起事件的逻辑。
 * @param props - 包含事件对象、状态和设置器的对象。
 */
export const handlePointerUpLogic = (props: HandlePointerUpProps) => {
    const { e, dragState, setDragState, marquee, setMarquee, lassoPath, setLassoPath, pathState, isClosingPath, selectionMode } = props;
    const { paths, setPaths, setSelectedPathIds, endCoalescing, selectedPathIds } = pathState;

    if (dragState) {
        if (isClosingPath.current) {
            const { pathId, anchorIndex } = isClosingPath.current;
            setPaths((prev: AnyPath[]) => prev.map(p => {
                if (p.id === pathId && 'anchors' in p && p.anchors) {
                    const newAnchors = [...p.anchors];
                    if (anchorIndex === 0) newAnchors.shift(); else newAnchors.pop();
                    return { ...p, anchors: newAnchors, isClosed: true };
                } return p;
            }));
            isClosingPath.current = null;
        }
        endCoalescing();
        setDragState(null);
    }
    if (marquee) {
        const marqueeRect = getMarqueeRect(marquee);
        if (marqueeRect.width > 1 || marqueeRect.height > 1) {
            const intersectingIds = paths.filter((p: AnyPath) => !p.isLocked && isPathIntersectingMarquee(p, marqueeRect)).map((p: AnyPath) => p.id);
            if (e.shiftKey) {
                setSelectedPathIds((prev: string[]) => { const newIds = new Set(prev); intersectingIds.forEach((id: string) => newIds.has(id) ? newIds.delete(id) : newIds.add(id)); return Array.from(newIds); });
            } else setSelectedPathIds(intersectingIds);
        } setMarquee(null);
    }
    if (lassoPath) {
        if (selectionMode === 'lasso') {
            if (lassoPath.length > 2) {
                const intersectingIds = paths.filter((p: AnyPath) => !p.isLocked && isPathIntersectingLasso(p, lassoPath)).map((p: AnyPath) => p.id);
                if (e.shiftKey) {
                    setSelectedPathIds((prev: string[]) => { const newIds = new Set(prev); intersectingIds.forEach((id: string) => newIds.has(id) ? newIds.delete(id) : newIds.add(id)); return Array.from(newIds); });
                } else setSelectedPathIds(intersectingIds);
            }
            setLassoPath(null);
        } else if (selectionMode === 'cut') {
            if (lassoPath.length > 1) {
                const cutter: BrushPathData = {
                    id: 'cutter-temp',
                    tool: 'brush',
                    points: lassoPath,
                    color: '#000',
                    fill: '#000',
                    fillStyle: 'solid',
                    strokeWidth: 8,
                    roughness: 0,
                    bowing: 0,
                    fillWeight: 0,
                    hachureAngle: 0,
                    hachureGap: 0,
                    curveTightness: 0,
                    curveStepCount: 0,
                };
                const cutterPath = brushToVectorPath(cutter);
                setPaths((prev: AnyPath[]) => {
                    const newPaths: AnyPath[] = [];
                    prev.forEach(p => {
                        if (selectedPathIds.includes(p.id)) {
                            const result = performBooleanOperation([p, cutterPath], 'subtract');
                            if (result) newPaths.push(...result);
                            else newPaths.push(p);
                        } else {
                            newPaths.push(p);
                        }
                    });
                    return newPaths;
                });
            }
            setLassoPath(null);
            endCoalescing();
        }
    }
};