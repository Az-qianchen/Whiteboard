/**
 * 本文件定义了一个主应用状态管理 Hook (useAppStore)。
 * 它整合了所有独立的状态管理 Hooks（如 usePaths, useToolbarState 等），
 * 并为整个应用提供一个统一的状态和操作接口。
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import type { WhiteboardData, Tool, AnyPath, StyleClipboardData, MaterialData, TextData, PngExportOptions, ImageData, BBox } from '../types';
import { getPathsBoundingBox, measureText } from '../lib/drawing';

type ConfirmationDialogState = {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
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

const getInitialUiState = (): UiState => ({
  isGridVisible: getLocalStorageItem('whiteboard_isGridVisible', true),
  gridSize: getLocalStorageItem('whiteboard_gridSize', 100),
  gridSubdivisions: getLocalStorageItem('whiteboard_gridSubdivisions', 5),
  gridOpacity: getLocalStorageItem('whiteboard_gridOpacity', 0.5),
  backgroundColor: getLocalStorageItem('whiteboard_backgroundColor', '#212529'),
  isStatusBarCollapsed: getLocalStorageItem('whiteboard_isStatusBarCollapsed', false),
  isSideToolbarCollapsed: getLocalStorageItem('whiteboard_isSideToolbarCollapsed', false),
  isMainMenuCollapsed: getLocalStorageItem('whiteboard_isMainMenuCollapsed', false),
  mainMenuWidth: getLocalStorageItem('whiteboard_mainMenuWidth', 240),
  pngExportOptions: getLocalStorageItem('whiteboard_pngExportOptions', { scale: 1, highQuality: true, transparentBg: true }),
  isStyleLibraryOpen: getLocalStorageItem('whiteboard_isStyleLibraryOpen', false),
  styleLibraryPosition: getLocalStorageItem('whiteboard_styleLibraryPosition', { x: window.innerWidth - 400, y: 150 }),
  isTimelineCollapsed: getLocalStorageItem('whiteboard_isTimelineCollapsed', true),
});

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
  // Consolidate state into two main objects
  const [uiState, setUiState] = useState<UiState>(getInitialUiState);
  const [appState, setAppState] = useState<AppState>(getInitialAppState);

  // --- Memoized Setters for State Properties ---

  // UI State Setters
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

  // App State Setters
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

  const showConfirmation = useCallback((title: string, message: string, onConfirm: () => void) => {
    setConfirmationDialog({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmationDialog(null);
      },
    });
  }, []);

  const hideConfirmation = useCallback(() => {
    setConfirmationDialog(null);
  }, []);

  // --- Core Hooks for State Management ---
  const pathState = usePaths();
  const groupIsolation = useGroupIsolation(pathState);
  const { activePaths, activePathState } = groupIsolation;

  const viewTransform = useViewTransform();
  const toolbarState = useToolbarState(activePaths, pathState.selectedPathIds, activePathState.setPaths, pathState.setSelectedPathIds, pathState.beginCoalescing, pathState.endCoalescing);
  
  const handleTextChange = useCallback((pathId: string, newText: string) => {
      activePathState.setPaths(prev => prev.map(p => {
          if (p.id === pathId && p.tool === 'text') {
              const pathAsText = p as TextData;
              const { width, height } = measureText(newText, pathAsText.fontSize, pathAsText.fontFamily);
              return { ...p, text: newText, width, height };
          }
          return p;
      }));
  }, [activePathState]);

  const handleTextEditCommit = useCallback(() => {
      pathState.endCoalescing();
      setEditingTextPathId(null);
  }, [pathState, setEditingTextPathId]);
  
  // START: Image Crop Logic
  const confirmCrop = useCallback(() => {
    if (!appState.croppingState || !appState.currentCropRect) return;

    pathState.beginCoalescing();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        setCroppingState(null);
        setCurrentCropRect(null);
        pathState.endCoalescing();
        return;
    }

    const img = new Image();
    img.onload = () => {
        const original = appState.croppingState!.originalPath;
        const cropRect = appState.currentCropRect!;
        const scaleX = img.naturalWidth / original.width;
        const scaleY = img.naturalHeight / original.height;

        const cropX = (cropRect.x - original.x) * scaleX;
        const cropY = (cropRect.y - original.y) * scaleY;
        const cropWidth = cropRect.width * scaleX;
        const cropHeight = cropRect.height * scaleY;

        if (cropWidth <= 0 || cropHeight <= 0) {
            setCroppingState(null);
            setCurrentCropRect(null);
            pathState.endCoalescing();
            return;
        }

        canvas.width = cropWidth;
        canvas.height = cropHeight;
        ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
        
        const newSrc = canvas.toDataURL();

        const finalCroppedPath: ImageData = {
            ...original,
            id: original.id,
            x: cropRect.x,
            y: cropRect.y,
            width: cropRect.width,
            height: cropRect.height,
            src: newSrc,
        };
        
        pathState.setPaths(prev => prev.map(p => p.id === appState.croppingState!.pathId ? finalCroppedPath : p));
        setCroppingState(null);
        setCurrentCropRect(null);
        pathState.endCoalescing();
    };
    img.onerror = () => {
        console.error("Failed to load image for cropping.");
        setCroppingState(null);
        setCurrentCropRect(null);
        pathState.endCoalescing();
    };
    img.src = appState.croppingState.originalPath.src;
  }, [appState.croppingState, appState.currentCropRect, pathState, setCroppingState, setCurrentCropRect]);
  
  const cancelCrop = useCallback(() => {
      if (!appState.croppingState) return;
      setCroppingState(null);
      setCurrentCropRect(null);
  }, [appState.croppingState, setCroppingState, setCurrentCropRect]);
  // END: Image Crop Logic

  const onDoubleClick = useCallback((path: AnyPath) => {
      if (toolbarState.selectionMode !== 'move') return;

      if (path.tool === 'text') {
          setEditingTextPathId(path.id);
          pathState.beginCoalescing();
      } else if (path.tool === 'group') {
          groupIsolation.handleGroupDoubleClick(path.id);
      } else if (path.tool === 'image') {
          pathState.beginCoalescing();
          const imagePath = path as ImageData;
          setCroppingState({ pathId: imagePath.id, originalPath: imagePath });
          setCurrentCropRect({ x: imagePath.x, y: imagePath.y, width: imagePath.width, height: imagePath.height });
          pathState.setSelectedPathIds([imagePath.id]);
      }
  }, [toolbarState.selectionMode, pathState, groupIsolation, setEditingTextPathId, setCroppingState, setCurrentCropRect]);

  // --- Decoupled Interaction Hooks ---
  const drawingInteraction = useDrawing({ pathState: activePathState, toolbarState, viewTransform, ...uiState });
  const selectionInteraction = useSelection({ pathState: activePathState, toolbarState, viewTransform, ...uiState, onDoubleClick, croppingState: appState.croppingState, currentCropRect: appState.currentCropRect, setCurrentCropRect });

  const pointerInteraction = usePointerInteraction({ 
    tool: toolbarState.tool,
    viewTransform,
    drawingInteraction,
    selectionInteraction
  });
  
  const handleSetTool = useCallback((newTool: Tool) => {
    if (newTool === toolbarState.tool) return;

    if (appState.croppingState) {
        cancelCrop();
    }
    if (drawingInteraction.drawingShape) drawingInteraction.cancelDrawingShape();
    if (pathState.currentPenPath) pathState.handleCancelPenPath();
    if (pathState.currentLinePath) pathState.handleCancelLinePath();
    if (pathState.currentBrushPath) pathState.setCurrentBrushPath(null);
    
    toolbarState.setTool(newTool);
  }, [toolbarState, pathState, drawingInteraction, appState.croppingState, cancelCrop]);

  const handleToggleStyleLibrary = (event: React.MouseEvent<HTMLButtonElement>) => {
    setIsStyleLibraryOpen(prevIsOpen => {
      const nextIsOpen = !prevIsOpen;
      if (nextIsOpen) {
        const popoverWidth = 288;
        const estimatedPopoverHeight = 320;
        const gap = 16;
        const margin = 16;
        const buttonRect = event.currentTarget.getBoundingClientRect();
        const idealX = buttonRect.left - popoverWidth - gap;
        const idealY = buttonRect.top;
        const clampedX = Math.max(margin, Math.min(idealX, window.innerWidth - popoverWidth - margin));
        const clampedY = Math.max(margin, Math.min(idealY, window.innerHeight - estimatedPopoverHeight - margin));
        setStyleLibraryPosition({ x: clampedX, y: clampedY });
      }
      return nextIsOpen;
    });
  };

  // --- Encapsulated Action Handlers ---
  const appActions = useAppActions({ 
    paths: activePaths, 
    backgroundColor: uiState.backgroundColor,
    selectedPathIds: pathState.selectedPathIds, 
    pathState: activePathState, 
    toolbarState, 
    viewTransform, 
    getPointerPosition: viewTransform.getPointerPosition,
    ...appState,
    setActiveFileHandle,
    setActiveFileName,
    setBackgroundColor,
    setStyleClipboard,
    setStyleLibrary,
    setMaterialLibrary,
    pngExportOptions: uiState.pngExportOptions,
    showConfirmation,
  });
  
  // --- Auto-load last file on startup ---
  useEffect(() => {
    const loadLastFile = async () => {
      try {
        const handle = await idb.get<FileSystemFileHandle>('last-active-file-handle');
        if (!handle) { setIsLoading(false); return; }
        if ((await handle.queryPermission({ mode: 'read' })) === 'granted') {
          const file = await handle.getFile();
          const contents = await file.text();
          if (contents) {
            const data: WhiteboardData = JSON.parse(contents);
            if (data?.type === 'whiteboard/shapes' && Array.isArray(data.paths)) {
              pathState.handleLoadFile(data.paths);
              setBackgroundColor(data.backgroundColor ?? '#212529');
              setActiveFileHandle(handle);
              setActiveFileName(handle.name);
            }
          }
        } else {
          await idb.del('last-active-file-handle');
          setActiveFileName(null);
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
  }, [pathState, setActiveFileHandle, setActiveFileName, setBackgroundColor, setIsLoading]);

  // --- Persist State to localStorage ---
  useEffect(() => {
    for (const [key, value] of Object.entries(uiState)) {
      localStorage.setItem(`whiteboard_${key}`, JSON.stringify(value));
    }
  }, [uiState]);

  useEffect(() => {
    localStorage.setItem('whiteboard_styleLibrary', JSON.stringify(appState.styleLibrary));
    localStorage.setItem('whiteboard_materialLibrary', JSON.stringify(appState.materialLibrary));
  }, [appState.styleLibrary, appState.materialLibrary]);
  
  return {
    ...uiState,
    ...appState,
    setIsGridVisible,
    setGridSize,
    setGridSubdivisions,
    setGridOpacity,
    setBackgroundColor,
    setIsStatusBarCollapsed,
    setIsSideToolbarCollapsed,
    setIsMainMenuCollapsed,
    setMainMenuWidth,
    setPngExportOptions,
    setIsStyleLibraryOpen,
    setStyleLibraryPosition,
    setIsTimelineCollapsed,
    setContextMenu,
    setStyleClipboard,
    setStyleLibrary,
    setMaterialLibrary,
    setEditingTextPathId,
    setActiveFileHandle,
    setActiveFileName,
    setIsLoading,
    showConfirmation,
    hideConfirmation,
    setCroppingState,
    setCurrentCropRect,
    confirmCrop,
    cancelCrop,
    ...activePathState,
    ...groupIsolation,
    ...viewTransform,
    ...toolbarState,
    drawingInteraction,
    selectionInteraction,
    pointerInteraction,
    ...appActions,
    handleTextChange,
    handleTextEditCommit,
    handleSetTool,
    handleToggleStyleLibrary,
  };
};