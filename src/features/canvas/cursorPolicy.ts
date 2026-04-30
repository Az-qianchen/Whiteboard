import type { DragState, SelectionMode, Tool } from '@/types';

export type CursorPolicyInput = {
  isPanning: boolean;
  tool: Tool;
  selectionMode: SelectionMode;
  dragState: DragState;
  isHoveringMovable: boolean;
  isHoveringEditable: boolean;
  hasCroppingState: boolean;
  cropTool: 'crop' | 'magic-wand' | 'adjust';
};

export const resolveCanvasCursor = ({
  isPanning,
  tool,
  selectionMode,
  dragState,
  isHoveringMovable,
  isHoveringEditable,
  hasCroppingState,
  cropTool,
}: CursorPolicyInput): string => {
  if (isPanning) return 'grabbing';
  if (dragState?.type === 'move' || dragState?.type === 'rotate') return 'grabbing';
  if (dragState?.type === 'crop') return 'crosshair';
  if (hasCroppingState && cropTool === 'magic-wand') return 'crosshair';

  switch (tool) {
    case 'selection':
      if (selectionMode === 'lasso') return 'crosshair';
      if (selectionMode === 'move') return isHoveringMovable ? 'grab' : 'default';
      if (selectionMode === 'edit') return isHoveringEditable ? 'pointer' : 'default';
      return 'default';
    case 'brush':
    case 'pen':
    case 'rectangle':
    case 'polygon':
    case 'ellipse':
    case 'line':
    case 'arc':
      return 'crosshair';
    default:
      return 'default';
  }
};
