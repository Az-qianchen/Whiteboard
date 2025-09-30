// handlePointerDownLogic 网格吸附测试
import { describe, expect, it, vi } from 'vitest';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { handlePointerDownLogic } from '@/hooks/selection-logic/pointerDown';
import type {
  AnyPath,
  RectangleData,
  SelectionPathState,
  SelectionToolbarState,
  SelectionViewTransform,
  DragState,
  Point,
} from '@/types';

const createRectangle = (id: string): RectangleData => ({
  id,
  tool: 'rectangle',
  x: 0,
  y: 0,
  width: 100,
  height: 40,
  rotation: 0,
  color: '#000000',
  fill: 'transparent',
  fillStyle: 'hachure',
  strokeWidth: 1,
  roughness: 0,
  bowing: 0,
  fillWeight: 0,
  hachureAngle: 0,
  hachureGap: 0,
  curveTightness: 0,
  curveStepCount: 0,
});

const baseViewTransform: SelectionViewTransform = {
  viewTransform: { scale: 1, translateX: 0, translateY: 0 },
  getPointerPosition: vi.fn(),
};

const baseToolbarState: SelectionToolbarState = { selectionMode: 'move' };
const snap = (point: Point): Point => ({
  x: Math.round(point.x / 10) * 10,
  y: Math.round(point.y / 10) * 10,
});

const createPathState = (paths: AnyPath[]): SelectionPathState => ({
  paths,
  setPaths: vi.fn(),
  selectedPathIds: paths.map(p => p.id),
  setSelectedPathIds: vi.fn(),
  beginCoalescing: vi.fn(),
  endCoalescing: vi.fn(),
});

const sharedArgs = {
  setMarquee: vi.fn(),
  setLassoPath: vi.fn(),
  onDoubleClick: vi.fn(),
  lastClickRef: { current: { time: 0, pathId: null } },
  croppingState: null,
  currentCropRect: null,
  cropTool: 'crop' as const,
  onMagicWandSample: vi.fn(),
};

describe('handlePointerDownLogic grid snapping', () => {
  it('snaps the initial pointer for resize handles', () => {
    const rectangle = createRectangle('rect-1');
    const pathState = createPathState([rectangle]);
    const setDragState = vi.fn();

    const event = {
      button: 0,
      shiftKey: false,
      ctrlKey: false,
      metaKey: false,
      target: {
        dataset: {
          handle: 'right',
          pathId: 'rect-1',
        } as DOMStringMap,
      },
    } as unknown as ReactPointerEvent<SVGSVGElement>;

    handlePointerDownLogic({
      e: event,
      point: { x: 12.6, y: 18.4 },
      snapToGrid: snap,
      setDragState,
      pathState,
      toolbarState: baseToolbarState,
      viewTransform: baseViewTransform,
      ...sharedArgs,
    });

    expect(setDragState).toHaveBeenCalled();
    const [arg] = setDragState.mock.calls[0] ?? [];
    const dragState = (typeof arg === 'function' ? arg(null) : arg) as DragState;
    expect(dragState && dragState.type).toBe('resize');
    if (dragState && dragState.type === 'resize') {
      expect(dragState.initialPointerPos).toEqual({ x: 10, y: 20 });
    }
  });

  it('snaps the initial pointer for scale handles on groups', () => {
    const rectA = createRectangle('rect-1');
    const rectB = { ...createRectangle('rect-2'), x: 120 };
    const pathState = createPathState([rectA, rectB]);
    const setDragState = vi.fn();

    const event = {
      button: 0,
      shiftKey: false,
      ctrlKey: false,
      metaKey: false,
      target: {
        dataset: {
          handle: 'bottom-right',
          pathId: 'rect-1',
        } as DOMStringMap,
      },
    } as unknown as ReactPointerEvent<SVGSVGElement>;

    handlePointerDownLogic({
      e: event,
      point: { x: 199.2, y: 81.5 },
      snapToGrid: snap,
      setDragState,
      pathState,
      toolbarState: baseToolbarState,
      viewTransform: baseViewTransform,
      ...sharedArgs,
    });

    expect(setDragState).toHaveBeenCalled();
    const [arg] = setDragState.mock.calls[0] ?? [];
    const dragState = (typeof arg === 'function' ? arg(null) : arg) as DragState;
    expect(dragState && dragState.type).toBe('scale');
    if (dragState && dragState.type === 'scale') {
      expect(dragState.initialPointerPos).toEqual({ x: 200, y: 80 });
    }
  });
});
