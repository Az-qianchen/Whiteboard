import type { SelectionMode, Tool } from '@/types';

export type CursorDragState = {
  type: string;
  cursor?: string;
} | null;

export type CursorPolicyInput = {
  isPanning: boolean;
  tool: Tool;
  selectionMode: SelectionMode;
  dragState: CursorDragState;
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
  if (dragState?.type === 'crop') return dragState.cursor || 'crosshair';
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
