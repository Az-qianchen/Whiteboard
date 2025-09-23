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
