import { create } from 'zustand';
import type { Tool, SelectionMode } from '@/types';

export interface ToolState {
  tool: Tool;
  selectionMode: SelectionMode;
  setTool: (t: Tool) => void;
  setSelectionMode: (m: SelectionMode) => void;
}

export const useToolStore = create<ToolState>((set) => ({
  tool: 'selection',
  selectionMode: 'move',
  setTool: (t) => set({ tool: t }),
  setSelectionMode: (m) => set({ selectionMode: m }),
}));

