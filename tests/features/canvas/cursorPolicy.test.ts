/**
 * 覆盖画布光标策略的可观察行为：优先级判定与不同工具模式下的返回值。
 */
import { describe, expect, it } from 'vitest';
import type { SelectionMode, Tool } from '@/types';
import { resolveCanvasCursor } from '@/features/canvas/cursorPolicy';

const baseInput = {
  isPanning: false,
  tool: 'selection' as Tool,
  selectionMode: 'move' as SelectionMode,
  dragState: null,
  isHoveringMovable: false,
  isHoveringEditable: false,
  hasCroppingState: false,
  cropTool: 'crop' as const,
};

describe('resolveCanvasCursor', () => {
  it('prioritizes panning and drag states', () => {
    expect(resolveCanvasCursor({ ...baseInput, isPanning: true })).toBe('grabbing');
    expect(resolveCanvasCursor({ ...baseInput, dragState: { type: 'move' } })).toBe('grabbing');
    expect(resolveCanvasCursor({ ...baseInput, dragState: { type: 'crop', cursor: 'nwse-resize' } })).toBe('nwse-resize');
  });

  it('returns crosshair in magic-wand crop mode', () => {
    expect(resolveCanvasCursor({ ...baseInput, hasCroppingState: true, cropTool: 'magic-wand' })).toBe('crosshair');
  });

  it('handles selection sub-modes', () => {
    expect(resolveCanvasCursor({ ...baseInput, selectionMode: 'lasso' })).toBe('crosshair');
    expect(resolveCanvasCursor({ ...baseInput, selectionMode: 'move', isHoveringMovable: true })).toBe('grab');
    expect(resolveCanvasCursor({ ...baseInput, selectionMode: 'edit', isHoveringEditable: true })).toBe('pointer');
  });

  it('returns crosshair for drawing tools', () => {
    expect(resolveCanvasCursor({ ...baseInput, tool: 'brush' })).toBe('crosshair');
    expect(resolveCanvasCursor({ ...baseInput, tool: 'arc' })).toBe('crosshair');
  });
});
