/**
 * 管理画布视图变换的状态存储，提供缩放、平移与触摸手势处理
 */
import { create } from 'zustand';
import type { Point } from '@/types';
import { getPointerPosition as getPointerPositionUtil } from '@/lib/utils';

type ViewTransform = { scale: number; translateX: number; translateY: number };

const isMacPlatform = (): boolean => {
  if (typeof navigator === 'undefined') {
    return false;
  }
  const platform = navigator.userAgentData?.platform ?? navigator.platform ?? '';
  return /Mac|iPhone|iPad|iPod/i.test(platform);
};

export interface ViewTransformState {
  viewTransform: ViewTransform;
  isPanning: boolean;
  // Indicates whether a two-finger pinch gesture is active
  isPinching: boolean;
  // Active touch points indexed by pointerId
  touchPoints: Map<number, Point>;
  // Stored data for the current pinch gesture
  initialPinch: {
    distance: number;
    midpoint: Point;
    scale: number;
  } | null;
  lastPointerPosition: Point | null;
  pendingFitToContent: boolean;

  setIsPanning: (v: boolean) => void;
  setViewTransform: (updater: (prev: ViewTransform) => ViewTransform) => void;
  setLastPointerPosition: (p: Point | null) => void;
  requestFitToContent: () => void;
  consumeFitToContent: () => void;

  handleWheel: (e: WheelEvent) => void;
  handlePanMove: (e: React.PointerEvent<SVGSVGElement>) => void;
  handleTouchStart: (e: React.PointerEvent<SVGSVGElement>) => boolean;
  handleTouchMove: (e: React.PointerEvent<SVGSVGElement>) => boolean;
  handleTouchEnd: (e: React.PointerEvent<SVGSVGElement>) => boolean;
  getPointerPosition: (e: { clientX: number; clientY: number }, svg: SVGSVGElement) => Point;
}

