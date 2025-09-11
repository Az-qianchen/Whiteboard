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

interface SegmentIntersection {
  index: number;
  t: number;
  point: Point;
}

export const cutSelectedPaths = (lasso: Point[], paths: AnyPath[], selectedIds: string[]): AnyPath[] => {
  const cutterSegments: { a: Point; b: Point }[] = [];
  for (let i = 0; i < lasso.length - 1; i++) {
    cutterSegments.push({ a: lasso[i], b: lasso[i + 1] });
  }

  const getLineIntersection = (p1: Point, p2: Point, p3: Point, p4: Point): SegmentIntersection | null => {
    const s1x = p2.x - p1.x;
    const s1y = p2.y - p1.y;
    const s2x = p4.x - p3.x;
    const s2y = p4.y - p3.y;
    const denom = -s2x * s1y + s1x * s2y;
    if (Math.abs(denom) < 1e-6) return null;
    const s = (-s1y * (p1.x - p3.x) + s1x * (p1.y - p3.y)) / denom;
    const t = (s2x * (p1.y - p3.y) - s2y * (p1.x - p3.x)) / denom;
    if (s >= 0 && s <= 1 && t >= 0 && t <= 1) {
      return { index: -1, t, point: { x: p1.x + t * s1x, y: p1.y + t * s1y } };
    }
    return null;
  };

  return paths.flatMap(p => {
    if (!selectedIds.includes(p.id)) return [p];

    const pts = 'points' in p
      ? p.points
      : 'anchors' in p && p.anchors
        ? samplePath(p.anchors, 20, !!p.isClosed)
        : null;

    if (!pts || pts.length < 2) return [p];

    const intersections: SegmentIntersection[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      cutterSegments.forEach(seg => {
        const inter = getLineIntersection(a, b, seg.a, seg.b);
        if (inter) {
          inter.index = i;
          intersections.push(inter);
        }
      });
    }

    if (intersections.length < 2) return [p];

    intersections.sort((i1, i2) => (i1.index + i1.t) - (i2.index + i2.t));

    const segments: Point[][] = [];
    let keep = true;
    let current: Point[] = [pts[0]];

    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const segInter = intersections.filter(it => it.index === i).sort((a, b) => a.t - b.t);

      if (segInter.length === 0) {
        if (keep) current.push(b);
        continue;
      }

      segInter.forEach(inter => {
        if (keep) {
          current.push(inter.point);
          if (current.length > 1) segments.push(current);
        }
        keep = !keep;
        current = keep ? [inter.point] : [];
      });

      if (keep) current.push(b);
    }

    if (keep && current.length > 1) segments.push(current);

    return segments.map((segmentPts, idx) => {
      if ('points' in p) {
        return { ...p, id: `${p.id}-${idx}`, points: segmentPts } as BrushPathData;
      }
      if ('anchors' in p) {
        const anchors = segmentPts.map(pt => ({ point: pt, handleIn: pt, handleOut: pt }));
        return { ...p, id: `${p.id}-${idx}`, anchors, isClosed: false };
      }
      return p;
    });
  });
};

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
                setPaths((prev: AnyPath[]) => cutSelectedPaths(lassoPath, prev, selectedPathIds));
            }
            setLassoPath(null);
            endCoalescing();
        }
    }
};