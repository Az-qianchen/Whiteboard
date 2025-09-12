/**
 * 本文件包含了 useSelection hook 中处理 pointerUp 事件的复杂逻辑。
 */
// FIX: Removed 'React' from type import as it's not used and can cause errors.
import type { MutableRefObject } from 'react';
import type { Point, DragState, AnyPath, BrushPathData, SelectionMode } from '../../types';
import { getMarqueeRect } from '../../lib/drawing/bbox';
import { isPathIntersectingMarquee, isPathIntersectingLasso } from '../../lib/hit-testing';

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

  const intersectAt = (
    p1: Point,
    p2: Point,
    p3: Point,
    p4: Point
  ): { t: number; point: Point } | null => {
    const s1x = p2.x - p1.x;
    const s1y = p2.y - p1.y;
    const s2x = p4.x - p3.x;
    const s2y = p4.y - p3.y;
    const denom = -s2x * s1y + s1x * s2y;
    if (Math.abs(denom) < 1e-6) return null;
    const s = (-s1y * (p1.x - p3.x) + s1x * (p1.y - p3.y)) / denom;
    const t = (s2x * (p1.y - p3.y) - s2y * (p1.x - p3.x)) / denom;
    if (s >= 0 && s <= 1 && t >= 0 && t <= 1) {
      return { t, point: { x: p1.x + t * s1x, y: p1.y + t * s1y } };
    }
    return null;
  };

  const getPointAt = (pts: Point[], t: number): Point => {
    const segs = pts.length - 1;
    const idx = Math.min(Math.floor(t * segs), segs - 1);
    const localT = t * segs - idx;
    const a = pts[idx];
    const b = pts[idx + 1];
    return { x: a.x + (b.x - a.x) * localT, y: a.y + (b.y - a.y) * localT };
  };

  return paths.flatMap(p => {
    if (!('points' in p) || p.points.length < 2) return [p];
    const pts = p.points;
    const first = pts[0];
    const last = pts[pts.length - 1];
    if (first.x === last.x && first.y === last.y) return [p];

    const segs = pts.length - 1;
    const others = paths.filter(op => op.id !== p.id && 'points' in op) as BrushPathData[];
    const otherInts: { t: number; point: Point }[] = [];
    for (let i = 0; i < segs; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      for (const op of others) {
        for (let j = 0; j < op.points.length - 1; j++) {
          const oInt = intersectAt(a, b, op.points[j], op.points[j + 1]);
          if (oInt) otherInts.push({ t: (i + oInt.t) / segs, point: oInt.point });
        }
      }
    }

    const cutInts: { t: number; point: Point }[] = [];
    for (let i = 0; i < segs; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      for (const c of cutterSegments) {
        const cInt = intersectAt(a, b, c.a, c.b);
        if (cInt) cutInts.push({ t: (i + cInt.t) / segs, point: cInt.point });
      }
    }

    if (cutInts.length === 0) return [p];

    let startT = 0;
    let endT = 1;

    for (const c of cutInts) {
      if (c.t <= 0.5) {
        const after = otherInts
          .filter(o => o.t > c.t)
          .sort((a, b) => a.t - b.t)[0] || c;
        startT = Math.max(startT, after.t);
      } else {
        const before = otherInts
          .filter(o => o.t < c.t)
          .sort((a, b) => b.t - a.t)[0] || c;
        endT = Math.min(endT, before.t);
      }
    }

    if (startT >= endT) return [];

    const startPt = getPointAt(pts, startT);
    const endPt = getPointAt(pts, endT);
    const startIdx = Math.floor(startT * segs);
    const endIdx = Math.ceil(endT * segs);
    const newPoints = [startPt, ...pts.slice(startIdx + 1, endIdx), endPt];
    return [{ ...p, points: newPoints }];
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