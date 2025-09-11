/**
 * 本文件包含了 useSelection hook 中处理 pointerUp 事件的复杂逻辑。
 */
// FIX: Removed 'React' from type import as it's not used and can cause errors.
import type { MutableRefObject } from 'react';
import type { Point, DragState, AnyPath, BrushPathData, SelectionMode } from '../../types';
import { getMarqueeRect } from '../../lib/drawing/bbox';
import { isPathIntersectingMarquee, isPathIntersectingLasso } from '../../lib/hit-testing';
import { samplePath } from '../../lib/drawing/path';

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

export const cutPaths = (lasso: Point[], paths: AnyPath[]): AnyPath[] => {
  const cutterSegments: { a: Point; b: Point }[] = [];
  for (let i = 0; i < lasso.length - 1; i++) {
    cutterSegments.push({ a: lasso[i], b: lasso[i + 1] });
  }

  const intersects = (p1: Point, p2: Point, p3: Point, p4: Point): boolean => {
    const s1x = p2.x - p1.x;
    const s1y = p2.y - p1.y;
    const s2x = p4.x - p3.x;
    const s2y = p4.y - p3.y;
    const denom = -s2x * s1y + s1x * s2y;
    if (Math.abs(denom) < 1e-6) return false;
    const s = (-s1y * (p1.x - p3.x) + s1x * (p1.y - p3.y)) / denom;
    const t = (s2x * (p1.y - p3.y) - s2y * (p1.x - p3.x)) / denom;
    return s >= 0 && s <= 1 && t >= 0 && t <= 1;
  };

  return paths.flatMap(p => {
    if ('points' in p) {
      const cutIdx = new Set<number>();
      for (let i = 0; i < p.points.length - 1; i++) {
        const a = p.points[i];
        const b = p.points[i + 1];
        for (const seg of cutterSegments) {
          if (intersects(a, b, seg.a, seg.b)) {
            cutIdx.add(i);
            break;
          }
        }
      }

      if (cutIdx.size === 0) return [p];

      const segments: Point[][] = [];
      let current: Point[] = [p.points[0]];
      for (let i = 0; i < p.points.length - 1; i++) {
        if (cutIdx.has(i)) {
          if (current.length > 1) segments.push(current);
          current = [p.points[i + 1]];
        } else {
          current.push(p.points[i + 1]);
        }
      }
      if (current.length > 1) segments.push(current);

      return segments.map((pts, idx) => ({ ...p, id: `${p.id}-${idx}`, points: pts } as BrushPathData));
    }

    if ('anchors' in p && p.anchors) {
      const { anchors, isClosed } = p;
      const cutIdx = new Set<number>();
      const segCount = anchors.length - (isClosed ? 0 : 1);

      for (let i = 0; i < segCount; i++) {
        const start = anchors[i];
        const end = anchors[(i + 1) % anchors.length];
        const samples = samplePath([start, end], 8, false);
        for (let j = 0; j < samples.length - 1; j++) {
          for (const seg of cutterSegments) {
            if (intersects(samples[j], samples[j + 1], seg.a, seg.b)) {
              cutIdx.add(i);
              j = samples.length; // break outer
              break;
            }
          }
        }
      }

      if (cutIdx.size === 0) return [p];

      const segments: typeof anchors[] = [];
      let current: typeof anchors = [anchors[0]];
      for (let i = 0; i < segCount; i++) {
        const nextAnchor = anchors[(i + 1) % anchors.length];
        if (cutIdx.has(i)) {
          if (current.length > 1) segments.push(current);
          current = [nextAnchor];
        } else {
          current.push(nextAnchor);
        }
      }
      if (current.length > 1) segments.push(current);

      return segments.map((ancs, idx) => ({ ...p, id: `${p.id}-${idx}`, anchors: ancs, isClosed: false }));
    }

    return [p];
  });
};

/**
 * 协调指针抬起事件的逻辑。
 * @param props - 包含事件对象、状态和设置器的对象。
 */
export const handlePointerUpLogic = (props: HandlePointerUpProps) => {
    const { e, dragState, setDragState, marquee, setMarquee, lassoPath, setLassoPath, pathState, isClosingPath, selectionMode } = props;
    const { paths, setPaths, setSelectedPathIds, endCoalescing } = pathState;

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
                let next: AnyPath[] = [];
                setPaths((prev: AnyPath[]) => {
                    next = cutPaths(lassoPath, prev);
                    return next;
                });
                setSelectedPathIds((ids: string[]) => ids.filter(id => next.some(p => p.id === id)));
            }
            setLassoPath(null);
            endCoalescing();
        }
    }
};