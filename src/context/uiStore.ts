import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getLocalStorageItem } from '@/lib/utils';
import type { PngExportOptions } from '@/types';
import { DEFAULT_MAIN_MENU_WIDTH } from '@/constants';

export interface UiState {
  isGridVisible: boolean;
  gridSize: number;
  gridSubdivisions: number;
  gridOpacity: number;
  backgroundColor: string;
  isStatusBarCollapsed: boolean;
  isSideToolbarCollapsed: boolean;
  isMainMenuCollapsed: boolean;
  mainMenuWidth: number;
  pngExportOptions: PngExportOptions;
  isStyleLibraryOpen: boolean;
  styleLibraryPosition: { x: number; y: number };
  isTimelineCollapsed: boolean;
  fps: number;
  isPlaying: boolean;
  isOnionSkinEnabled: boolean;
  onionSkinPrevFrames: number;
  onionSkinNextFrames: number;
  onionSkinOpacity: number;
}

// 根据屏幕宽度判断是否为移动端
const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;

const initialUiState = (): UiState => ({
  isGridVisible: getLocalStorageItem('whiteboard_isGridVisible', true),
  gridSize: getLocalStorageItem('whiteboard_gridSize', 100),
  gridSubdivisions: getLocalStorageItem('whiteboard_gridSubdivisions', 5),
  gridOpacity: getLocalStorageItem('whiteboard_gridOpacity', 0.5),
  backgroundColor: getLocalStorageItem('whiteboard_backgroundColor', '#212529'),
  isStatusBarCollapsed: getLocalStorageItem('whiteboard_isStatusBarCollapsed', isMobile),
  isSideToolbarCollapsed: getLocalStorageItem('whiteboard_isSideToolbarCollapsed', isMobile),
  isMainMenuCollapsed: getLocalStorageItem('whiteboard_isMainMenuCollapsed', isMobile),
  mainMenuWidth: getLocalStorageItem('whiteboard_mainMenuWidth', DEFAULT_MAIN_MENU_WIDTH),
  pngExportOptions: getLocalStorageItem('whiteboard_pngExportOptions', { scale: 1, highQuality: true, transparentBg: true }),
  isStyleLibraryOpen: false,
  styleLibraryPosition: { x: 0, y: 0 },
  isTimelineCollapsed: getLocalStorageItem('whiteboard_isTimelineCollapsed', true),
  fps: getLocalStorageItem('whiteboard_fps', 12),
  isPlaying: false,
  isOnionSkinEnabled: getLocalStorageItem('whiteboard_isOnionSkinEnabled', false),
  onionSkinPrevFrames: getLocalStorageItem('whiteboard_onionSkinPrevFrames', 1),
  onionSkinNextFrames: getLocalStorageItem('whiteboard_onionSkinNextFrames', 1),
  onionSkinOpacity: getLocalStorageItem('whiteboard_onionSkinOpacity', 0.4),
});

// Expose a single store for the UI slice.
// We keep only state here; existing hook will drive updates via setState(updater, true).
export const useUiStore = create<UiState>()(
  persist(
    () => initialUiState(),
    {
      name: 'whiteboard_ui_state',
      // Do not persist ephemeral fields to match current behavior
      partialize: (s) => ({
        isGridVisible: s.isGridVisible,
        gridSize: s.gridSize,
        gridSubdivisions: s.gridSubdivisions,
        gridOpacity: s.gridOpacity,
        backgroundColor: s.backgroundColor,
        isStatusBarCollapsed: s.isStatusBarCollapsed,
        isSideToolbarCollapsed: s.isSideToolbarCollapsed,
        isMainMenuCollapsed: s.isMainMenuCollapsed,
        mainMenuWidth: s.mainMenuWidth,
        pngExportOptions: s.pngExportOptions,
        isTimelineCollapsed: s.isTimelineCollapsed,
        fps: s.fps,
        isOnionSkinEnabled: s.isOnionSkinEnabled,
        onionSkinPrevFrames: s.onionSkinPrevFrames,
        onionSkinNextFrames: s.onionSkinNextFrames,
        onionSkinOpacity: s.onionSkinOpacity,
        // exclude: isPlaying, isStyleLibraryOpen, styleLibraryPosition
      }),
    }
  )
);

