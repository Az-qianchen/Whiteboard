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

// 切刀逻辑：按光标轨迹剪去被划过的路径段
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

    // 先判断路径是否与切刀相交，未命中则直接返回原路径
    let pathHit = false;
    for (let i = 0; i < segs && !pathHit; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      for (const c of cutterSegments) {
        if (intersectAt(a, b, c.a, c.b)) { pathHit = true; break; }
      }
    }
    if (!pathHit) return [p];

    // === 1. 计算与其它路径的交点作为拆分边界 ===
    const others = paths.filter(op => op.id !== p.id && 'points' in op) as BrushPathData[];
    const tVals = new Set<number>([0, 1]);
    for (let i = 1; i < segs; i++) tVals.add(i / segs); // 现有节点
    for (let i = 0; i < segs; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      for (const op of others) {
        for (let j = 0; j < op.points.length - 1; j++) {
          const hit = intersectAt(a, b, op.points[j], op.points[j + 1]);
          if (hit) tVals.add((i + hit.t) / segs);
        }
      }
    }

    const sorted = Array.from(tVals).sort((a, b) => a - b);

    // === 2. 按边界将路径拆分为多个段 ===
    const segments: Point[][] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      const startT = sorted[i];
      const endT = sorted[i + 1];
      const startPt = getPointAt(pts, startT);
      const endPt = getPointAt(pts, endT);
      const startIdx = Math.floor(startT * segs);
      const endIdx = Math.ceil(endT * segs);
      segments.push([startPt, ...pts.slice(startIdx + 1, endIdx), endPt]);
    }

    // === 3. 删除与切刀相交的段并合并剩余段 ===
    const rebuilt: Point[][] = [];
    let current: Point[] = [];
    for (const segPts of segments) {
      let hit = false;
      for (let i = 0; i < segPts.length - 1 && !hit; i++) {
        const a = segPts[i];
        const b = segPts[i + 1];
        for (const c of cutterSegments) {
          if (intersectAt(a, b, c.a, c.b)) {
            hit = true;
            break;
          }
        }
      }
      if (hit) {
        if (current.length > 1) rebuilt.push(current);
        current = [];
      } else {
        if (current.length === 0) current = [...segPts];
        else current.push(...segPts.slice(1));
      }
    }
    if (current.length > 1) rebuilt.push(current);

    if (rebuilt.length === 0) return [];

    // === 4. 将剩余段落重建为路径 ===
    return rebuilt.map((ptsSeg, idx) => ({
      ...p,
      id: idx === 0 ? p.id : crypto.randomUUID(),
      points: ptsSeg,
    }));
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