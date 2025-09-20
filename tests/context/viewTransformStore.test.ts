// 覆盖视图变换存储的触摸捏合与滚轮缩放逻辑
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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

const originalPlatform = navigator.platform;

const setNavigatorPlatform = (platform: string) => {
  Object.defineProperty(window.navigator, 'platform', {
    value: platform,
    configurable: true,
  });
};

const createWheelEvent = (overrides: Partial<WheelEvent> = {}) => {
  const svg = createSvgMock();
  return {
    preventDefault: () => {},
    deltaX: 0,
    deltaY: -10,
    deltaMode: 0,
    ctrlKey: true,
    clientX: 0,
    clientY: 0,
    currentTarget: { querySelector: () => svg },
    ...overrides,
  } as WheelEvent;
};

beforeEach(() => {
  useViewTransformStore.setState({
    viewTransform: { scale: 1, translateX: 0, translateY: 0 },
    isPanning: false,
    isPinching: false,
    touchPoints: new Map(),
    initialPinch: null,
    lastPointerPosition: null,
    pendingFitToContent: false,
  });
  setNavigatorPlatform(originalPlatform);
});

afterEach(() => {
  setNavigatorPlatform(originalPlatform);
});

describe('useViewTransformStore pinch gestures', () => {
  it('starts pinch on second touch', () => {
    const svg = createSvgMock() as any;
    const store = useViewTransformStore.getState();
    const firstTouchPinch = store.handleTouchStart({ pointerId: 1, clientX: 0, clientY: 0, currentTarget: svg } as any);
    expect(firstTouchPinch).toBe(false);
    const secondTouchPinch = store.handleTouchStart({ pointerId: 2, clientX: 10, clientY: 0, currentTarget: svg } as any);
    expect(secondTouchPinch).toBe(true);
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
    const pinchMoveHandled = store.handleTouchMove({ pointerId: 2, clientX: 20, clientY: 0, currentTarget: svg } as any);
    expect(pinchMoveHandled).toBe(true);
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
    const stillPinching = store.handleTouchEnd({ pointerId: 1 } as any);
    expect(stillPinching).toBe(false);
    const state = useViewTransformStore.getState();
    expect(state.isPinching).toBe(false);
    expect(state.initialPinch).toBeNull();
    expect(state.touchPoints.size).toBe(1);
  });
});

describe('useViewTransformStore wheel zoom', () => {
  it('keeps zoom step unchanged for non-mac ctrl+wheel events', () => {
    setNavigatorPlatform('Win32');
    const event = createWheelEvent();
    useViewTransformStore.getState().handleWheel(event);
    const { scale } = useViewTransformStore.getState().viewTransform;
    expect(scale).toBeCloseTo(1.01);
  });

  it('doubles zoom step for mac trackpad pinch gestures', () => {
    setNavigatorPlatform('MacIntel');
    const event = createWheelEvent();
    useViewTransformStore.getState().handleWheel(event);
    const { scale } = useViewTransformStore.getState().viewTransform;
    expect(scale).toBeCloseTo(1.02);
  });

  it('keeps mouse wheel zoom speed on mac for line-based deltaMode', () => {
    setNavigatorPlatform('MacIntel');
    const event = createWheelEvent({ deltaMode: 1 });
    useViewTransformStore.getState().handleWheel(event);
    const { scale } = useViewTransformStore.getState().viewTransform;
    expect(scale).toBeCloseTo(1.01);
  });

  it('applies pan deltas during mac trackpad pinch zoom', () => {
    setNavigatorPlatform('MacIntel');
    const event = createWheelEvent({ deltaX: 5, deltaY: -10 });
    useViewTransformStore.getState().handleWheel(event);
    const { scale, translateX, translateY } = useViewTransformStore.getState().viewTransform;
    expect(scale).toBeCloseTo(1.02);
    expect(translateX).toBeCloseTo(-5);
    expect(translateY).toBeCloseTo(10);
  });
});
