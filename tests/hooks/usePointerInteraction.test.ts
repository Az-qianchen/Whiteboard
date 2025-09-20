// usePointerInteraction Hook Alt 快捷键相关逻辑测试
import type React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { usePointerInteraction } from '@/hooks/usePointerInteraction';

const createHandlers = () => ({
  onPointerDown: vi.fn(),
  onPointerMove: vi.fn(),
  onPointerUp: vi.fn(),
  onPointerLeave: vi.fn(),
});

const createViewTransform = () => ({
  isPanning: false,
  setIsPanning: vi.fn(),
  handlePanMove: vi.fn(),
  handleTouchStart: vi.fn(),
  handleTouchMove: vi.fn(),
  handleTouchEnd: vi.fn(),
  isPinching: false,
});

const createPointerEvent = (overrides: Partial<{ altKey: boolean; button: number; pointerType: string }> = {}) => {
  const target = {
    setPointerCapture: vi.fn(),
    hasPointerCapture: vi.fn().mockReturnValue(false),
    releasePointerCapture: vi.fn(),
  };

  const event = {
    pointerId: 42,
    pointerType: 'mouse',
    button: 0,
    altKey: false,
    currentTarget: target as unknown as SVGSVGElement,
    preventDefault: vi.fn(),
    ...overrides,
  } as unknown as React.PointerEvent<SVGSVGElement>;

  return { event, target };
};

describe('usePointerInteraction', () => {
  it('调用 Alt 取色处理器并阻止后续绘制逻辑', () => {
    const viewTransform = createViewTransform();
    const drawingInteraction = createHandlers();
    const selectionInteraction = createHandlers();
    const handleAltColorPick = vi.fn().mockReturnValue(true);

    const { result } = renderHook(() =>
      usePointerInteraction({
        tool: 'brush',
        viewTransform,
        drawingInteraction,
        selectionInteraction,
        handleAltColorPick,
      })
    );

    const { event } = createPointerEvent({ altKey: true });
    result.current.onPointerDown(event);

    expect(handleAltColorPick).toHaveBeenCalledTimes(1);
    expect(viewTransform.setIsPanning).not.toHaveBeenCalled();
    expect(drawingInteraction.onPointerDown).not.toHaveBeenCalled();
  });

  it('Alt 取色未处理时回退到画布平移', () => {
    const viewTransform = createViewTransform();
    const drawingInteraction = createHandlers();
    const selectionInteraction = createHandlers();
    const handleAltColorPick = vi.fn().mockReturnValue(false);

    const { result } = renderHook(() =>
      usePointerInteraction({
        tool: 'brush',
        viewTransform,
        drawingInteraction,
        selectionInteraction,
        handleAltColorPick,
      })
    );

    const { event, target } = createPointerEvent({ altKey: true });
    result.current.onPointerDown(event);

    expect(handleAltColorPick).toHaveBeenCalledTimes(1);
    expect(target.setPointerCapture).toHaveBeenCalledWith(event.pointerId);
    expect(viewTransform.setIsPanning).toHaveBeenCalledWith(true);
  });

  it('选择工具下忽略 Alt 取色回调', () => {
    const viewTransform = createViewTransform();
    const drawingInteraction = createHandlers();
    const selectionInteraction = createHandlers();
    const handleAltColorPick = vi.fn();

    const { result } = renderHook(() =>
      usePointerInteraction({
        tool: 'selection',
        viewTransform,
        drawingInteraction,
        selectionInteraction,
        handleAltColorPick,
      })
    );

    const { event } = createPointerEvent({ altKey: true });
    result.current.onPointerDown(event);

    expect(handleAltColorPick).not.toHaveBeenCalled();
    expect(selectionInteraction.onPointerDown).toHaveBeenCalledTimes(1);
  });
});
