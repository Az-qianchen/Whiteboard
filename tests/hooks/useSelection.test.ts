// useSelection 钩子交互逻辑测试
import { renderHook, act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSelection } from '@/hooks/useSelection';
import type { Dispatch, SetStateAction } from 'react';
import type {
  AnyPath,
  BBox,
  RectangleData,
  SelectionPathState,
  SelectionToolbarState,
  SelectionViewTransform,
} from '@/types';

const selectionLogicMocks = vi.hoisted(() => ({
  handlePointerDownLogic: vi.fn(),
  handlePointerMoveLogic: vi.fn(),
  handlePointerUpLogic: vi.fn(),
}));

vi.mock('@/hooks/selection-logic/index', () => selectionLogicMocks);

const { handlePointerDownLogic, handlePointerMoveLogic, handlePointerUpLogic } = selectionLogicMocks;

type HookProps = {
  pathState: SelectionPathState;
  toolbarState: SelectionToolbarState;
  viewTransform: SelectionViewTransform;
  isGridVisible: boolean;
  gridSize: number;
  gridSubdivisions: number;
  onDoubleClick: (path: AnyPath) => void;
  croppingState: { pathId: string; originalPath: AnyPath } | null;
  currentCropRect: BBox | null;
  setCurrentCropRect: Dispatch<SetStateAction<BBox | null>>;
  pushCropHistory: (rect: BBox) => void;
};

