// 测试 viewTransformStore 的触摸与滚轮缩放逻辑
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useViewTransformStore } from '@/context/viewTransformStore';

const createSvgMock = () => ({
  createSVGPoint: () => ({
    x: 0,
    y: 0,
    matrixTransform() {
      return { x: this.x, y: this.y };
    },
  }),
  getScreenCTM: () => ({ inverse: () => ({}) }),
});

beforeEach(() => {
  useViewTransformStore.setState({
    viewTransform: { scale: 1, translateX: 0, translateY: 0 },
    isPanning: false,
    isPinching: false,
    touchPoints: new Map(),
    initialPinch: null,
    lastPointerPosition: null,
  });
});

describe('useViewTransformStore pinch gestures', () => {
  it('starts pinch on second touch', () => {
    const svg = createSvgMock() as any;
    useViewTransformStore.getState().handleTouchStart({ pointerId: 1, clientX: 0, clientY: 0, currentTarget: svg } as any);
    useViewTransformStore.getState().handleTouchStart({ pointerId: 2, clientX: 10, clientY: 0, currentTarget: svg } as any);
    const state = useViewTransformStore.getState();
    expect(state.isPinching).toBe(true);
    expect(state.initialPinch?.distance).toBeCloseTo(10);
    expect(state.initialPinch?.midpoint).toEqual({ x: 5, y: 0 });
  });

  it('updates view transform during pinch move', () => {
    const svg = createSvgMock() as any;
    const store = useViewTransformStore.getState();
    store.handleTouchStart({ pointerId: 1, clientX: 0, clientY: 0, currentTarget: svg } as any);
    store.handleTouchStart({ pointerId: 2, clientX: 10, clientY: 0, currentTarget: svg } as any);
    store.handleTouchMove({ pointerId: 2, clientX: 20, clientY: 0 } as any);
    const vt = useViewTransformStore.getState().viewTransform;
    expect(vt.scale).toBeCloseTo(4);
    expect(vt.translateX).toBeCloseTo(-10);
    expect(vt.translateY).toBeCloseTo(0);
  });

  it('ends pinch when finger lifted', () => {
    const svg = createSvgMock() as any;
    const store = useViewTransformStore.getState();
    store.handleTouchStart({ pointerId: 1, clientX: 0, clientY: 0, currentTarget: svg } as any);
    store.handleTouchStart({ pointerId: 2, clientX: 10, clientY: 0, currentTarget: svg } as any);
    store.handleTouchEnd({ pointerId: 1 } as any);
    const state = useViewTransformStore.getState();
    expect(state.isPinching).toBe(false);
    expect(state.initialPinch).toBeNull();
    expect(state.touchPoints.size).toBe(1);
  });
});

describe('useViewTransformStore wheel zoom', () => {
  it('keeps mouse wheel zoom speed unchanged', () => {
    const svg = createSvgMock() as any;
    const container = { querySelector: vi.fn().mockReturnValue(svg) } as any;
    const event = {
      preventDefault: vi.fn(),
      deltaX: 0,
      deltaY: -120,
      deltaMode: 0,
      ctrlKey: true,
      clientX: 100,
      clientY: 80,
      currentTarget: container,
    } as unknown as WheelEvent;

    useViewTransformStore.getState().handleWheel(event);

    const vt = useViewTransformStore.getState().viewTransform;
    expect(vt.scale).toBeCloseTo(1.12);
  });

  it('doubles mac trackpad pinch zoom speed', () => {
    const svg = createSvgMock() as any;
    const container = { querySelector: vi.fn().mockReturnValue(svg) } as any;
    const event = {
      preventDefault: vi.fn(),
      deltaX: 5,
      deltaY: -10,
      deltaMode: 0,
      ctrlKey: true,
      clientX: 120,
      clientY: 90,
      currentTarget: container,
    } as unknown as WheelEvent;

    useViewTransformStore.getState().handleWheel(event);

    const vt = useViewTransformStore.getState().viewTransform;
    expect(vt.scale).toBeCloseTo(1.02);
    expect(vt.translateX).toBeCloseTo(-2.4);
    expect(vt.translateY).toBeCloseTo(-1.8);
  });
});
