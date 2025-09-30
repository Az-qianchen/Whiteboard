// handlePointerMoveLogic 轴向锁定行为测试
import type { MutableRefObject, Dispatch, SetStateAction, PointerEvent as ReactPointerEvent } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { handlePointerMoveLogic } from '@/hooks/selection-logic/pointerMove';
import * as DrawingLib from '@/lib/drawing';
import type {
  AnyPath,
  DragState,
  RectangleData,
  SelectionPathState,
  SelectionToolbarState,
  SelectionViewTransform,
} from '@/types';

const createRectangle = (): RectangleData => ({
  id: 'rect-1',
  tool: 'rectangle',
  x: 0,
  y: 0,
  width: 120,
  height: 80,
  rotation: 0,
  color: '#000000',
  fill: 'transparent',
  fillStyle: 'hachure',
  strokeWidth: 2,
  roughness: 0,
  bowing: 0,
  fillWeight: 0,
  hachureAngle: 0,
  hachureGap: 0,
  curveTightness: 0,
  curveStepCount: 0,
});

const createPathState = (
  paths: AnyPath[],
  setPaths: Dispatch<SetStateAction<AnyPath[]>>
): SelectionPathState => ({
  paths,
  setPaths,
  selectedPathIds: ['rect-1'],
  setSelectedPathIds: vi.fn(),
  beginCoalescing: vi.fn(),
  endCoalescing: vi.fn(),
});

const toolbarState: SelectionToolbarState = { selectionMode: 'move' };
const viewTransform: SelectionViewTransform = {
  viewTransform: { scale: 1, translateX: 0, translateY: 0 },
  getPointerPosition: vi.fn(),
};
const noop = vi.fn();
const snapToGrid = (point: { x: number; y: number }) => point;
const isClosingPath = { current: null } as MutableRefObject<{ pathId: string; anchorIndex: number } | null>;

const createMoveDragState = (paths: AnyPath[]): DragState => ({
  type: 'move',
  pathIds: ['rect-1'],
  originalPaths: paths,
  initialPointerPos: { x: 0, y: 0 },
  initialSelectionBbox: { x: 0, y: 0, width: 120, height: 80 },
  axisLock: null,
});

describe('handlePointerMoveLogic axis locking', () => {
  it('locks movement to the dominant axis when Shift is held', () => {
    let currentPaths: AnyPath[] = [createRectangle()];
    let latestDragState: DragState = createMoveDragState(currentPaths);
    let updatedPaths: AnyPath[] | null = null;

    const setPaths: Dispatch<SetStateAction<AnyPath[]>> = updater => {
      updatedPaths = typeof updater === 'function'
        ? (updater as (prev: AnyPath[]) => AnyPath[])(currentPaths)
        : updater;
      currentPaths = updatedPaths;
    };
    const setDragState: Dispatch<SetStateAction<DragState>> = updater => {
      latestDragState = typeof updater === 'function'
        ? (updater as (prev: DragState) => DragState)(latestDragState)
        : updater;
    };

    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      callback(0);
      return 1;
    });

    handlePointerMoveLogic({
      e: { shiftKey: true } as ReactPointerEvent<SVGSVGElement>,
      movePoint: { x: 40, y: 12 },
      dragState: latestDragState,
      setDragState,
      marquee: null,
      setMarquee: noop,
      lassoPath: null,
      setLassoPath: noop,
      pathState: createPathState(currentPaths, setPaths),
      toolbarState,
      viewTransform,
      setIsHoveringMovable: noop,
      setIsHoveringEditable: noop,
      isClosingPath,
      snapToGrid,
      setCurrentCropRect: noop,
    });

    rafSpy.mockRestore();

    expect(updatedPaths).not.toBeNull();
    const movedRect = updatedPaths![0] as RectangleData;
    expect(movedRect.x).toBe(40);
    expect(movedRect.y).toBe(0);
    expect(latestDragState && latestDragState.type === 'move' ? latestDragState.axisLock : null).toBe('x');
  });

  it('switches axis lock when movement favors the perpendicular direction', () => {
    let currentPaths: AnyPath[] = [createRectangle()];
    let latestDragState: DragState = createMoveDragState(currentPaths);

    const setPaths: Dispatch<SetStateAction<AnyPath[]>> = updater => {
      currentPaths = typeof updater === 'function'
        ? (updater as (prev: AnyPath[]) => AnyPath[])(currentPaths)
        : updater;
    };
    const setDragState: Dispatch<SetStateAction<DragState>> = updater => {
      latestDragState = typeof updater === 'function'
        ? (updater as (prev: DragState) => DragState)(latestDragState)
        : updater;
    };

    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      callback(0);
      return 1;
    });
    const movePathSpy = vi.spyOn(DrawingLib, 'movePath');

    handlePointerMoveLogic({
      e: { shiftKey: true } as ReactPointerEvent<SVGSVGElement>,
      movePoint: { x: 50, y: 10 },
      dragState: latestDragState,
      setDragState,
      marquee: null,
      setMarquee: noop,
      lassoPath: null,
      setLassoPath: noop,
      pathState: createPathState(currentPaths, setPaths),
      toolbarState,
      viewTransform,
      setIsHoveringMovable: noop,
      setIsHoveringEditable: noop,
      isClosingPath,
      snapToGrid,
      setCurrentCropRect: noop,
    });

    expect(latestDragState && latestDragState.type === 'move' ? latestDragState.axisLock : null).toBe('x');

    movePathSpy.mockClear();

    handlePointerMoveLogic({
      e: { shiftKey: true } as ReactPointerEvent<SVGSVGElement>,
      movePoint: { x: 5, y: 60 },
      dragState: latestDragState,
      setDragState,
      marquee: null,
      setMarquee: noop,
      lassoPath: null,
      setLassoPath: noop,
      pathState: createPathState(currentPaths, setPaths),
      toolbarState,
      viewTransform,
      setIsHoveringMovable: noop,
      setIsHoveringEditable: noop,
      isClosingPath,
      snapToGrid,
      setCurrentCropRect: noop,
    });

    rafSpy.mockRestore();
    expect(latestDragState && latestDragState.type === 'move' ? latestDragState.axisLock : null).toBe('y');
    expect(movePathSpy).toHaveBeenCalledTimes(1);
    const lastCall = movePathSpy.mock.calls[0];
    expect(lastCall?.[1]).toBe(0);
    expect(lastCall?.[2]).toBe(60);
    movePathSpy.mockRestore();
  });
});

