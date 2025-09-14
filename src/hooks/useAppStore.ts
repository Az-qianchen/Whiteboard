/**
 * 本文件定义了一个主应用状态管理 Hook (useAppStore)。
 * 它整合了所有独立的状态管理 Hooks（如 usePaths, useToolbarState 等），
 * 并为整个应用提供一个统一的状态和操作接口。
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useUiStore } from '@/context/uiStore';
import { usePaths } from './usePaths';
import { useToolbarState } from './useToolbarState';
import { useViewTransform } from './useViewTransform';
import { useDrawing } from './useDrawing';
import { useSelection } from './useSelection';
import { usePointerInteraction } from './usePointerInteraction';
import { useAppActions } from './useAppActions';
import { useGroupIsolation } from './useGroupIsolation';
import { getLocalStorageItem } from '../lib/utils';
import * as idb from '../lib/indexedDB';
import type { FileSystemFileHandle } from 'wicg-file-system-access';
import type { WhiteboardData, Tool, AnyPath, StyleClipboardData, MaterialData, TextData, PngExportOptions, ImageData, BBox, Frame } from '../types';
import { measureText } from '../lib/drawing';

type ConfirmationDialogState = {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void | Promise<void>;
  confirmButtonText?: string;
} | null;

// --- State Type Definitions ---

interface UiState {
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

interface AppState {
  contextMenu: { isOpen: boolean; x: number; y: number; worldX: number; worldY: number } | null;
  styleClipboard: StyleClipboardData | null;
  styleLibrary: StyleClipboardData[];
  materialLibrary: MaterialData[];
  editingTextPathId: string | null;
  activeFileHandle: FileSystemFileHandle | null;
  activeFileName: string | null;
  isLoading: boolean;
  confirmationDialog: ConfirmationDialogState | null;
  croppingState: { pathId: string; originalPath: ImageData } | null;
  currentCropRect: BBox | null;
}

// --- Initial State Loaders ---

/**
 * 获取 UI 片段的初始状态。
 */
const getInitialUiState = (): UiState => {
  // 根据屏幕宽度判断是否为移动端
  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;
  return {
    isGridVisible: getLocalStorageItem('whiteboard_isGridVisible', true),
    gridSize: getLocalStorageItem('whiteboard_gridSize', 100),
    gridSubdivisions: getLocalStorageItem('whiteboard_gridSubdivisions', 5),
    gridOpacity: getLocalStorageItem('whiteboard_gridOpacity', 0.5),
    backgroundColor: getLocalStorageItem('whiteboard_backgroundColor', '#212529'),
    isStatusBarCollapsed: getLocalStorageItem('whiteboard_isStatusBarCollapsed', isMobile),
    isSideToolbarCollapsed: getLocalStorageItem('whiteboard_isSideToolbarCollapsed', isMobile),
    isMainMenuCollapsed: getLocalStorageItem('whiteboard_isMainMenuCollapsed', isMobile),
    mainMenuWidth: getLocalStorageItem('whiteboard_mainMenuWidth', 240),
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
  };
};

const getInitialAppState = (): AppState => ({
  contextMenu: null,
  styleClipboard: null,
  styleLibrary: getLocalStorageItem('whiteboard_styleLibrary', []),
  materialLibrary: getLocalStorageItem('whiteboard_materialLibrary', []),
  editingTextPathId: null,
  activeFileHandle: null,
  activeFileName: null,
  isLoading: true,
  confirmationDialog: null,
  croppingState: null,
  currentCropRect: null,
});


/**
 * 集中管理整个应用状态的主 Hook。
 * @returns 返回一个包含所有状态和操作函数的对象。
 */
