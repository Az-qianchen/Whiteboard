// useDrawing 钩子文本绘制与编辑行为测试
import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDrawing } from '@/hooks/useDrawing';
import type { AnyPath } from '@/types';
import type React from 'react';

describe('useDrawing text creation', () => {
  let dateSpy: ReturnType<typeof vi.spyOn>;
  let storedPaths: AnyPath[];
  const beginCoalescing = vi.fn();
  const setEditingTextPathId = vi.fn();
  const setSelectedPathIds = vi.fn();
  const setTool = vi.fn();
  const getPointerPosition = vi.fn(() => ({ x: 10, y: 20 }));
  let measureTextSpy: ReturnType<typeof vi.spyOn> | undefined;

  const createHook = () => {
    storedPaths = [];

    const pathState = {
      setCurrentBrushPath: vi.fn(),
      currentBrushPath: null,
      finishBrushPath: vi.fn(),
      setCurrentPenPath: vi.fn(),
      currentPenPath: null,
      setCurrentLinePath: vi.fn(),
      currentLinePath: null,
      setPaths: vi.fn((updater) => {
        storedPaths = typeof updater === 'function' ? (updater as (prev: AnyPath[]) => AnyPath[])(storedPaths) : updater;
      }),
      beginCoalescing,
      setSelectedPathIds,
    };

    const toolbarState = {
      tool: 'text',
      setTool,
      color: '#000000',
      fill: 'transparent',
      fillGradient: null,
      fillStyle: 'solid',
      strokeWidth: 0,
      opacity: 1,
      strokeLineDash: undefined,
      strokeLineCapStart: 'round',
      strokeLineCapEnd: 'round',
      strokeLineJoin: 'miter',
      endpointSize: 1,
      endpointFill: 'hollow',
      isRough: false,
      roughness: 0,
      bowing: 0,
      fillWeight: 0,
      hachureAngle: 0,
      hachureGap: 0,
      curveTightness: 0,
      curveStepCount: 0,
      preserveVertices: false,
      disableMultiStroke: false,
      disableMultiStrokeFill: false,
      fontSize: 24,
      textAlign: 'left' as const,
      text: '',
      fontFamily: 'Excalifont',
    };

    const viewTransform = {
      getPointerPosition,
    };

    return renderHook(() => useDrawing({
      pathState,
      toolbarState,
      viewTransform,
      isGridVisible: false,
      gridSize: 10,
      gridSubdivisions: 1,
      setEditingTextPathId,
    }));
  };

  beforeEach(async () => {
    dateSpy = vi.spyOn(Date, 'now').mockReturnValue(123);
    const drawingModule = await import('@/lib/drawing');
    measureTextSpy = vi.spyOn(drawingModule, 'measureText').mockReturnValue({ width: 42, height: 18 });
    beginCoalescing.mockClear();
    setEditingTextPathId.mockClear();
    setSelectedPathIds.mockClear();
    setTool.mockClear();
    getPointerPosition.mockClear();
  });

  afterEach(() => {
    dateSpy.mockRestore();
    measureTextSpy?.mockRestore();
  });

  it('immediately enters editing mode after placing text', () => {
    const { result } = createHook();

    const setPointerCapture = vi.fn();
    const event = {
      pointerId: 1,
      currentTarget: { setPointerCapture },
      clientX: 10,
      clientY: 20,
    } as unknown as React.PointerEvent<SVGSVGElement>;

    act(() => {
      result.current.onPointerDown(event);
    });

    expect(setPointerCapture).toHaveBeenCalledWith(1);
    expect(setEditingTextPathId).toHaveBeenCalledWith('123');
    expect(beginCoalescing).toHaveBeenCalledTimes(1);
    expect(setSelectedPathIds).toHaveBeenCalledWith(['123']);
    expect(setTool).toHaveBeenCalledWith('selection');
    expect(getPointerPosition).toHaveBeenCalled();
    expect(measureTextSpy).toHaveBeenCalledWith('文本', 24, 'Excalifont');
    expect(storedPaths).toHaveLength(1);
    expect(storedPaths[0].id).toBe('123');
    expect(storedPaths[0].tool).toBe('text');
    expect(storedPaths[0]).toHaveProperty('text', '文本');
  });
});
