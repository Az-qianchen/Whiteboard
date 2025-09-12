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
    if (!('points' in p) || p.points.length < 2 || p.isLocked) return [p];
    const pts = p.points;
    const segs = pts.length - 1;

    // 找到与其它路径的交点，用来作为裁剪的边界
    const others = paths.filter(op => op.id !== p.id && 'points' in op) as BrushPathData[];
    const boundaries = new Set<number>([0, 1]);
    for (let i = 0; i < segs; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      for (const op of others) {
        for (let j = 0; j < op.points.length - 1; j++) {
          const oInt = intersectAt(a, b, op.points[j], op.points[j + 1]);
          if (oInt) boundaries.add((i + oInt.t) / segs);
        }
      }
    }

    // 记录切刀与路径的所有交点
    const cutTs: number[] = [];
    for (let i = 0; i < segs; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      for (const c of cutterSegments) {
        const cInt = intersectAt(a, b, c.a, c.b);
        if (cInt) cutTs.push((i + cInt.t) / segs);
      }
    }
    if (cutTs.length === 0) return [p];

    const sortedBoundaries = Array.from(boundaries).sort((a, b) => a - b);

    // 根据每个切点确定要删除的区间
    const ranges: [number, number][] = [];
    for (const t of cutTs) {
      let start = 0;
      let end = 1;
      for (let i = 0; i < sortedBoundaries.length - 1; i++) {
        const a = sortedBoundaries[i];
        const b = sortedBoundaries[i + 1];
        if (t > a && t < b) {
          start = a;
          end = b;
          break;
        }
      }
      ranges.push([start, end]);
    }

    // 合并重叠删除区间
    ranges.sort((a, b) => a[0] - b[0]);
    const merged: [number, number][] = [];
    for (const r of ranges) {
      const last = merged[merged.length - 1];
      if (!last || r[0] > last[1]) merged.push([...r]);
      else last[1] = Math.max(last[1], r[1]);
    }

    // 计算需要保留的区间
    const keep: [number, number][] = [];
    let cursor = 0;
    for (const r of merged) {
      if (r[0] > cursor) keep.push([cursor, r[0]]);
      cursor = r[1];
    }
    if (cursor < 1) keep.push([cursor, 1]);
    if (keep.length === 0) return [];

    // 将保留区间转换为新的路径片段
    return keep.map((range, idx) => {
      const [startT, endT] = range;
      const startPt = getPointAt(pts, startT);
      const endPt = getPointAt(pts, endT);
      const startIdx = Math.floor(startT * segs);
      const endIdx = Math.ceil(endT * segs);
      const newPoints = [startPt, ...pts.slice(startIdx + 1, endIdx), endPt];
      return { ...p, id: idx === 0 ? p.id : crypto.randomUUID(), points: newPoints };
    });
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