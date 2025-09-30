/**
 * 覆盖路径存储中的帧重排逻辑，确保缩略图内容与帧对应关系保持一致。
 */
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { RectangleData } from '@/types';

type PathsStoreModule = typeof import('@/context/pathsStore');

let usePathsStore: PathsStoreModule['usePathsStore'];
let createFrame: PathsStoreModule['createFrame'];

const createMockStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  } as Storage;
};

const createRectangle = (id: string, x: number): RectangleData => ({
  id,
  tool: 'rectangle',
  x,
  y: 0,
  width: 100,
  height: 100,
  color: '#000000',
  fill: 'none',
  fillStyle: 'solid',
  strokeWidth: 1,
});

beforeAll(async () => {
  (globalThis as any).window = globalThis;
  (globalThis as any).localStorage = createMockStorage();
  const module = await import('@/context/pathsStore');
  usePathsStore = module.usePathsStore;
  createFrame = module.createFrame;
});

beforeEach(() => {
  usePathsStore.setState((state) => ({
    ...state,
    frames: [createFrame()],
    currentFrameIndex: 0,
    past: [],
    future: [],
  }));
});

describe('pathsStore frame reordering', () => {
  it('keeps frame ids and content aligned after reordering', () => {
    const frameAPath = createRectangle('shape-a', 10);
    const frameBPath = createRectangle('shape-b', 20);

    const initialFrames = [
      createFrame([frameAPath], 'frame-a'),
      createFrame([frameBPath], 'frame-b'),
    ];

    usePathsStore.getState().handleLoadFile(initialFrames);

    expect(usePathsStore.getState().frames.map((frame) => frame.id)).toEqual([
      'frame-a',
      'frame-b',
    ]);

    usePathsStore.getState().reorderFrames(0, 1);

    const reordered = usePathsStore.getState().frames;
    expect(reordered.map((frame) => frame.id)).toEqual(['frame-b', 'frame-a']);
    expect(reordered[0].paths[0]).toBe(frameBPath);
    expect(reordered[1].paths[0]).toBe(frameAPath);
  });
});
