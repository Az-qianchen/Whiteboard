/**
 * 覆盖洋葱皮路径选择器的可观察行为：前后帧聚合、可见性过滤、组递归克隆与透明度。
 */
import { describe, expect, it } from 'vitest';
import type { AnyPath } from '@/types';
import { selectOnionSkinPaths } from '@/features/timeline/selectors';

const makePath = (id: string, tool: string, extra: Record<string, unknown> = {}): AnyPath => ({
  id,
  tool,
  opacity: 1,
  isVisible: true,
  ...extra,
} as unknown as AnyPath);

describe('selectOnionSkinPaths', () => {
  it('returns empty when onion skin is disabled', () => {
    const result = selectOnionSkinPaths({
      isOnionSkinEnabled: false,
      frames: [{ paths: [makePath('p1', 'rectangle')] }],
      currentFrameIndex: 0,
      onionSkinPrevFrames: 1,
      onionSkinNextFrames: 1,
      onionSkinOpacity: 0.5,
    });

    expect(result).toEqual([]);
  });

  it('collects prev/next visible paths and applies prefixed ids', () => {
    const frames = [
      { paths: [makePath('prev', 'rectangle')] },
      { paths: [makePath('current', 'rectangle')] },
      { paths: [makePath('next', 'ellipse'), makePath('hidden', 'ellipse', { isVisible: false })] },
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
    const group = makePath('group1', 'group', {
      children: [makePath('child1', 'rectangle')],
    });
    const frames = [
      { paths: [group] },
      { paths: [makePath('current', 'rectangle')] },
    ];

    const result = selectOnionSkinPaths({
      isOnionSkinEnabled: true,
      frames,
      currentFrameIndex: 1,
      onionSkinPrevFrames: 1,
      onionSkinNextFrames: 0,
      onionSkinOpacity: 0.8,
    });

    const clonedGroup = result[0] as unknown as { id: string; opacity: number; children: Array<{ id: string; opacity: number }> };
    expect(clonedGroup.id).toBe('onion-prev-1-group1');
    expect(clonedGroup.opacity).toBeCloseTo(0.4);
    expect(clonedGroup.children[0].id).toBe('onion-prev-1-child1');
    expect(clonedGroup.children[0].opacity).toBeCloseTo(0.4);
  });
});