describe('handlePointerMoveLogic grid snapping tolerance', () => {
  const snappingFn = (point: { x: number; y: number }) => ({
    x: Math.round(point.x / 10) * 10,
    y: Math.round(point.y / 10) * 10,
  });

  it('keeps resize handles stable until pointer crosses snap cell boundary', () => {
    const baseRect = { ...createRectangle(), x: 3, y: 0, width: 50, height: 40 };
    let currentPaths: AnyPath[] = [baseRect];
    const initialPointerPos = { x: baseRect.x, y: baseRect.y + baseRect.height / 2 };
    const dragState: DragState = {
      type: 'resize',
      pathId: baseRect.id,
      handle: 'left',
      originalPath: baseRect,
      initialPointerPos,
    };

    const setPaths: Dispatch<SetStateAction<AnyPath[]>> = updater => {
      currentPaths = typeof updater === 'function'
        ? (updater as (prev: AnyPath[]) => AnyPath[])(currentPaths)
        : updater;
    };

    handlePointerMoveLogic({
      e: { shiftKey: false } as ReactPointerEvent<SVGSVGElement>,
      movePoint: { ...initialPointerPos },
      dragState,
      setDragState: noop,
      marquee: null,
      setMarquee: noop,
      lassoPath: null,
      setLassoPath: noop,
      pathState: createPathState(currentPaths, setPaths),
      toolbarState,
      viewTransform,
      setIsHoveringMovable: noop,
      setIsHoveringEditable: noop,
      isClosingPath,
      snapToGrid: snappingFn,
      setCurrentCropRect: noop,
    });

    const resizedRect = currentPaths[0] as RectangleData;
    expect(resizedRect.x).toBe(baseRect.x);
    expect(resizedRect.width).toBe(baseRect.width);
  });

  it('snaps moved selections once the pointer actually shifts position', () => {
    const baseRect = { ...createRectangle(), x: 3, y: 6, width: 50, height: 40 };
    let currentPaths: AnyPath[] = [baseRect];
    let dragState: DragState = {
      type: 'move',
      pathIds: ['rect-1'],
      originalPaths: [baseRect],
      initialPointerPos: { x: 13, y: 26 },
      initialSelectionBbox: { x: baseRect.x, y: baseRect.y, width: baseRect.width, height: baseRect.height },
      axisLock: null,
    };

    const setPaths: Dispatch<SetStateAction<AnyPath[]>> = updater => {
      currentPaths = typeof updater === 'function'
        ? (updater as (prev: AnyPath[]) => AnyPath[])(currentPaths)
        : updater;
    };

    const setDragState: Dispatch<SetStateAction<DragState>> = updater => {
      dragState = typeof updater === 'function'
        ? (updater as (prev: DragState) => DragState)(dragState)
        : updater;
    };

    const movePathSpy = vi.spyOn(DrawingLib, 'movePath');
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      callback(0);
      return 1;
    });

    handlePointerMoveLogic({
      e: { shiftKey: false } as ReactPointerEvent<SVGSVGElement>,
      movePoint: { x: 12, y: 26 },
      dragState,
      setDragState,
      marquee: null,
      setMarquee: noop,
      lassoPath: null,
      setLassoPath: noop,
      pathState: createPathState(currentPaths, setPaths),
      toolbarState,
      viewTransform,
      setIsHoveringMovable: noop,
      setIsHoveringEditable: noop,
      isClosingPath,
      snapToGrid: snappingFn,
      setCurrentCropRect: noop,
    });

    expect(movePathSpy).toHaveBeenCalled();
    const lastCall = movePathSpy.mock.calls.at(-1);
    expect(lastCall?.[1]).toBe(-3);
    expect(lastCall?.[2]).toBe(0);

    rafSpy.mockRestore();
    movePathSpy.mockRestore();

  });
});