export const useAppStore = () => {
  // UI slice migrated to Zustand; keep API stable by bridging setUiState
  const uiState = useUiStore();
  const setUiState = useCallback((updater: (s: UiState) => UiState) => {
    // Replace entire UI slice with updater result to mirror previous React setState pattern
    useUiStore.setState(updater as (prev: UiState) => UiState, true);
  }, []);
  const [appState, setAppState] = useState<AppState>(getInitialAppState);

  const pathState = usePaths();
  const { paths, frames, setCurrentFrameIndex, setSelectedPathIds } = pathState;

  // --- Memoized Setters for State Properties ---
  const setIsGridVisible = useCallback((val: boolean | ((prev: boolean) => boolean)) => setUiState(s => ({ ...s, isGridVisible: typeof val === 'function' ? val(s.isGridVisible) : val })), []);
  const setGridSize = useCallback((val: number | ((prev: number) => number)) => setUiState(s => ({ ...s, gridSize: typeof val === 'function' ? val(s.gridSize) : val })), []);
  const setGridSubdivisions = useCallback((val: number | ((prev: number) => number)) => setUiState(s => ({ ...s, gridSubdivisions: typeof val === 'function' ? val(s.gridSubdivisions) : val })), []);
  const setGridOpacity = useCallback((val: number | ((prev: number) => number)) => setUiState(s => ({ ...s, gridOpacity: typeof val === 'function' ? val(s.gridOpacity) : val })), []);
  const setBackgroundColor = useCallback((val: string | ((prev: string) => string)) => setUiState(s => ({ ...s, backgroundColor: typeof val === 'function' ? val(s.backgroundColor) : val })), []);
  const setIsStatusBarCollapsed = useCallback((val: boolean | ((prev: boolean) => boolean)) => setUiState(s => ({ ...s, isStatusBarCollapsed: typeof val === 'function' ? val(s.isStatusBarCollapsed) : val })), []);
  const setIsSideToolbarCollapsed = useCallback((val: boolean | ((prev: boolean) => boolean)) => setUiState(s => ({ ...s, isSideToolbarCollapsed: typeof val === 'function' ? val(s.isSideToolbarCollapsed) : val })), []);
  const setIsMainMenuCollapsed = useCallback((val: boolean | ((prev: boolean) => boolean)) => setUiState(s => ({ ...s, isMainMenuCollapsed: typeof val === 'function' ? val(s.isMainMenuCollapsed) : val })), []);
  const setMainMenuWidth = useCallback((val: number | ((prev: number) => number)) => setUiState(s => ({ ...s, mainMenuWidth: typeof val === 'function' ? val(s.mainMenuWidth) : val })), []);
  const setPngExportOptions = useCallback((val: PngExportOptions | ((prev: PngExportOptions) => PngExportOptions)) => setUiState(s => ({ ...s, pngExportOptions: typeof val === 'function' ? val(s.pngExportOptions) : val })), []);
  const setIsStyleLibraryOpen = useCallback((val: boolean | ((prev: boolean) => boolean)) => setUiState(s => ({ ...s, isStyleLibraryOpen: typeof val === 'function' ? val(s.isStyleLibraryOpen) : val })), []);
  const setStyleLibraryPosition = useCallback((val: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => setUiState(s => ({ ...s, styleLibraryPosition: typeof val === 'function' ? val(s.styleLibraryPosition) : val })), []);
  const setIsTimelineCollapsed = useCallback((val: boolean | ((prev: boolean) => boolean)) => setUiState(s => ({ ...s, isTimelineCollapsed: typeof val === 'function' ? val(s.isTimelineCollapsed) : val })), []);
  const setFps = useCallback((val: number | ((prev: number) => number)) => setUiState(s => ({ ...s, fps: typeof val === 'function' ? val(s.fps) : val })), []);
  const setIsPlaying = useCallback((val: boolean | ((prev: boolean) => boolean)) => setUiState(s => ({ ...s, isPlaying: typeof val === 'function' ? val(s.isPlaying) : val })), []);
  const setIsOnionSkinEnabled = useCallback((val: boolean | ((prev: boolean) => boolean)) => setUiState(s => ({ ...s, isOnionSkinEnabled: typeof val === 'function' ? val(s.isOnionSkinEnabled) : val })), []);
  const setOnionSkinPrevFrames = useCallback((val: number | ((prev: number) => number)) => setUiState(s => ({ ...s, onionSkinPrevFrames: typeof val === 'function' ? val(s.onionSkinPrevFrames) : val })), []);
  const setOnionSkinNextFrames = useCallback((val: number | ((prev: number) => number)) => setUiState(s => ({ ...s, onionSkinNextFrames: typeof val === 'function' ? val(s.onionSkinNextFrames) : val })), []);
  const setOnionSkinOpacity = useCallback((val: number | ((prev: number) => number)) => setUiState(s => ({ ...s, onionSkinOpacity: typeof val === 'function' ? val(s.onionSkinOpacity) : val })), []);

  const setContextMenu = useCallback((val: AppState['contextMenu'] | ((prev: AppState['contextMenu']) => AppState['contextMenu'])) => setAppState(s => ({ ...s, contextMenu: typeof val === 'function' ? val(s.contextMenu) : val })), []);
  const setStyleClipboard = useCallback((val: AppState['styleClipboard'] | ((prev: AppState['styleClipboard']) => AppState['styleClipboard'])) => setAppState(s => ({ ...s, styleClipboard: typeof val === 'function' ? val(s.styleClipboard) : val })), []);
  const setStyleLibrary = useCallback((val: AppState['styleLibrary'] | ((prev: AppState['styleLibrary']) => AppState['styleLibrary'])) => setAppState(s => ({ ...s, styleLibrary: typeof val === 'function' ? val(s.styleLibrary) : val })), []);
  const setMaterialLibrary = useCallback((val: AppState['materialLibrary'] | ((prev: AppState['materialLibrary']) => AppState['materialLibrary'])) => setAppState(s => ({ ...s, materialLibrary: typeof val === 'function' ? val(s.materialLibrary) : val })), []);
  const setEditingTextPathId = useCallback((val: AppState['editingTextPathId'] | ((prev: AppState['editingTextPathId']) => AppState['editingTextPathId'])) => setAppState(s => ({ ...s, editingTextPathId: typeof val === 'function' ? val(s.editingTextPathId) : val })), []);
  const setActiveFileHandle = useCallback((val: AppState['activeFileHandle'] | ((prev: AppState['activeFileHandle']) => AppState['activeFileHandle'])) => setAppState(s => ({ ...s, activeFileHandle: typeof val === 'function' ? val(s.activeFileHandle) : val })), []);
  const setActiveFileName = useCallback((val: AppState['activeFileName'] | ((prev: AppState['activeFileName']) => AppState['activeFileName'])) => setAppState(s => ({ ...s, activeFileName: typeof val === 'function' ? val(s.activeFileName) : val })), []);
  const setIsLoading = useCallback((val: AppState['isLoading'] | ((prev: AppState['isLoading']) => AppState['isLoading'])) => setAppState(s => ({ ...s, isLoading: typeof val === 'function' ? val(s.isLoading) : val })), []);
  const setConfirmationDialog = useCallback((val: AppState['confirmationDialog'] | ((prev: AppState['confirmationDialog']) => AppState['confirmationDialog'])) => setAppState(s => ({ ...s, confirmationDialog: typeof val === 'function' ? val(s.confirmationDialog) : val })), []);
  const setCroppingState = useCallback((val: AppState['croppingState'] | ((prev: AppState['croppingState']) => AppState['croppingState'])) => setAppState(s => ({ ...s, croppingState: typeof val === 'function' ? val(s.croppingState) : val })), []);
  const setCurrentCropRect = useCallback((val: AppState['currentCropRect'] | ((prev: AppState['currentCropRect']) => AppState['currentCropRect'])) => setAppState(s => ({ ...s, currentCropRect: typeof val === 'function' ? val(s.currentCropRect) : val })), []);

  const showConfirmation = useCallback((title: string, message: string, onConfirm: () => void | Promise<void>, confirmButtonText?: string) => {
    setConfirmationDialog({
      isOpen: true,
      title,
      message,
      onConfirm: async () => { await onConfirm(); setConfirmationDialog(null); },
      confirmButtonText
    });
  }, []);
  const hideConfirmation = useCallback(() => { setConfirmationDialog(null); }, []);

  const canClear = useMemo(() => paths.length > 0, [paths]);
  const canClearAllData = useMemo(
    () => frames.some(f => (f.paths ?? []).some(p => p.tool !== 'frame')),
    [frames]
  );
  const handleClear = useCallback(() => {
    if (canClear) {
      showConfirmation(
        '清空画布',
        '确定要清空整个画布吗？此操作无法撤销。',
        () => {
          pathState.setPaths([]);
          setSelectedPathIds([]);
        },
        '清空'
      );
    }
  }, [canClear, pathState, showConfirmation, setSelectedPathIds]);

  const handleClearAllData = useCallback(() => {
    if (!canClearAllData) return;
    showConfirmation(
      '清空数据',
      '确定要清空所有动画帧中的数据吗？此操作无法撤销。',
      () => {
        const newFrames = frames.map(f => ({ paths: (f.paths ?? []).filter(p => p.tool === 'frame') } as Frame));
        // Keep current frame index stable
        pathState.handleLoadFile(newFrames, pathState.currentFrameIndex);
        setSelectedPathIds([]);
      },
      '清空'
    );
  }, [canClearAllData, frames, pathState, showConfirmation, setSelectedPathIds]);
  
  const groupIsolation = useGroupIsolation(pathState);
  const { activePaths, activePathState } = groupIsolation;

  const viewTransform = useViewTransform();
  const toolbarState = useToolbarState(activePaths, pathState.selectedPathIds, activePathState.setPaths, pathState.setSelectedPathIds, pathState.beginCoalescing, pathState.endCoalescing);
  
  const handleResetPreferences = useCallback(() => {
    showConfirmation(
      '重置偏好设置',
      '您确定要重置所有偏好设置吗？此操作将重置您的工具和UI设置，但您的绘图内容将保留。',
      async () => {
        const keysToPreserve = new Set([
          'whiteboard_frames',
          'whiteboard_currentFrameIndex',
          'whiteboard_styleLibrary',
          'whiteboard_materialLibrary',
        ]);
        
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('whiteboard_') && !keysToPreserve.has(key)) {
            keysToRemove.push(key);
          }
        }
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
        await idb.del('last-active-file-handle');

        // Reset state in place instead of reloading
        setUiState(getInitialUiState());
        toolbarState.resetState();
        setActiveFileName(null);
      },
      '重置'
    );
  }, [showConfirmation, setUiState, toolbarState, setActiveFileName]);

  const handleTextChange = useCallback((pathId: string, newText: string) => {
      activePathState.setPaths(prev => prev.map(p => (p.id === pathId && p.tool === 'text') ? { ...p, text: newText, ...measureText(newText, (p as TextData).fontSize, (p as TextData).fontFamily) } : p));
  }, [activePathState]);
  const handleTextEditCommit = useCallback(() => { pathState.endCoalescing(); setEditingTextPathId(null); }, [pathState, setEditingTextPathId]);
  
  const confirmCrop = useCallback(async () => {
      if (!appState.croppingState || !appState.currentCropRect) return;
      const { pathId, originalPath } = appState.croppingState;
      const cropRect = appState.currentCropRect;

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = originalPath.src;
      await new Promise((resolve, reject) => {
          img.onload = () => resolve(null);
          img.onerror = reject;
      });

      const scaleX = img.naturalWidth / originalPath.width;
      const scaleY = img.naturalHeight / originalPath.height;
      const sx = (cropRect.x - originalPath.x) * scaleX;
      const sy = (cropRect.y - originalPath.y) * scaleY;
      const sw = cropRect.width * scaleX;
      const sh = cropRect.height * scaleY;

      const canvas = document.createElement('canvas');
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      const newSrc = canvas.toDataURL();

      pathState.setPaths((prev: AnyPath[]) => prev.map(p => {
          if (p.id !== pathId || p.tool !== 'image') return p;
          return { ...p, x: cropRect.x, y: cropRect.y, width: cropRect.width, height: cropRect.height, src: newSrc };
      }));

      setCroppingState(null);
      setCurrentCropRect(null);
      pathState.endCoalescing();
  }, [appState.croppingState, appState.currentCropRect, pathState, setCroppingState, setCurrentCropRect]);
  const cancelCrop = useCallback(() => {
      pathState.endCoalescing();
      setCroppingState(null);
      setCurrentCropRect(null);
  }, [pathState, setCroppingState, setCurrentCropRect]);

  const onDoubleClick = useCallback((path: AnyPath) => {
      if (toolbarState.selectionMode !== 'move') return;
      if (path.tool === 'text') { setEditingTextPathId(path.id); pathState.beginCoalescing(); } 
      else if (path.tool === 'group') { groupIsolation.handleGroupDoubleClick(path.id); } 
      else if (path.tool === 'image') {
          pathState.beginCoalescing();
          setCroppingState({ pathId: path.id, originalPath: path as ImageData });
          setCurrentCropRect({ x: path.x, y: path.y, width: path.width, height: path.height });
          pathState.setSelectedPathIds([path.id]);
      }
  }, [toolbarState.selectionMode, pathState, groupIsolation, setEditingTextPathId, setCroppingState, setCurrentCropRect]);

  const drawingInteraction = useDrawing({ pathState: activePathState, toolbarState, viewTransform, ...uiState });
  const selectionInteraction = useSelection({ pathState: activePathState, toolbarState, viewTransform, ...uiState, onDoubleClick, croppingState: appState.croppingState, currentCropRect: appState.currentCropRect, setCurrentCropRect });
  const pointerInteraction = usePointerInteraction({ tool: toolbarState.tool, viewTransform, drawingInteraction, selectionInteraction });
  
  const handleSetTool = useCallback((newTool: Tool) => {
    if (newTool === toolbarState.tool) return;
    if (appState.croppingState) cancelCrop();
    if (drawingInteraction.drawingShape) drawingInteraction.cancelDrawingShape();
    if (pathState.currentPenPath) pathState.handleCancelPenPath();
    if (pathState.currentLinePath) pathState.handleCancelLinePath();
    if (pathState.currentBrushPath) pathState.setCurrentBrushPath(null);
    toolbarState.setTool(newTool);
  }, [toolbarState, pathState, drawingInteraction, appState.croppingState, cancelCrop]);

  const handleToggleStyleLibrary = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setUiState(s => {
      const isOpening = !s.isStyleLibraryOpen;
      let newPosition = s.styleLibraryPosition;
  
      if (isOpening) {
        const buttonRect = event.currentTarget.getBoundingClientRect();
        const panelWidth = 288; // w-72
        const panelHeight = 350; // estimate
        const gap = 12;
        const margin = 10;
  
        let x = buttonRect.left - panelWidth - gap;
        let y = buttonRect.top + buttonRect.height / 2 - panelHeight / 2;
  
        // Ensure it's within viewport bounds
        x = Math.max(margin, Math.min(x, window.innerWidth - panelWidth - margin));
        y = Math.max(margin, Math.min(y, window.innerHeight - panelHeight - margin));
        
        newPosition = { x, y };
      }
  
      return {
        ...s,
        isStyleLibraryOpen: isOpening,
        styleLibraryPosition: newPosition,
      };
    });
  }, []);

  const appActions = useAppActions({ 
    paths: activePaths, backgroundColor: uiState.backgroundColor, selectedPathIds: pathState.selectedPathIds, 
    pathState: { ...activePathState, handleLoadFile: pathState.handleLoadFile },
    toolbarState, viewTransform, getPointerPosition: viewTransform.getPointerPosition, ...appState,
    setActiveFileHandle, setActiveFileName, setBackgroundColor, setStyleClipboard, setStyleLibrary,
    setMaterialLibrary, pngExportOptions: uiState.pngExportOptions, showConfirmation,
    frames, fps: uiState.fps, setFps,
  });
  
  useEffect(() => {
    const loadLastFile = async () => {
      setIsLoading(true);
      try {
        const handle = await idb.get<FileSystemFileHandle>('last-active-file-handle');
        if (!handle) {
          setIsLoading(false);
          return;
        }

        if ((await handle.queryPermission({ mode: 'read' })) !== 'granted') {
          await idb.del('last-active-file-handle');
          setActiveFileName(null);
          setIsLoading(false);
          return;
        }

        const file = await handle.getFile();
        const contents = await file.text();
        if (!contents) {
            setIsLoading(false);
            return;
        }

        const data: WhiteboardData = JSON.parse(contents);
        if (data?.type === 'whiteboard/shapes' && (data.frames || data.paths)) {
          const framesToLoad = data.frames || [{ paths: data.paths ?? [] }];
          pathState.handleLoadFile(framesToLoad);
          setBackgroundColor(data.backgroundColor ?? '#212529');
          if (setFps && data.fps) setFps(data.fps);

          setActiveFileHandle(handle);
          setActiveFileName(handle.name);
        }
      } catch (error) {
        console.error("Failed to load last session:", error);
        await idb.del('last-active-file-handle').catch(() => {});
        setActiveFileName(null);
      } finally {
        setIsLoading(false);
      }
    };
    loadLastFile();
  }, [pathState.handleLoadFile, setActiveFileHandle, setActiveFileName, setBackgroundColor, setIsLoading, setFps]);

  useEffect(() => {
    if (!uiState.isPlaying || frames.length === 0) return;
    let frameInterval = 1000 / uiState.fps;
    let lastFrameTime = 0;
    let animationFrameId: number;
    const animate = (timestamp: number) => {
        if (timestamp - lastFrameTime > frameInterval) {
            lastFrameTime = timestamp;
            setCurrentFrameIndex(prev => (prev + 1) % frames.length);
        }
        animationFrameId = requestAnimationFrame(animate);
    };
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [uiState.isPlaying, uiState.fps, frames.length, setCurrentFrameIndex]);

  useEffect(() => {
    for (const [key, value] of Object.entries(uiState)) {
      if (!['isPlaying', 'styleLibraryPosition', 'isStyleLibraryOpen'].includes(key)) {
        localStorage.setItem(`whiteboard_${key}`, JSON.stringify(value));
      }
    }
  }, [uiState]);

  useEffect(() => { /* ... save libraries ... */ }, [appState.styleLibrary, appState.materialLibrary]);
  
  return {
    ...uiState, ...appState, ...pathState, ...groupIsolation, ...viewTransform, ...toolbarState,
    paths, // This should be current frame paths
    ...appActions, drawingInteraction, selectionInteraction, pointerInteraction,
    setIsGridVisible, setGridSize, setGridSubdivisions, setGridOpacity, setBackgroundColor,
    setIsStatusBarCollapsed, setIsSideToolbarCollapsed, setIsMainMenuCollapsed, setMainMenuWidth,
    setPngExportOptions, setIsStyleLibraryOpen, setStyleLibraryPosition, setIsTimelineCollapsed,
    setFps, setIsPlaying, setContextMenu, setStyleClipboard, setStyleLibrary,
    setMaterialLibrary, setEditingTextPathId, setActiveFileHandle, setActiveFileName, setIsLoading,
    showConfirmation, hideConfirmation, setCroppingState, setCurrentCropRect,
    confirmCrop, cancelCrop, handleTextChange, handleTextEditCommit, handleSetTool, handleToggleStyleLibrary,
    handleClear,
    handleClearAllData,
    handleResetPreferences,
    canClear,
    canClearAllData,
    setIsOnionSkinEnabled,
    setOnionSkinPrevFrames,
    setOnionSkinNextFrames,
    setOnionSkinOpacity,
  };
};
