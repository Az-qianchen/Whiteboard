import { create } from 'zustand';
import type { Point } from '@/types';
import { getPointerPosition as getPointerPositionUtil } from '@/lib/utils';

type ViewTransform = { scale: number; translateX: number; translateY: number };

export interface ViewTransformState {
  viewTransform: ViewTransform;
  isPanning: boolean;
  lastPointerPosition: Point | null;

  setIsPanning: (v: boolean) => void;
  setViewTransform: (updater: (prev: ViewTransform) => ViewTransform) => void;

  handleWheel: (e: React.WheelEvent<HTMLDivElement>) => void;
  handlePanMove: (e: React.PointerEvent<SVGSVGElement>) => void;
  getPointerPosition: (e: { clientX: number; clientY: number }, svg: SVGSVGElement) => Point;
}

export const useViewTransformStore = create<ViewTransformState>((set, get) => ({
  viewTransform: { scale: 1, translateX: 0, translateY: 0 },
  isPanning: false,
  lastPointerPosition: null,

  setIsPanning: (v) => set({ isPanning: v }),
  setViewTransform: (updater) => set((s) => ({ viewTransform: updater(s.viewTransform) })),

  handleWheel: (e) => {
    const { deltaX, deltaY, ctrlKey, clientX, clientY } = e as any;
    const { viewTransform } = get();

    if (ctrlKey || Math.abs(deltaX) < Math.abs(deltaY)) {
      const { scale, translateX, translateY } = viewTransform;
      const zoomStep = 0.001;
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

  getPointerPosition: (e, svg) => {
    const { viewTransform } = get();
    const point = getPointerPositionUtil(e, svg, viewTransform);
    set({ lastPointerPosition: point });
    return point;
  },
}));