export const useViewTransformStore = create<ViewTransformState>((set, get) => ({
  viewTransform: { scale: 1, translateX: 0, translateY: 0 },
  isPanning: false,
  isPinching: false,
  touchPoints: new Map(),
  initialPinch: null,
  lastPointerPosition: null,
  pendingFitToContent: false,

  // 设置是否处于平移状态
  setIsPanning: (v) => set({ isPanning: v }),
  // 更新视图变换
  setViewTransform: (updater) => set((s) => ({ viewTransform: updater(s.viewTransform) })),
  // 记录最后一次指针位置
  setLastPointerPosition: (p) => set({ lastPointerPosition: p }),
  requestFitToContent: () => set({ pendingFitToContent: true }),
  consumeFitToContent: () => set({ pendingFitToContent: false }),

  // 处理滚轮缩放和平移
  handleWheel: (e) => {
    // 阻止浏览器默认缩放行为，避免在 Mac 上触发页面缩放
    e.preventDefault();
    const { deltaX, deltaY, deltaMode, ctrlKey, clientX, clientY } = e as any;
    const { viewTransform } = get();

    if (ctrlKey) {
      const { scale, translateX, translateY } = viewTransform;
      // 将滚轮缩放步长调小以降低缩放速度；Mac 触控板捏合需要翻倍以保持流畅
      const baseZoomStep = 0.001;
      const isMacTrackpadGesture = deltaMode === 0 && isMacPlatform();
      const zoomStep = isMacTrackpadGesture ? baseZoomStep * 4 : baseZoomStep;
      const newScale = Math.max(0.1, Math.min(10, scale - deltaY * zoomStep));
      if (Math.abs(scale - newScale) < 1e-9) return;

      const svg = (e.currentTarget as HTMLDivElement).querySelector('svg');
      if (!svg) return;
      const point = (svg as any).createSVGPoint();
      point.x = clientX;
      point.y = clientY;
      const ctm = (svg as any).getScreenCTM();
      if (!ctm) return;
      const svgPoint = point.matrixTransform(ctm.inverse());

      const newTranslateX = svgPoint.x - (svgPoint.x - translateX) * (newScale / scale);
      const newTranslateY = svgPoint.y - (svgPoint.y - translateY) * (newScale / scale);

      set({ viewTransform: { scale: newScale, translateX: newTranslateX, translateY: newTranslateY } });
    } else {
      set((s) => ({
        viewTransform: {
          ...s.viewTransform,
          translateX: s.viewTransform.translateX - deltaX,
          translateY: s.viewTransform.translateY - deltaY,
        },
      }));
    }
  },

  // 处理平移移动
  handlePanMove: (e) => {
    const { isPanning } = get();
    if (!isPanning) return;
    const movementX = (e as any).movementX ?? 0;
    const movementY = (e as any).movementY ?? 0;
    set((s) => ({
      viewTransform: {
        ...s.viewTransform,
        translateX: s.viewTransform.translateX + movementX,
        translateY: s.viewTransform.translateY + movementY,
      },
    }));
  },

  // 处理触摸开始
  handleTouchStart: (e) => {
    const { pointerId, clientX, clientY } = e;
    const svg = e.currentTarget;
    let pinchActive = false;
    set((s) => {
      const pts = new Map(s.touchPoints);
      pts.set(pointerId, { x: clientX, y: clientY });
      if (pts.size === 2) {
        const values = [...pts.values()];
        const dist = Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y);
        const mid = {
          x: (values[0].x + values[1].x) / 2,
          y: (values[0].y + values[1].y) / 2,
        };
        const point = svg.createSVGPoint();
        point.x = mid.x;
        point.y = mid.y;
        const ctm = svg.getScreenCTM();
        let midpoint: Point = { x: mid.x, y: mid.y };
        if (ctm) {
          const svgPoint = point.matrixTransform(ctm.inverse());
          midpoint = { x: svgPoint.x, y: svgPoint.y };
        }
        pinchActive = true;
        return {
          touchPoints: pts,
          isPinching: true,
          initialPinch: {
            distance: dist,
            midpoint,
            scale: s.viewTransform.scale,
          },
        };
      }
      pinchActive = s.isPinching;
      return { touchPoints: pts };
    });
    return pinchActive;
  },

  // 处理触摸移动
  handleTouchMove: (e) => {
    const { pointerId, clientX, clientY } = e;
    const svg = e.currentTarget;
    let pinchActive = false;
    set((s) => {
      if (!s.touchPoints.has(pointerId)) return {};
      const pts = new Map(s.touchPoints);
      pts.set(pointerId, { x: clientX, y: clientY });
      if (s.isPinching && s.initialPinch && pts.size >= 2) {
        const values = [...pts.values()].slice(0, 2);
        const dist = Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y);
        const midScreen = {
          x: (values[0].x + values[1].x) / 2,
          y: (values[0].y + values[1].y) / 2,
        };
        const rawFactor = dist / s.initialPinch.distance;
        // 提高捏合缩放灵敏度，放大缩放因子
        const scaleFactor = 1 + (rawFactor - 1) * 3;
        let newScale = s.initialPinch.scale * scaleFactor;
        newScale = Math.max(0.1, Math.min(10, newScale));
        const point = svg.createSVGPoint();
        point.x = midScreen.x;
        point.y = midScreen.y;
        const ctm = svg.getScreenCTM();
        let translateX = s.viewTransform.translateX;
        let translateY = s.viewTransform.translateY;
        if (ctm) {
          const svgPoint = point.matrixTransform(ctm.inverse());
          translateX = svgPoint.x - s.initialPinch.midpoint.x * newScale;
          translateY = svgPoint.y - s.initialPinch.midpoint.y * newScale;
        } else {
          translateX = midScreen.x - s.initialPinch.midpoint.x * newScale;
          translateY = midScreen.y - s.initialPinch.midpoint.y * newScale;
        }
        pinchActive = true;
        return {
          touchPoints: pts,
          viewTransform: { scale: newScale, translateX, translateY },
        };
      }
      pinchActive = s.isPinching;
      return { touchPoints: pts };
    });
    return pinchActive;
  },

  // 处理触摸结束
  handleTouchEnd: (e) => {
    const { pointerId } = e;
    let pinchActive = false;
    set((s) => {
      const pts = new Map(s.touchPoints);
      pts.delete(pointerId);
      if (pts.size < 2) {
        pinchActive = false;
        return { touchPoints: pts, isPinching: false, initialPinch: null };
      }
      pinchActive = true;
      return { touchPoints: pts };
    });
    return pinchActive;
  },

  // 获取指针在 SVG 中的位置
  getPointerPosition: (e, svg) => {
    const { viewTransform } = get();
    const point = getPointerPositionUtil(e, svg, viewTransform);
    return point;
  },
}));