describe('useSelection', () => {
  const baseShapeProps = {
    id: 'rect-1',
    tool: 'rectangle' as const,
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
  } satisfies RectangleData;

  let currentPaths: AnyPath[];
  let selectedPathIds: string[];
  let currentCropRect: BBox | null;
  const beginCoalescing = vi.fn();
  const endCoalescing = vi.fn();
  const onDoubleClick = vi.fn();
  const pushCropHistory = vi.fn();
  const getPointerPosition = vi.fn(
    (event: { clientX: number; clientY: number }) => ({ x: event.clientX + 1, y: event.clientY + 2 })
  );
  const setPaths: Dispatch<SetStateAction<AnyPath[]>> = updater => {
    currentPaths = typeof updater === 'function' ? (updater as (prev: AnyPath[]) => AnyPath[])(currentPaths) : updater;
  };
  const setSelectedPathIds: Dispatch<SetStateAction<string[]>> = updater => {
    selectedPathIds = typeof updater === 'function' ? (updater as (prev: string[]) => string[])(selectedPathIds) : updater;
  };
  const setCurrentCropRect: Dispatch<SetStateAction<BBox | null>> = updater => {
    currentCropRect = typeof updater === 'function'
      ? (updater as (prev: BBox | null) => BBox | null)(currentCropRect)
      : updater;
  };

  const createPathState = (): SelectionPathState => ({
    paths: currentPaths,
    setPaths,
    selectedPathIds,
    setSelectedPathIds,
    beginCoalescing,
    endCoalescing,
  });

  const createToolbarState = (): SelectionToolbarState => ({
    selectionMode: 'move',
  });

  const createViewTransform = (): SelectionViewTransform => ({
    viewTransform: { scale: 1, translateX: 0, translateY: 0 },
    getPointerPosition,
  });

  const createProps = (): HookProps => ({
    pathState: createPathState(),
    toolbarState: createToolbarState(),
    viewTransform: createViewTransform(),
    isGridVisible: true,
    gridSize: 10,
    gridSubdivisions: 2,
    onDoubleClick,
    croppingState: null,
    currentCropRect,
    setCurrentCropRect,
    pushCropHistory,
  });

  beforeEach(() => {
    currentPaths = [structuredClone(baseShapeProps)];
    selectedPathIds = ['rect-1'];
    currentCropRect = null;
    getPointerPosition.mockClear();
    beginCoalescing.mockClear();
    endCoalescing.mockClear();
    onDoubleClick.mockClear();
    pushCropHistory.mockClear();
    handlePointerDownLogic.mockReset();
    handlePointerMoveLogic.mockReset();
    handlePointerUpLogic.mockReset();
  });

  it('captures the pointer and delegates pointer down events to the logic layer', () => {
    const { result } = renderHook((props: HookProps) => useSelection(props), { initialProps: createProps() });

    handlePointerDownLogic.mockImplementation(({ setDragState }) => {
      setDragState({
        type: 'move',
        pathIds: ['rect-1'],
        originalPaths: currentPaths,
        initialPointerPos: { x: 0, y: 0 },
        initialSelectionBbox: { x: 0, y: 0, width: 0, height: 0 },
      });
    });

    const setPointerCapture = vi.fn();
    const event = {
      pointerId: 7,
      clientX: 15,
      clientY: 25,
      currentTarget: {
        setPointerCapture,
      },
    } as unknown as React.PointerEvent<SVGSVGElement>;

    act(() => {
      result.current.onPointerDown(event);
    });

    expect(setPointerCapture).toHaveBeenCalledWith(7);
    expect(getPointerPosition).toHaveBeenCalledWith(event, event.currentTarget);
    expect(handlePointerDownLogic).toHaveBeenCalledWith(
      expect.objectContaining({
        e: event,
        point: { x: 16, y: 27 },
        pathState: expect.objectContaining({ paths: currentPaths }),
      })
    );
    expect(result.current.dragState?.type).toBe('move');
  });

  it('provides snapToGrid helper and updates hover state during pointer move', () => {
    const { result, rerender } = renderHook((props: HookProps) => useSelection(props), { initialProps: createProps() });

    let snapped: { x: number; y: number } | null = null;
    handlePointerMoveLogic.mockImplementation(({ snapToGrid, setIsHoveringMovable, setIsHoveringEditable }) => {
      setIsHoveringMovable(true);
      setIsHoveringEditable(true);
      snapped = snapToGrid({ x: 12, y: 13 });
    });

    const moveEvent = {
      pointerId: 11,
      currentTarget: {},
    } as unknown as React.PointerEvent<SVGSVGElement>;

    act(() => {
      result.current.onPointerMove(moveEvent);
    });

    expect(snapped).toEqual({ x: 10, y: 15 });
    expect(result.current.isHoveringMovable).toBe(true);
    expect(result.current.isHoveringEditable).toBe(true);

    const pointerEvent = {
      pointerId: 11,
      currentTarget: {
        hasPointerCapture: vi.fn(() => true),
        releasePointerCapture: vi.fn(),
      },
    } as unknown as React.PointerEvent<SVGSVGElement>;

    act(() => {
      result.current.onPointerUp(pointerEvent);
    });

    expect(handlePointerUpLogic).toHaveBeenCalled();
    expect(result.current.isHoveringMovable).toBe(false);
    expect(result.current.isHoveringEditable).toBe(false);

    rerender(createProps());
  });

  it('clears stale drag state when referenced paths are removed', async () => {
    const { result, rerender } = renderHook((props: HookProps) => useSelection(props), { initialProps: createProps() });

    handlePointerDownLogic.mockImplementation(({ setDragState }) => {
      setDragState({
        type: 'move',
        pathIds: ['rect-1'],
        originalPaths: currentPaths,
        initialPointerPos: { x: 0, y: 0 },
        initialSelectionBbox: { x: 0, y: 0, width: 0, height: 0 },
      });
    });

    const event = {
      pointerId: 1,
      clientX: 5,
      clientY: 6,
      currentTarget: {
        setPointerCapture: vi.fn(),
      },
    } as unknown as React.PointerEvent<SVGSVGElement>;

    act(() => {
      result.current.onPointerDown(event);
    });

    expect(result.current.dragState?.type).toBe('move');

    currentPaths = [];
    rerender(createProps());

    await waitFor(() => {
      expect(result.current.dragState).toBeNull();
    });
  });
});
