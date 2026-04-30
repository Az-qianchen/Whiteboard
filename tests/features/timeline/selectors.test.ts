/**
 * 覆盖洋葱皮路径选择器的可观察行为：前后帧聚合、可见性过滤、组递归克隆与透明度。
 */
import { describe, expect, it } from 'vitest';
import type { AnyPath, GroupData, RectangleData } from '@/types';
import { selectOnionSkinPaths } from '@/features/timeline/selectors';

const createRectangle = (id: string, overrides: Partial<RectangleData> = {}): RectangleData => ({
  id,
  tool: 'rectangle',
  x: 0,
  y: 0,
  width: 100,
  height: 80,
  color: '#000000',
  fill: 'transparent',
  fillStyle: 'solid',
  strokeWidth: 1,
  roughness: 0,
  bowing: 0,
  fillWeight: 0,
  hachureAngle: 0,
  hachureGap: 0,
  curveTightness: 0,
  curveStepCount: 9,
  opacity: 1,
  isVisible: true,
  ...overrides,
});

const createGroup = (id: string, children: AnyPath[], overrides: Partial<GroupData> = {}): GroupData => ({
  ...createRectangle(id),
  tool: 'group',
  children,
  ...overrides,
});

describe('selectOnionSkinPaths', () => {
  it('returns empty when onion skin is disabled', () => {
    const result = selectOnionSkinPaths({
      isOnionSkinEnabled: false,
      frames: [{ id: 'f1', paths: [createRectangle('p1')] }],
      currentFrameIndex: 0,
      onionSkinPrevFrames: 1,
      onionSkinNextFrames: 1,
      onionSkinOpacity: 0.5,
    });

    expect(result).toEqual([]);
  });

  it('collects prev/next visible paths and applies prefixed ids', () => {
    const frames = [
      { id: 'f1', paths: [createRectangle('prev')] },
      { id: 'f2', paths: [createRectangle('current')] },
      { id: 'f3', paths: [createRectangle('next'), createRectangle('hidden', { isVisible: false })] },
    ];

    const result = selectOnionSkinPaths({
      isOnionSkinEnabled: true,
      frames,
      currentFrameIndex: 1,
      onionSkinPrevFrames: 1,
      onionSkinNextFrames: 1,
      onionSkinOpacity: 0.6,
    });

    expect(result.map(p => p.id)).toEqual(['onion-prev-1-prev', 'onion-next-1-next']);
    expect(result.every(p => p.isLocked === true)).toBe(true);
  });

  it('clones group children recursively and keeps opacity gradient', () => {
    const group = createGroup('group1', [createRectangle('child1')]);
    const frames = [
      { id: 'f1', paths: [group] },
      { id: 'f2', paths: [createRectangle('current')] },
    ];

    const result = selectOnionSkinPaths({
      isOnionSkinEnabled: true,
      frames,
      currentFrameIndex: 1,
      onionSkinPrevFrames: 1,
      onionSkinNextFrames: 0,
      onionSkinOpacity: 0.8,
    });

    const clonedGroup = result[0] as GroupData;
    expect(clonedGroup.id).toBe('onion-prev-1-group1');
    expect(clonedGroup.opacity).toBeCloseTo(0.4);
    expect((clonedGroup.children[0] as RectangleData).id).toBe('onion-prev-1-child1');
    expect(clonedGroup.children[0].opacity).toBeCloseTo(0.4);
  });
});
