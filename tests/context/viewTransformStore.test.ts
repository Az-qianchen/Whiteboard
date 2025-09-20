import { describe, it, expect, beforeEach, vi, afterEach, beforeAll, afterAll } from 'vitest';
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

let platformSpy: ReturnType<typeof vi.spyOn> | null = null;

beforeAll(() => {
  platformSpy = vi.spyOn(window.navigator, 'platform', 'get').mockReturnValue('MacIntel');
});

afterAll(() => {
  platformSpy?.mockRestore();
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

afterEach(() => {
  useViewTransformStore.setState({
    isPanning: false,
    isPinching: false,
    touchPoints: new Map(),
    initialPinch: null,
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

describe('useViewTransformStore wheel interactions', () => {
  const createContainerMock = () => ({
    querySelector: () => createSvgMock(),
  });

  it('treats mac trackpad pinch without ctrl key as zoom and doubles the zoom factor', () => {
    const store = useViewTransformStore.getState();
    const preventDefault = vi.fn();
    store.handleWheel({
      preventDefault,
      deltaX: 5,
      deltaY: -4,
      deltaZ: -1,
      ctrlKey: false,
      clientX: 0,
      clientY: 0,
      currentTarget: createContainerMock(),
    } as any);

    const state = useViewTransformStore.getState().viewTransform;
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(state.scale).toBeCloseTo(1.008);
    expect(state.translateX).toBeCloseTo(0);
    expect(state.translateY).toBeCloseTo(0);
  });

  it('keeps mouse wheel panning behaviour when no zoom gesture is detected', () => {
    const store = useViewTransformStore.getState();
    store.handleWheel({
      preventDefault: vi.fn(),
      deltaX: 6,
      deltaY: -3,
      deltaZ: 0,
      ctrlKey: false,
      clientX: 0,
      clientY: 0,
      currentTarget: createContainerMock(),
    } as any);

    const state = useViewTransformStore.getState().viewTransform;
    expect(state.scale).toBeCloseTo(1);
    expect(state.translateX).toBeCloseTo(-6);
    expect(state.translateY).toBeCloseTo(3);
  });

  it('maintains original zoom speed for mouse wheel zoom with modifier keys', () => {
    const store = useViewTransformStore.getState();
    store.handleWheel({
      preventDefault: vi.fn(),
      deltaX: 0,
      deltaY: -4,
      deltaZ: 0,
      ctrlKey: true,
      clientX: 0,
      clientY: 0,
      currentTarget: createContainerMock(),
    } as any);

    const state = useViewTransformStore.getState().viewTransform;
    expect(state.scale).toBeCloseTo(1.004);
  });
});
