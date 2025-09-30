/**
 * 本文件定义了一个主应用状态管理 Hook (useAppStore)。
 * 它整合了所有独立的状态管理 Hooks（如 usePaths, useToolbarState 等），
 * 并为整个应用提供一个统一的状态和操作接口。
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useUiStore } from '@/context/uiStore';
import { usePathsStore } from './usePathsStore';
import { useToolsStore } from './useToolsStore';
import { useViewTransform } from './useViewTransform';
import { useViewTransformStore } from '@/context/viewTransformStore';
import { useDrawing } from './useDrawing';
import { useSelection } from './useSelection';
import { usePointerInteraction } from './usePointerInteraction';
import { useAppActions } from './actions/useAppActions';
import { useGroupIsolation } from './useGroupIsolation';
import { getLocalStorageItem } from '../lib/utils';
import * as idb from '../lib/indexedDB';
import type { FileSystemFileHandle } from 'wicg-file-system-access';
import type { WhiteboardData, Tool, AnyPath, StyleClipboardData, MaterialData, PngExportOptions, ImageData as PathImageData, BBox, Frame, Point, GroupData, TextData, TextEditorState } from '../types';
import { rotatePoint, dist } from '@/lib/drawing';

import {
  removeBackground,
  createMaskFromPolygon,
  combineMasks,
  invertMask,
  applyMaskToImage,
  createMaskFromBrushStroke,
  getOpaqueBounds,
  type MagicWandMask,
} from '@/lib/image';

import { getImageDataUrl, getImagePixelData } from '@/lib/imageCache';
import { useFilesStore } from '@/context/filesStore';

import { createDocumentSignature } from '@/lib/document';
import { measureTextBounds, DEFAULT_TEXT_FONT_FAMILY, DEFAULT_TEXT_FONT_SIZE, DEFAULT_TEXT_LINE_HEIGHT } from '@/lib/text';

type ConfirmationDialogState = {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void | Promise<void>;
  confirmButtonText?: string;
} | null;

const mapWorldPointToImagePixel = (
  point: Point,
  image: PathImageData,
  naturalWidth: number,
  naturalHeight: number,
  options: { clampToBounds?: boolean } = {}
): { x: number; y: number } | null => {
  const rotation = image.rotation ?? 0;
  const center = { x: image.x + image.width / 2, y: image.y + image.height / 2 };
  let localPoint = point;
  if (rotation) {
    localPoint = rotatePoint(point, center, -rotation);
  }

  const normalizedX = (localPoint.x - image.x) / image.width;
  const normalizedY = (localPoint.y - image.y) / image.height;
  const { clampToBounds = false } = options;
  if (!clampToBounds && (normalizedX < 0 || normalizedX > 1 || normalizedY < 0 || normalizedY > 1)) {
    return null;
  }

  const clampedX = clampToBounds ? Math.min(Math.max(normalizedX, 0), 1) : normalizedX;
  const clampedY = clampToBounds ? Math.min(Math.max(normalizedY, 0), 1) : normalizedY;

  const toPixel = (value: number, size: number) => {
    if (Number.isNaN(value) || size <= 0) {
      return 0;
    }
    if (value <= 0) {
      return 0;
    }
    if (value >= 1) {
      // When clamping points we allow coordinates to reach the canvas edge so the
      // generated mask covers the outermost pixel instead of leaving a 1px gap.
      return clampToBounds ? size : size - 1;
    }
    return Math.floor(value * size);
  };

  return {
    x: toPixel(clampedX, naturalWidth),
    y: toPixel(clampedY, naturalHeight),
  };
};

const mapPixelToWorldPoint = (
  pixel: { x: number; y: number },
  image: PathImageData,
  naturalWidth: number,
  naturalHeight: number
): Point => {
  const basePoint = {
    x: image.x + (pixel.x / naturalWidth) * image.width,
    y: image.y + (pixel.y / naturalHeight) * image.height,
  };
  const rotation = image.rotation ?? 0;
  if (!rotation) {
    return basePoint;
  }
  const center = { x: image.x + image.width / 2, y: image.y + image.height / 2 };
  return rotatePoint(basePoint, center, rotation);
};

const buildContourPaths = (
  contours: Array<{ points: Array<{ x: number; y: number }>; inner: boolean }>,
  image: PathImageData,
  naturalWidth: number,
  naturalHeight: number
): Array<{ d: string; inner: boolean }> => {
  return contours
    .map(contour => {
      if (!contour.points || contour.points.length === 0) {
        return null;
      }
      const points = contour.points.map(pt => mapPixelToWorldPoint(pt, image, naturalWidth, naturalHeight));
      const d = points
        .map((p, idx) => `${idx === 0 ? 'M' : 'L'}${p.x} ${p.y}`)
        .join(' ');
      return { d: `${d} Z`, inner: contour.inner };
    })
    .filter((item): item is { d: string; inner: boolean } => item !== null);
};

/**
 * 复制魔棒蒙版，避免历史记录引用同一数据。
 */
const cloneMagicWandMask = (mask: MagicWandMask | null): MagicWandMask | null => {
  if (!mask) {
    return null;
  }
  return {
    data: new Uint8Array(mask.data),
    width: mask.width,
    height: mask.height,
    bounds: { ...mask.bounds },
  };
};

/**
 * 判断两个魔棒蒙版数据是否一致。
 */
const areMasksEqual = (a: MagicWandMask | null, b: MagicWandMask | null): boolean => {
  if (a === b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  if (a.width !== b.width || a.height !== b.height) {
    return false;
  }
  const aData = a.data;
  const bData = b.data;
  if (aData.length !== bData.length) {
    return false;
  }
  for (let i = 0; i < aData.length; i++) {
    if (aData[i] !== bData[i]) {
      return false;
    }
  }
  return true;
};

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

type CropManualDraft =
  | {
      mode: 'freehand';
      operation: 'add' | 'subtract' | 'replace';
      points: Point[];
    }
  | {
      mode: 'polygon';
      operation: 'add' | 'subtract' | 'replace';
      points: Point[];
      previewPoint?: Point;
    }
  | {
      mode: 'brush';
      operation: 'add' | 'subtract' | 'replace';
      points: Point[];
      brushSize: number;
    };

interface AppState {
  contextMenu: { isOpen: boolean; x: number; y: number; worldX: number; worldY: number } | null;
  styleClipboard: StyleClipboardData | null;
  styleLibrary: StyleClipboardData[];
  materialLibrary: MaterialData[];
  activeFileHandle: FileSystemFileHandle | null;
  activeFileName: string | null;
  isLoading: boolean;
  confirmationDialog: ConfirmationDialogState | null;
  croppingState: { pathId: string; originalPath: PathImageData } | null;
  currentCropRect: BBox | null;
  cropTool: 'crop' | 'magic-wand';
  cropMagicWandOptions: { threshold: number; contiguous: boolean; featherRadius: number };
  cropSelectionContours: Array<{ d: string; inner: boolean }> | null;
  cropPendingCutoutSrc: string | null;
  cropSelectionMode: 'magic-wand' | 'freehand' | 'polygon' | 'brush';
  cropSelectionOperation: 'add' | 'subtract' | 'replace';
  cropBrushSize: number;
  cropManualDraft: CropManualDraft | null;
  hasUnsavedChanges: boolean;
  lastSavedDocumentSignature: string | null;
  textEditor: TextEditorState | null;
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
    mainMenuWidth: getLocalStorageItem('whiteboard_mainMenuWidth', 200),
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
      activeFileHandle: null,
  activeFileName: null,
  isLoading: true,
  confirmationDialog: null,
  croppingState: null,
  currentCropRect: null,
  cropTool: 'crop',
  cropMagicWandOptions: { threshold: 20, contiguous: true, featherRadius: 0 },
  cropSelectionContours: null,
  cropPendingCutoutSrc: null,
  cropSelectionMode: 'magic-wand',
  cropSelectionOperation: 'replace',
  cropBrushSize: 40,
  cropManualDraft: null,
  hasUnsavedChanges: true,
  lastSavedDocumentSignature: null,
  textEditor: null,
});


/**
 * 集中管理整个应用状态的主 Hook。
 * @returns 返回一个包含所有状态和操作函数的对象。
 */
export const useAppStore = () => {
  // UI slice migrated to Zustand; keep API stable by bridging setUiState
  const uiState = useUiStore(useShallow(state => ({
    isGridVisible: state.isGridVisible,
    gridSize: state.gridSize,
    gridSubdivisions: state.gridSubdivisions,
    gridOpacity: state.gridOpacity,
    backgroundColor: state.backgroundColor,
    isStatusBarCollapsed: state.isStatusBarCollapsed,
    isSideToolbarCollapsed: state.isSideToolbarCollapsed,
    isMainMenuCollapsed: state.isMainMenuCollapsed,
    mainMenuWidth: state.mainMenuWidth,
    pngExportOptions: state.pngExportOptions,
    isStyleLibraryOpen: state.isStyleLibraryOpen,
    styleLibraryPosition: state.styleLibraryPosition,
    isTimelineCollapsed: state.isTimelineCollapsed,
    fps: state.fps,
    isPlaying: state.isPlaying,
    isOnionSkinEnabled: state.isOnionSkinEnabled,
    onionSkinPrevFrames: state.onionSkinPrevFrames,
    onionSkinNextFrames: state.onionSkinNextFrames,
    onionSkinOpacity: state.onionSkinOpacity,
  })));
  const initialFpsRef = useRef(uiState.fps);
  const initialFitRequestedRef = useRef(false);
  const setUiState = useCallback((updater: (s: UiState) => UiState) => {
    // Replace entire UI slice with updater result to mirror previous React setState pattern
    useUiStore.setState(updater as (prev: UiState) => UiState, true);
  }, []);
  const [appState, setAppState] = useState<AppState>(getInitialAppState);
  const [cropHistory, setCropHistory] = useState<{ past: BBox[]; future: BBox[] }>({ past: [], future: [] });
  const [cropSelectionHistory, setCropSelectionHistory] = useState<{ past: (MagicWandMask | null)[]; future: (MagicWandMask | null)[] }>({ past: [], future: [] });
  const [cropEditedSrc, setCropEditedSrc] = useState<string | null>(null);
  const cropImageCacheRef = useRef<{
    naturalWidth: number;
    naturalHeight: number;
    imageData: ImageData;
  } | null>(null);
  const cropMagicWandResultRef = useRef<{ imageData: ImageData; newSrc: string } | null>(null);
  const cropMagicWandMaskRef = useRef<MagicWandMask | null>(null);
  const cropMagicWandSampleRef = useRef<{ x: number; y: number } | null>(null);
  const cropManualDraftRef = useRef<CropManualDraft | null>(null);

  const pathState = usePathsStore();
  const {
    paths,
    frames,
    setCurrentFrameIndex,
    setPaths,
    handleLoadFile,
    handleDeletePaths,
    togglePathsProperty,
    toggleGroupCollapse,
    setPathName,
    reorderPaths,
    addFrame,
    copyFrame,
    deleteFrame,
    reorderFrames,
    undo,
    redo,
    canUndo: pathCanUndo,
    canRedo: pathCanRedo,
    beginCoalescing,
    endCoalescing,
    selectedPathIds,
    setSelectedPathIds,
    finishBrushPath,
    handleFinishPenPath,
    handleCancelPenPath,
    handleFinishLinePath,
    handleCancelLinePath,
    handleReorder,
    handleDeleteSelected,
    currentBrushPath,
    setCurrentBrushPath,
    currentPenPath,
    setCurrentPenPath,
    currentLinePath,
    setCurrentLinePath,
  } = pathState;

  const currentDocumentSignature = useMemo(
    () => createDocumentSignature(frames, uiState.backgroundColor, uiState.fps),
    [frames, uiState.backgroundColor, uiState.fps]
  );

  useEffect(() => {
    if (!appState.croppingState) {
      cropImageCacheRef.current = null;
      cropMagicWandResultRef.current = null;
      cropMagicWandMaskRef.current = null;
      cropMagicWandSampleRef.current = null;
      cropManualDraftRef.current = null;
      setCropSelectionHistory({ past: [], future: [] });
      setAppState(s => ({ ...s, cropSelectionContours: null, cropPendingCutoutSrc: null, cropManualDraft: null }));
      return;
    }

    let isCancelled = false;
    const load = async () => {
      const { originalPath } = appState.croppingState!;
      try {
        const src = cropEditedSrc ?? (await getImageDataUrl(originalPath));
        if (isCancelled) return;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = src;
        await new Promise((resolve, reject) => {
          img.onload = () => resolve(undefined);
          img.onerror = (err) => reject(err);
        });
        if (isCancelled) return;
        const canvas = document.createElement('canvas');
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          console.warn('Unable to acquire 2D context for magic wand preparation');
          return;
        }
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, width, height);
        cropImageCacheRef.current = { naturalWidth: width, naturalHeight: height, imageData: data };
      } catch (err) {
        console.error('Failed to load image for cropping', err);
      }
    };

    void load();

    return () => {
      isCancelled = true;
    };
  }, [appState.croppingState?.pathId, cropEditedSrc, appState.croppingState?.originalPath.fileId]);

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
  const setActiveFileHandle = useCallback((val: AppState['activeFileHandle'] | ((prev: AppState['activeFileHandle']) => AppState['activeFileHandle'])) => setAppState(s => ({ ...s, activeFileHandle: typeof val === 'function' ? val(s.activeFileHandle) : val })), []);
  const setActiveFileName = useCallback((val: AppState['activeFileName'] | ((prev: AppState['activeFileName']) => AppState['activeFileName'])) => setAppState(s => ({ ...s, activeFileName: typeof val === 'function' ? val(s.activeFileName) : val })), []);
  const setIsLoading = useCallback((val: AppState['isLoading'] | ((prev: AppState['isLoading']) => AppState['isLoading'])) => setAppState(s => ({ ...s, isLoading: typeof val === 'function' ? val(s.isLoading) : val })), []);
  const setConfirmationDialog = useCallback((val: AppState['confirmationDialog'] | ((prev: AppState['confirmationDialog']) => AppState['confirmationDialog'])) => setAppState(s => ({ ...s, confirmationDialog: typeof val === 'function' ? val(s.confirmationDialog) : val })), []);
  const setCroppingState = useCallback((val: AppState['croppingState'] | ((prev: AppState['croppingState']) => AppState['croppingState'])) => setAppState(s => ({ ...s, croppingState: typeof val === 'function' ? val(s.croppingState) : val })), []);
  const setCurrentCropRect = useCallback((val: AppState['currentCropRect'] | ((prev: AppState['currentCropRect']) => AppState['currentCropRect'])) => setAppState(s => ({ ...s, currentCropRect: typeof val === 'function' ? val(s.currentCropRect) : val })), []);
  const clearManualDraftState = useCallback(() => {
    cropManualDraftRef.current = null;
    setAppState(s => ({ ...s, cropManualDraft: null }));
  }, []);

  const setCropTool = useCallback((tool: AppState['cropTool']) => {
    if (tool !== 'magic-wand') {
      clearManualDraftState();
    }
    setAppState(s => ({ ...s, cropTool: tool, cropManualDraft: tool === 'magic-wand' ? s.cropManualDraft : null }));
  }, [clearManualDraftState]);
  const setCropMagicWandOptions = useCallback((val: Partial<AppState['cropMagicWandOptions']>) => setAppState(s => ({
    ...s,
    cropMagicWandOptions: {
      ...s.cropMagicWandOptions,
      ...val,
      featherRadius: val.featherRadius !== undefined
        ? Math.min(100, Math.max(0, Math.round(val.featherRadius)))
        : s.cropMagicWandOptions.featherRadius,
    },
  })), []);
  const setCropSelectionMode = useCallback((mode: AppState['cropSelectionMode']) => {
    clearManualDraftState();
    setAppState(s => ({ ...s, cropSelectionMode: mode }));
  }, [clearManualDraftState]);
  const setCropBrushSize = useCallback((size: number) => {
    setAppState(s => ({
      ...s,
      cropBrushSize: Math.min(200, Math.max(4, Math.round(size))),
    }));
  }, []);
  const setCropSelectionOperation = useCallback((op: AppState['cropSelectionOperation']) => {
    setAppState(s => ({ ...s, cropSelectionOperation: op }));
  }, []);

  const updateTextEditor = useCallback((text: string) => {
    setAppState(s => {
      if (!s.textEditor) {
        return s;
      }
      if (s.textEditor.text === text) {
        return s;
      }
      return { ...s, textEditor: { ...s.textEditor, text } };
    });
  }, []);

  const finalizeTextEditor = useCallback((options: { cancel?: boolean } = {}) => {
    const editor = appState.textEditor;
    if (!editor) {
      return;
    }

    if (options.cancel) {
      setAppState(s => ({ ...s, textEditor: null }));
      if (editor.mode === 'create') {
        toolbarState.setTool('selection');
      }
      return;
    }

    const trimmed = editor.text.trim();
    if (!trimmed) {
      setAppState(s => ({ ...s, textEditor: null }));
      if (editor.mode === 'create') {
        toolbarState.setTool('selection');
      }
      return;
    }

    const bounds = measureTextBounds(
      editor.text,
      editor.fontSize,
      editor.fontFamily,
      editor.lineHeight || DEFAULT_TEXT_LINE_HEIGHT,
    );

    if (editor.mode === 'create') {
      const newId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const newTextPath: TextData = {
        id: newId,
        tool: 'text',
        x: editor.x,
        y: editor.y,
        width: bounds.width,
        height: bounds.height,
        text: editor.text,
        fontSize: editor.fontSize,
        fontFamily: editor.fontFamily,
        textAlign: editor.textAlign,
        lineHeight: editor.lineHeight || DEFAULT_TEXT_LINE_HEIGHT,
        color: editor.color,
        opacity: editor.opacity,
        fill: 'transparent',
        fillGradient: null,
        fillStyle: 'solid',
        strokeWidth: 0,
        strokeLineDash: undefined,
        strokeLineCapStart: undefined,
        strokeLineCapEnd: undefined,
        endpointSize: undefined,
        endpointFill: undefined,
        isRough: false,
        roughness: 0,
        bowing: 0,
        fillWeight: 0,
        hachureAngle: 0,
        hachureGap: 0,
        curveTightness: 0,
        curveStepCount: 0,
        preserveVertices: false,
        disableMultiStroke: true,
        disableMultiStrokeFill: true,
        blur: 0,
        shadowEnabled: false,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowBlur: 0,
        shadowColor: 'rgba(0,0,0,0)',
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
      };

      setPaths(prev => [...prev, newTextPath]);
      setSelectedPathIds([newId]);
      toolbarState.setTool('selection');
    } else if (editor.id) {
      setPaths(prev => prev.map(path => {
        if (path.id !== editor.id) {
          return path;
        }
        const existing = path as TextData;
        return {
          ...existing,
          text: editor.text,
          width: bounds.width,
          height: bounds.height,
          fontSize: editor.fontSize,
          fontFamily: editor.fontFamily,
          textAlign: editor.textAlign,
          lineHeight: editor.lineHeight || existing.lineHeight || DEFAULT_TEXT_LINE_HEIGHT,
          color: editor.color,
          opacity: editor.opacity,
        } as TextData;
      }));
      setSelectedPathIds([editor.id]);
    }

    setAppState(s => ({ ...s, textEditor: null }));
  }, [appState.textEditor, setAppState, setPaths, setSelectedPathIds, toolbarState.setTool]);

  const openTextEditorAt = useCallback((point: Point) => {
    finalizeTextEditor();
    const color = toolbarState.drawingColor;
    const opacity = toolbarState.drawingOpacity ?? 1;
    setAppState(s => ({
      ...s,
      textEditor: {
        id: null,
        mode: 'create',
        x: point.x,
        y: point.y,
        text: '',
        fontSize: DEFAULT_TEXT_FONT_SIZE,
        fontFamily: DEFAULT_TEXT_FONT_FAMILY,
        textAlign: 'left',
        lineHeight: DEFAULT_TEXT_LINE_HEIGHT,
        color,
        opacity,
      },
    }));
  }, [finalizeTextEditor, toolbarState.drawingColor, toolbarState.drawingOpacity, setAppState]);

  const editTextPath = useCallback((path: TextData) => {
    finalizeTextEditor();
    setSelectedPathIds([path.id]);
    setAppState(s => ({
      ...s,
      textEditor: {
        id: path.id,
        mode: 'edit',
        x: path.x,
        y: path.y,
        text: path.text,
        fontSize: path.fontSize,
        fontFamily: path.fontFamily || DEFAULT_TEXT_FONT_FAMILY,
        textAlign: path.textAlign,
        lineHeight: path.lineHeight || DEFAULT_TEXT_LINE_HEIGHT,
        color: path.color,
        opacity: path.opacity ?? 1,
      },
    }));
  }, [finalizeTextEditor, setAppState, setSelectedPathIds]);
  const updateMagicWandSelection = useCallback(
    (mask: MagicWandMask | null, options: { saveToHistory?: boolean } = {}) => {
      const { saveToHistory = true } = options;
      const previousMask = cropMagicWandMaskRef.current;
      const normalizedMask = cloneMagicWandMask(mask);
      const maskChanged = !areMasksEqual(previousMask, normalizedMask);

      if (saveToHistory && maskChanged) {
        setCropSelectionHistory(history => ({
          past: [...history.past, cloneMagicWandMask(previousMask)],
          future: [],
        }));
      }

      cropMagicWandMaskRef.current = normalizedMask;

      if (!normalizedMask) {
        cropMagicWandResultRef.current = null;
        cropMagicWandSampleRef.current = null;
        setAppState(s => ({ ...s, cropSelectionContours: null, cropPendingCutoutSrc: null }));
        return;
      }

      const cropping = appState.croppingState;
      const cache = cropImageCacheRef.current;
      if (!cropping || !cache) {
        return;
      }

      const { image, contours } = applyMaskToImage(
        cache.imageData,
        normalizedMask,
        appState.cropMagicWandOptions.featherRadius,
      );
      const previewCanvas = document.createElement('canvas');
      previewCanvas.width = cache.naturalWidth;
      previewCanvas.height = cache.naturalHeight;
      const previewCtx = previewCanvas.getContext('2d');
      if (!previewCtx) {
        console.warn('Unable to preview magic wand selection');
        return;
      }

      previewCtx.putImageData(image, 0, 0);
      const newSrc = previewCanvas.toDataURL();

      cropMagicWandResultRef.current = { imageData: image, newSrc };

      const contourPaths = buildContourPaths(contours, cropping.originalPath, cache.naturalWidth, cache.naturalHeight);
      setAppState(s => ({
        ...s,
        cropSelectionContours: contourPaths,
        cropPendingCutoutSrc: newSrc,
      }));
    },
    [appState.croppingState, appState.cropMagicWandOptions.featherRadius, setAppState]
  );
  const clearCropSelection = useCallback(() => {
    cropManualDraftRef.current = null;
    updateMagicWandSelection(null, { saveToHistory: false });
    setCropSelectionHistory({ past: [], future: [] });
    setAppState(s => ({ ...s, cropManualDraft: null }));
  }, [updateMagicWandSelection]);

  const performMagicWandSelection = useCallback((pixel: { x: number; y: number }) => {
    const cropping = appState.croppingState;
    if (!cropping || appState.cropTool !== 'magic-wand') return;
    const cache = cropImageCacheRef.current;
    if (!cache) return;

    const { threshold, contiguous } = appState.cropMagicWandOptions;
    const result = removeBackground(cache.imageData, { x: pixel.x, y: pixel.y, threshold, contiguous });
    clearManualDraftState();

    const operation = appState.cropSelectionOperation;

    if (!result.mask) {
      if (operation === 'replace' || !cropMagicWandMaskRef.current) {
        updateMagicWandSelection(null);
      }
      return;
    }

    let nextMask: MagicWandMask | null = null;
    if (operation === 'replace') {
      nextMask = result.mask;
    } else if (!cropMagicWandMaskRef.current) {
      if (operation === 'add') {
        nextMask = result.mask;
      } else {
        return;
      }
    } else {
      nextMask = combineMasks(cropMagicWandMaskRef.current, result.mask, operation);
    }

    updateMagicWandSelection(nextMask);
  }, [
    appState.cropSelectionOperation,
    appState.croppingState,
    appState.cropMagicWandOptions,
    appState.cropTool,
    clearManualDraftState,
    updateMagicWandSelection,
  ]);

  const applyManualSelection = useCallback((points: Point[], operation: 'add' | 'subtract' | 'replace') => {
    const cropping = appState.croppingState;
    if (!cropping || appState.cropTool !== 'magic-wand') return;
    const cache = cropImageCacheRef.current;
    if (!cache) return;

    const pixelPoints = points
      .map(pt => mapWorldPointToImagePixel(pt, cropping.originalPath, cache.naturalWidth, cache.naturalHeight, { clampToBounds: true }))
      .filter((pt): pt is { x: number; y: number } => pt !== null);

    if (pixelPoints.length < 3) return;

    const deduped = pixelPoints.filter((pt, idx, arr) => idx === 0 || pt.x !== arr[idx - 1].x || pt.y !== arr[idx - 1].y);
    if (deduped.length < 3) return;

    const mask = createMaskFromPolygon(cache.naturalWidth, cache.naturalHeight, deduped);
    if (!mask) {
      if (operation === 'replace') {
        updateMagicWandSelection(null);
      }
      return;
    }

    let nextMask: MagicWandMask | null = null;
    if (operation === 'replace') {
      nextMask = mask;
    } else if (!cropMagicWandMaskRef.current) {
      if (operation === 'add') {
        nextMask = mask;
      } else {
        return;
      }
    } else {
      nextMask = combineMasks(cropMagicWandMaskRef.current, mask, operation);
    }

    updateMagicWandSelection(nextMask);
    cropMagicWandSampleRef.current = null;
  }, [appState.croppingState, appState.cropTool, updateMagicWandSelection]);

  const applyBrushSelection = useCallback((points: Point[], brushSize: number, operation: 'add' | 'subtract' | 'replace') => {
    const cropping = appState.croppingState;
    if (!cropping || appState.cropTool !== 'magic-wand') return;
    const cache = cropImageCacheRef.current;
    if (!cache) return;

    const pixelPoints = points
      .map(pt => mapWorldPointToImagePixel(pt, cropping.originalPath, cache.naturalWidth, cache.naturalHeight))
      .filter((pt): pt is { x: number; y: number } => pt !== null);

    if (pixelPoints.length === 0) return;

    const radiusWorld = Math.max(0, brushSize / 2);
    if (radiusWorld === 0) return;

    const scaleX = cache.naturalWidth / cropping.originalPath.width;
    const scaleY = cache.naturalHeight / cropping.originalPath.height;
    const scaleSamples = [scaleX, scaleY].filter((value) => Number.isFinite(value) && value > 0);
    const averageScale = scaleSamples.length > 0
      ? scaleSamples.reduce((sum, value) => sum + value, 0) / scaleSamples.length
      : 1;
    const pixelRadius = Math.max(1, Math.round(radiusWorld * averageScale));

    const mask = createMaskFromBrushStroke(cache.naturalWidth, cache.naturalHeight, pixelPoints, pixelRadius);
    if (!mask) {
      if (operation === 'replace') {
        updateMagicWandSelection(null);
      }
      return;
    }

    let nextMask: MagicWandMask | null = null;
    if (operation === 'replace') {
      nextMask = mask;
    } else if (!cropMagicWandMaskRef.current) {
      if (operation === 'add') {
        nextMask = mask;
      } else {
        return;
      }
    } else {
      nextMask = combineMasks(cropMagicWandMaskRef.current, mask, operation);
    }

    updateMagicWandSelection(nextMask);
    cropMagicWandSampleRef.current = null;
  }, [appState.croppingState, appState.cropTool, updateMagicWandSelection]);

  const invertMagicWandSelection = useCallback(() => {
    const cropping = appState.croppingState;
    if (!cropping || appState.cropTool !== 'magic-wand') return;
    const cache = cropImageCacheRef.current;
    if (!cache) return;

    clearManualDraftState();

    let nextMask: MagicWandMask | null = null;
    if (!cropMagicWandMaskRef.current) {
      const { naturalWidth, naturalHeight } = cache;
      if (naturalWidth <= 0 || naturalHeight <= 0) {
        return;
      }
      const data = new Uint8Array(naturalWidth * naturalHeight);
      data.fill(1);
      nextMask = {
        data,
        width: naturalWidth,
        height: naturalHeight,
        bounds: { minX: 0, minY: 0, maxX: naturalWidth - 1, maxY: naturalHeight - 1 },
      };
    } else {
      nextMask = invertMask(cropMagicWandMaskRef.current);
    }

    updateMagicWandSelection(nextMask);
    cropMagicWandSampleRef.current = null;
  }, [
    appState.cropTool,
    appState.croppingState,
    clearManualDraftState,
    updateMagicWandSelection,
  ]);

  const selectMagicWandAt = useCallback((point: Point) => {
    const cropping = appState.croppingState;
    if (!cropping || appState.cropTool !== 'magic-wand') return;
    const cache = cropImageCacheRef.current;
    if (!cache) return;

    const local = mapWorldPointToImagePixel(point, cropping.originalPath, cache.naturalWidth, cache.naturalHeight);
    if (!local) return;
    cropMagicWandSampleRef.current = { x: local.x, y: local.y };
    performMagicWandSelection(local);
  }, [appState.croppingState, appState.cropTool, performMagicWandSelection]);

  useEffect(() => {
    if (!cropMagicWandSampleRef.current) return;
    if (!appState.croppingState || appState.cropTool !== 'magic-wand') return;
    if (appState.cropSelectionOperation !== 'replace') return;
    performMagicWandSelection(cropMagicWandSampleRef.current);
  }, [
    appState.cropMagicWandOptions,
    appState.cropTool,
    appState.croppingState,
    appState.cropSelectionOperation,
    performMagicWandSelection,
  ]);

  useEffect(() => {
    if (!appState.croppingState || appState.cropTool !== 'magic-wand') return;
    if (!cropMagicWandMaskRef.current) return;
    updateMagicWandSelection(cropMagicWandMaskRef.current, { saveToHistory: false });
  }, [
    appState.cropMagicWandOptions.featherRadius,
    appState.cropTool,
    appState.croppingState,
    updateMagicWandSelection,
  ]);

  const applyMagicWandSelection = useCallback(() => {
    const cropping = appState.croppingState;
    if (!cropping || !cropMagicWandResultRef.current) return;
    const result = cropMagicWandResultRef.current;
    const { newSrc, imageData } = result;

    void (async () => {
      const filesStore = useFilesStore.getState();
      const { fileId } = await filesStore.ingestDataUrl(newSrc);

      setPaths(prev => prev.map(p =>
        p.id === cropping.pathId ? { ...(p as PathImageData), fileId } : p
      ));
      setCroppingState(prev => (
        prev && prev.pathId === cropping.pathId
          ? { ...prev, originalPath: { ...prev.originalPath, fileId } }
          : prev
      ));

      if (cropImageCacheRef.current) {
        cropImageCacheRef.current = {
          ...cropImageCacheRef.current,
          imageData,
        };
      }
      setCropEditedSrc(newSrc);
      clearCropSelection();
    })();
  }, [appState.croppingState, setPaths, setCroppingState, clearCropSelection]);

  const cutMagicWandSelection = useCallback(() => {
    const cropping = appState.croppingState;
    const mask = cropMagicWandMaskRef.current;
    const result = cropMagicWandResultRef.current;
    const cache = cropImageCacheRef.current;
    if (!cropping || !mask || !result || !cache || !mask.bounds) return;

    const { imageData, newSrc } = result;
    const { minX, minY, maxX, maxY } = mask.bounds;
    const pixelWidth = maxX - minX + 1;
    const pixelHeight = maxY - minY + 1;
    if (pixelWidth <= 0 || pixelHeight <= 0) {
      clearCropSelection();
      return;
    }

    void (async () => {
      const selectionCanvas = document.createElement('canvas');
      selectionCanvas.width = pixelWidth;
      selectionCanvas.height = pixelHeight;
      const selectionCtx = selectionCanvas.getContext('2d');
      if (!selectionCtx) {
        console.warn('Unable to acquire 2D context for cut selection');
        return;
      }

      const selectionImageData = selectionCtx.createImageData(pixelWidth, pixelHeight);
      const destData = selectionImageData.data;
      const sourceData = cache.imageData.data;
      const maskData = mask.data;
      const maskWidth = mask.width;
      const sourceWidth = cache.naturalWidth;

      for (let y = minY; y <= maxY; y++) {
        const maskRowOffset = y * maskWidth;
        const sourceRowOffset = y * sourceWidth;
        const destRowOffset = (y - minY) * pixelWidth;
        for (let x = minX; x <= maxX; x++) {
          if (!maskData[maskRowOffset + x]) continue;
          const sourceIndex = (sourceRowOffset + x) * 4;
          const destIndex = (destRowOffset + (x - minX)) * 4;
          destData[destIndex] = sourceData[sourceIndex];
          destData[destIndex + 1] = sourceData[sourceIndex + 1];
          destData[destIndex + 2] = sourceData[sourceIndex + 2];
          destData[destIndex + 3] = sourceData[sourceIndex + 3];
        }
      }

      selectionCtx.putImageData(selectionImageData, 0, 0);

      const filesStore = useFilesStore.getState();
      const [cutResult, updatedImage] = await Promise.all([
        filesStore.ingestDataUrl(selectionCanvas.toDataURL()),
        filesStore.ingestDataUrl(newSrc),
      ]);

      const scaleX = cropping.originalPath.width / cache.naturalWidth;
      const scaleY = cropping.originalPath.height / cache.naturalHeight;
      const selectionRect = {
        x: cropping.originalPath.x + minX * scaleX,
        y: cropping.originalPath.y + minY * scaleY,
        width: pixelWidth * scaleX,
        height: pixelHeight * scaleY,
      };

      const rotation = cropping.originalPath.rotation ?? 0;
      const oldCenter = {
        x: cropping.originalPath.x + cropping.originalPath.width / 2,
        y: cropping.originalPath.y + cropping.originalPath.height / 2,
      };
      const newCenterLocal = {
        x: selectionRect.width / 2,
        y: selectionRect.height / 2,
      };
      const offsetLocal = {
        x: selectionRect.x - cropping.originalPath.x - (cropping.originalPath.width / 2 - newCenterLocal.x),
        y: selectionRect.y - cropping.originalPath.y - (cropping.originalPath.height / 2 - newCenterLocal.y),
      };
      const rotatedOffset = rotatePoint(offsetLocal, { x: 0, y: 0 }, rotation);
      const selectionCenter = {
        x: oldCenter.x + rotatedOffset.x,
        y: oldCenter.y + rotatedOffset.y,
      };
      const newX = selectionCenter.x - newCenterLocal.x;
      const newY = selectionCenter.y - newCenterLocal.y;

      const { src: _legacySrc, ...baseImage } = cropping.originalPath;
      const cutLayerId = `${Date.now()}-cut-${Math.random().toString(36).slice(2, 8)}`;
      const newLayer: PathImageData = {
        ...baseImage,
        id: cutLayerId,
        fileId: cutResult.fileId,
        x: newX,
        y: newY,
        width: selectionRect.width,
        height: selectionRect.height,
      };

      const applyCutToPaths = (paths: AnyPath[]): { result: AnyPath[]; handled: boolean } => {
        let handled = false;
        const next: AnyPath[] = [];

        for (const path of paths) {
          if (path.id === cropping.pathId && path.tool === 'image') {
            next.push({ ...(path as PathImageData), fileId: updatedImage.fileId });
            next.push(newLayer);
            handled = true;
          } else if (path.tool === 'group') {
            const group = path as GroupData;
            const childResult = applyCutToPaths(group.children);
            if (childResult.handled) {
              next.push({ ...group, children: childResult.result });
              handled = true;
            } else {
              next.push(path);
            }
          } else {
            next.push(path);
          }
        }

        return { result: handled ? next : paths, handled };
      };

      setPaths(prev => {
        const { result, handled } = applyCutToPaths(prev);
        return handled ? result : prev;
      });

      setCroppingState(prev => (
        prev && prev.pathId === cropping.pathId
          ? { ...prev, originalPath: { ...prev.originalPath, fileId: updatedImage.fileId } }
          : prev
      ));

      if (cropImageCacheRef.current) {
        cropImageCacheRef.current = {
          ...cropImageCacheRef.current,
          imageData,
        };
      }

      setCropEditedSrc(newSrc);
      clearCropSelection();
    })();
  }, [appState.croppingState, clearCropSelection, setPaths, setCroppingState, setCropEditedSrc]);

  const markDocumentSaved = useCallback((signature: string) => {
    setAppState(prev => ({ ...prev, lastSavedDocumentSignature: signature, hasUnsavedChanges: false }));
  }, []);

  const pushCropHistory = useCallback((rect: BBox) => {
    setCropHistory(h => ({ past: [...h.past, rect], future: [] }));
  }, []);

  const undoCropRect = useCallback(() => {
    if (!appState.currentCropRect) return;
    setCropHistory(h => {
      if (h.past.length === 0) return h;
      const prev = h.past[h.past.length - 1];
      setCurrentCropRect(prev);
      return { past: h.past.slice(0, -1), future: [appState.currentCropRect as BBox, ...h.future] };
    });
  }, [appState.currentCropRect, setCurrentCropRect]);

  const redoCropRect = useCallback(() => {
    if (!appState.currentCropRect) return;
    setCropHistory(h => {
      if (h.future.length === 0) return h;
      const [next, ...rest] = h.future;
      setCurrentCropRect(next);
      return { past: [...h.past, appState.currentCropRect as BBox], future: rest };
    });
  }, [appState.currentCropRect, setCurrentCropRect]);

  /**
   * 撤销最近一次魔棒蒙版编辑。
   */
  const undoSelectionMask = useCallback(() => {
    setCropSelectionHistory(history => {
      if (history.past.length === 0) {
        return history;
      }
      const previous = history.past[history.past.length - 1];
      const current = cloneMagicWandMask(cropMagicWandMaskRef.current);
      updateMagicWandSelection(previous, { saveToHistory: false });
      return { past: history.past.slice(0, -1), future: [current, ...history.future] };
    });
  }, [updateMagicWandSelection]);

  /**
   * 重做最近一次被撤销的魔棒蒙版编辑。
   */
  const redoSelectionMask = useCallback(() => {
    setCropSelectionHistory(history => {
      if (history.future.length === 0) {
        return history;
      }
      const [next, ...rest] = history.future;
      const current = cloneMagicWandMask(cropMagicWandMaskRef.current);
      updateMagicWandSelection(next, { saveToHistory: false });
      return { past: [...history.past, current], future: rest };
    });
  }, [updateMagicWandSelection]);

  const trimTransparentEdges = useCallback(() => {
    const cropping = appState.croppingState;
    const cache = cropImageCacheRef.current;
    if (!cropping || !cache) return;

    const bounds = getOpaqueBounds(cache.imageData);
    if (!bounds) return;

    const scaleX = cropping.originalPath.width / cache.naturalWidth;
    const scaleY = cropping.originalPath.height / cache.naturalHeight;
    const newRect: BBox = {
      x: cropping.originalPath.x + bounds.x * scaleX,
      y: cropping.originalPath.y + bounds.y * scaleY,
      width: bounds.width * scaleX,
      height: bounds.height * scaleY,
    };

    const prevRect = appState.currentCropRect ?? {
      x: cropping.originalPath.x,
      y: cropping.originalPath.y,
      width: cropping.originalPath.width,
      height: cropping.originalPath.height,
    };

    const delta = Math.abs(prevRect.x - newRect.x)
      + Math.abs(prevRect.y - newRect.y)
      + Math.abs(prevRect.width - newRect.width)
      + Math.abs(prevRect.height - newRect.height);
    if (delta < 1e-6) return;

    pushCropHistory(prevRect);
    setCurrentCropRect(newRect);
  }, [appState.croppingState, appState.currentCropRect, pushCropHistory, setCurrentCropRect]);

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
    () => frames.length > 1 || frames.some(f => (f.paths ?? []).length > 0),
    [frames]
  );
  const handleClear = useCallback(() => {
    if (canClear) {
      showConfirmation(
        '清空画布',
        '确定要清空整个画布吗？此操作无法撤销。',
        () => {
          setPaths([]);
          setSelectedPathIds([]);
        },
        '清空'
      );
    }
  }, [canClear, setPaths, showConfirmation, setSelectedPathIds]);

  const handleClearAllData = useCallback(() => {
    if (!canClearAllData) return;
    showConfirmation(
      '清空数据',
      '确定要清空所有动画帧中的数据吗？此操作无法撤销。',
      () => {
        const resetFrames = [{ paths: [] } as Frame];
        // Reset the timeline to a single empty frame so no leftover thumbnails remain
        handleLoadFile(resetFrames, 0);
        setSelectedPathIds([]);
      },
      '清空'
    );
  }, [canClearAllData, handleLoadFile, showConfirmation, setSelectedPathIds]);

  const groupIsolation = useGroupIsolation(pathState);
  const { activePaths, activePathState } = groupIsolation;

  const viewTransform = useViewTransform();
  const requestFitToContent = useViewTransformStore(s => s.requestFitToContent);
  const toolbarState = useToolsStore(activePaths, selectedPathIds, activePathState.setPaths, setSelectedPathIds, beginCoalescing, endCoalescing);

  const handleCropManualPointerDown = useCallback((point: Point, event: React.PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;
    if (appState.cropSelectionMode === 'magic-wand') return;

    const baseOperation = appState.cropSelectionOperation;
    const operation = event.altKey ? (baseOperation === 'add' ? 'subtract' : 'add') : baseOperation;

    if (appState.cropSelectionMode === 'freehand') {
      const draft = { mode: 'freehand' as const, operation, points: [point] };
      cropManualDraftRef.current = draft;
      setAppState(s => ({ ...s, cropManualDraft: draft }));
      return;
    }

    if (appState.cropSelectionMode === 'brush') {
      const brushDraft: CropManualDraft = {
        mode: 'brush',
        operation,
        points: [point],
        brushSize: appState.cropBrushSize,
      };
      cropManualDraftRef.current = brushDraft;
      setAppState(s => ({ ...s, cropManualDraft: brushDraft }));
      return;
    }

    const existing = cropManualDraftRef.current;
    if (!existing || existing.mode !== 'polygon') {
      const draft = { mode: 'polygon' as const, operation, points: [point] };
      cropManualDraftRef.current = draft;
      setAppState(s => ({ ...s, cropManualDraft: draft }));
      return;
    }

    const nextPoints = [...existing.points, point];
    const scale = viewTransform.viewTransform.scale || 1;
    const closeThreshold = 12 / Math.max(scale, 0.001);
    const firstPoint = nextPoints[0];
    const shouldCloseByDistance = nextPoints.length >= 3 && dist(point, firstPoint) <= closeThreshold;
    const shouldCloseByDoubleClick = event.detail >= 2;

    const normalizedPoints = shouldCloseByDistance
      ? [...nextPoints.slice(0, -1), firstPoint]
      : nextPoints;

    const nextDraft = { mode: 'polygon' as const, operation, points: normalizedPoints };
    cropManualDraftRef.current = nextDraft;
    setAppState(s => ({ ...s, cropManualDraft: { ...nextDraft, previewPoint: undefined } }));

    if ((shouldCloseByDistance || shouldCloseByDoubleClick) && normalizedPoints.length >= 3) {
      clearManualDraftState();
      applyManualSelection(normalizedPoints, operation);
    }
  }, [
    appState.cropBrushSize,
    appState.cropSelectionMode,
    appState.cropSelectionOperation,
    applyManualSelection,
    clearManualDraftState,
    setAppState,
    viewTransform.viewTransform.scale,
  ]);

  const handleCropManualPointerMove = useCallback((point: Point) => {
    const draft = cropManualDraftRef.current;
    if (!draft) return;

    if (draft.mode === 'freehand') {
      const last = draft.points[draft.points.length - 1];
      if (last && last.x === point.x && last.y === point.y) return;
      const nextPoints = [...draft.points, point];
      cropManualDraftRef.current = { ...draft, points: nextPoints };
      setAppState(s => ({ ...s, cropManualDraft: { mode: 'freehand', operation: draft.operation, points: nextPoints } }));
      return;
    }

    if (draft.mode === 'brush') {
      const last = draft.points[draft.points.length - 1];
      const threshold = Math.max(1, draft.brushSize / 8);
      if (last && dist(last, point) < threshold) {
        return;
      }
      const nextPoints = [...draft.points, point];
      const nextDraft: CropManualDraft = { ...draft, points: nextPoints };
      cropManualDraftRef.current = nextDraft;
      setAppState(s => ({ ...s, cropManualDraft: nextDraft }));
      return;
    }

    setAppState(s => {
      const current = s.cropManualDraft;
      if (!current || current.mode !== 'polygon') return s;
      if (current.previewPoint && current.previewPoint.x === point.x && current.previewPoint.y === point.y) return s;
      return { ...s, cropManualDraft: { ...current, previewPoint: point } };
    });
  }, [setAppState]);

  const handleCropManualPointerUp = useCallback((_event?: React.PointerEvent<SVGSVGElement>) => {
    const draft = cropManualDraftRef.current;
    if (!draft) return;

    if (draft.mode === 'freehand') {
      const points = draft.points;
      clearManualDraftState();
      if (points.length < 2) return;
      const closedPoints = points.length >= 3 ? [...points, points[0]] : points;
      applyManualSelection(closedPoints, draft.operation);
      return;
    }

    if (draft.mode === 'brush') {
      const points = draft.points;
      const brushSize = draft.brushSize;
      const operation = draft.operation;
      clearManualDraftState();
      if (points.length === 0) return;
      applyBrushSelection(points, brushSize, operation);
      return;
    }

    setAppState(s => {
      const current = s.cropManualDraft;
      if (!current || current.mode !== 'polygon' || !current.previewPoint) return s;
      return { ...s, cropManualDraft: { ...current, previewPoint: undefined } };
    });
  }, [applyBrushSelection, applyManualSelection, clearManualDraftState, setAppState]);

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

  const confirmCrop = useCallback(() => {
    if (!appState.croppingState || !appState.currentCropRect) return;
    const { pathId, originalPath } = appState.croppingState;
    const cropRect = appState.currentCropRect;
    const performCrop = async () => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      const baseSrc = cropEditedSrc ?? (await getImageDataUrl(originalPath));
      img.src = baseSrc;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = err => reject(err);
      });

      const naturalWidth = img.naturalWidth || img.width;
      const naturalHeight = img.naturalHeight || img.height;
      const scaleX = naturalWidth / originalPath.width;
      const scaleY = naturalHeight / originalPath.height;

      const sourceX = (cropRect.x - originalPath.x) * scaleX;
      const sourceY = (cropRect.y - originalPath.y) * scaleY;
      const sourceWidth = Math.max(1, Math.round(cropRect.width * scaleX));
      const sourceHeight = Math.max(1, Math.round(cropRect.height * scaleY));

      const canvas = document.createElement('canvas');
      canvas.width = sourceWidth;
      canvas.height = sourceHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, sourceWidth, sourceHeight);

      const newSrc = canvas.toDataURL();
      const filesStore = useFilesStore.getState();
      const { fileId } = await filesStore.ingestDataUrl(newSrc);
      const rotation = originalPath.rotation ?? 0;

      const oldCenter = {
        x: originalPath.x + originalPath.width / 2,
        y: originalPath.y + originalPath.height / 2,
      };
      const newCenterLocal = {
        x: cropRect.width / 2,
        y: cropRect.height / 2,
      };
      const offsetLocal = {
        x: cropRect.x - originalPath.x - (originalPath.width / 2 - newCenterLocal.x),
        y: cropRect.y - originalPath.y - (originalPath.height / 2 - newCenterLocal.y),
      };
      const rotatedOffset = rotatePoint(offsetLocal, { x: 0, y: 0 }, rotation);
      const newCenter = {
        x: oldCenter.x + rotatedOffset.x,
        y: oldCenter.y + rotatedOffset.y,
      };

      const newX = newCenter.x - newCenterLocal.x;
      const newY = newCenter.y - newCenterLocal.y;

      activePathState.setPaths(prev => prev.map(p =>
        p.id === pathId
          ? { ...(p as PathImageData), fileId, x: newX, y: newY, width: cropRect.width, height: cropRect.height, rotation }
          : p
      ));

      setCroppingState(null);
      setCurrentCropRect(null);
      setCropHistory({ past: [], future: [] });
      setCropEditedSrc(null);
      clearCropSelection();
      setAppState(prev => ({ ...prev, cropTool: 'crop' }));
      endCoalescing();
    };

    void performCrop();
  }, [
    appState.croppingState,
    appState.currentCropRect,
    activePathState,
    endCoalescing,
    setCroppingState,
    setCurrentCropRect,
    cropEditedSrc,
    clearCropSelection,
  ]);

  const cancelCrop = useCallback(() => {
    clearCropSelection();
    setCropEditedSrc(null);
    setAppState(prev => ({ ...prev, cropTool: 'crop' }));
    setCroppingState(null);
    setCurrentCropRect(null);
    setCropHistory({ past: [], future: [] });
    endCoalescing();
  }, [setCroppingState, setCurrentCropRect, endCoalescing, clearCropSelection]);

  const handleUndo = useCallback(() => {
    if (appState.croppingState) {
      if (cropSelectionHistory.past.length > 0) {
        undoSelectionMask();
        return;
      }
      if (cropHistory.past.length > 0) {
        undoCropRect();
        return;
      }
      cancelCrop();
      return;
    }
    undo();
  }, [
    appState.croppingState,
    cropSelectionHistory.past.length,
    cropHistory.past.length,
    undoSelectionMask,
    undoCropRect,
    cancelCrop,
    undo,
  ]);

  const handleRedo = useCallback(() => {
    if (appState.croppingState) {
      if (cropSelectionHistory.future.length > 0) {
        redoSelectionMask();
        return;
      }
      if (cropHistory.future.length > 0) {
        redoCropRect();
        return;
      }
      return;
    }
    redo();
  }, [
    appState.croppingState,
    cropSelectionHistory.future.length,
    cropHistory.future.length,
    redoSelectionMask,
    redoCropRect,
    redo,
  ]);

  const canUndo = pathCanUndo || appState.croppingState !== null;
  const canRedo =
    pathCanRedo ||
    (appState.croppingState !== null && (cropHistory.future.length > 0 || cropSelectionHistory.future.length > 0));

  const onDoubleClick = useCallback((path: AnyPath) => {
      if (toolbarState.selectionMode !== 'move') return;
      if (path.tool === 'group') { groupIsolation.handleGroupDoubleClick(path.id); }
      else if (path.tool === 'text') {
          editTextPath(path as TextData);
      }
      else if (path.tool === 'image') {
          beginCoalescing();
          clearCropSelection();
          setCropEditedSrc(null);
          setCropTool('crop');
          setCroppingState({ pathId: path.id, originalPath: path as PathImageData });
          setCurrentCropRect({ x: path.x, y: path.y, width: path.width, height: path.height });
          setCropHistory({ past: [], future: [] });
          setSelectedPathIds([path.id]);
      }
  }, [
    toolbarState.selectionMode,
    beginCoalescing,
    groupIsolation,
    editTextPath,
    setCroppingState,
    setCurrentCropRect,
    clearCropSelection,
    setCropTool,
    setCropEditedSrc,
    setSelectedPathIds,
  ]);

  const drawingInteraction = useDrawing({ pathState: activePathState, toolbarState, viewTransform, ...uiState, openTextEditor: openTextEditorAt });
  const selectionInteraction = useSelection({
    pathState: activePathState,
    toolbarState,
    viewTransform,
    ...uiState,
    onDoubleClick,
    croppingState: appState.croppingState,
    currentCropRect: appState.currentCropRect,
    setCurrentCropRect,
    pushCropHistory,
    cropTool: appState.cropTool,
    onMagicWandSample: selectMagicWandAt,
    cropSelectionMode: appState.cropSelectionMode,
    onCropManualPointerDown: handleCropManualPointerDown,
    onCropManualPointerMove: handleCropManualPointerMove,
    onCropManualPointerUp: handleCropManualPointerUp,
    cropManualDraft: appState.cropManualDraft,
  });
  const sampleImageColorAtPoint = useCallback(async (point: Point, path: AnyPath) => {
    if (path.tool !== 'image') {
      return null;
    }

    try {
      const imagePath = path as PathImageData;
      const pixelData = await getImagePixelData(imagePath);
      const pixel = mapWorldPointToImagePixel(point, imagePath, pixelData.width, pixelData.height);
      if (!pixel) {
        return null;
      }

      const { x, y } = pixel;
      if (x < 0 || x >= pixelData.width || y < 0 || y >= pixelData.height) {
        return null;
      }

      const offset = (y * pixelData.width + x) * 4;
      const data = pixelData.data;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      const alpha = data[offset + 3] / 255;

      if (!Number.isFinite(alpha)) {
        return null;
      }

      if (alpha >= 0.999) {
        const toHex = (value: number) => value.toString(16).padStart(2, '0');
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
      }

      const normalizedAlpha = Math.round(alpha * 1000) / 1000;
      return `rgba(${r}, ${g}, ${b}, ${normalizedAlpha})`;
    } catch (error) {
      console.error('Failed to sample image color', error);
      return null;
    }
  }, []);

  const pointerInteraction = usePointerInteraction({
    tool: toolbarState.tool,
    viewTransform,
    drawingInteraction,
    selectionInteraction,
    paths: activePaths,
    setStrokeColor: toolbarState.setColor,
    setFillColor: toolbarState.setFill,
    backgroundColor: uiState.backgroundColor,
    sampleImageColorAtPoint,
  });
  
  const handleSetTool = useCallback((newTool: Tool) => {
    if (newTool === toolbarState.tool) return;
    if (appState.croppingState) cancelCrop();
    if (drawingInteraction.drawingShape) drawingInteraction.cancelDrawingShape();
    if (currentPenPath) handleCancelPenPath();
    if (currentLinePath) handleCancelLinePath();
    if (currentBrushPath) setCurrentBrushPath(null);
    finalizeTextEditor();
    toolbarState.setTool(newTool);
  }, [
    toolbarState,
    drawingInteraction,
    appState.croppingState,
    cancelCrop,
    currentPenPath,
    handleCancelPenPath,
    currentLinePath,
    handleCancelLinePath,
    currentBrushPath,
    setCurrentBrushPath,
    finalizeTextEditor,
  ]);

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
    paths: activePaths, backgroundColor: uiState.backgroundColor, selectedPathIds,
    pathState: { ...activePathState, handleLoadFile },
    toolbarState, viewTransform, getPointerPosition: viewTransform.getPointerPosition, ...appState,
    setActiveFileHandle, setActiveFileName, setBackgroundColor, setStyleClipboard, setStyleLibrary,
    setMaterialLibrary, pngExportOptions: uiState.pngExportOptions, showConfirmation,
    frames, fps: uiState.fps, setFps, requestFitToContent,
    markDocumentSaved,
  });

  useEffect(() => {
    setAppState(prev => {
      if (prev.lastSavedDocumentSignature === null) {
        if (!prev.hasUnsavedChanges) {
          return { ...prev, hasUnsavedChanges: true };
        }
        return prev;
      }
      const hasChanges = prev.lastSavedDocumentSignature !== currentDocumentSignature;
      if (hasChanges !== prev.hasUnsavedChanges) {
        return { ...prev, hasUnsavedChanges: hasChanges };
      }
      return prev;
    });
  }, [currentDocumentSignature]);

  useEffect(() => {
    if (initialFitRequestedRef.current || appState.isLoading) {
      return;
    }
    initialFitRequestedRef.current = true;
    const hasContent = frames.some(frame => (frame.paths?.length ?? 0) > 0);
    if (hasContent) {
      requestFitToContent();
    }
  }, [appState.isLoading, frames, requestFitToContent]);
  
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
          const nextBackground = data.backgroundColor ?? '#212529';
          const nextFps = data.fps ?? initialFpsRef.current;
          handleLoadFile(framesToLoad);
          requestFitToContent();
          initialFitRequestedRef.current = true;
          setBackgroundColor(nextBackground);
          if (setFps && data.fps) setFps(data.fps);

          setActiveFileHandle(handle);
          setActiveFileName(handle.name);
          markDocumentSaved(createDocumentSignature(framesToLoad, nextBackground, nextFps));
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
  }, [handleLoadFile, setActiveFileHandle, setActiveFileName, setBackgroundColor, setIsLoading, setFps, markDocumentSaved, initialFpsRef]);

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

  useEffect(() => { /* ... save libraries ... */ }, [appState.styleLibrary, appState.materialLibrary]);

  const store = useMemo(
    () => ({
      ...uiState,
      ...appState,
      ...pathState,
      ...groupIsolation,
      ...viewTransform,
      ...toolbarState,
      paths, // This should be current frame paths
      ...appActions,
      drawingInteraction,
      selectionInteraction,
      pointerInteraction,
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
      setFps,
      setIsPlaying,
      setContextMenu,
      setStyleClipboard,
      setStyleLibrary,
      setMaterialLibrary,
      setActiveFileHandle,
      setActiveFileName,
      setIsLoading,
      showConfirmation,
      hideConfirmation,
      setCroppingState,
      setCurrentCropRect,
      pushCropHistory,
      setCropTool,
      setCropMagicWandOptions,
      setCropSelectionMode,
      setCropBrushSize,
      setCropSelectionOperation,
      updateTextEditor,
      finalizeTextEditor,
      openTextEditorAt,
      editTextPath,
      selectMagicWandAt,
      invertMagicWandSelection,
      applyMagicWandSelection,
      cutMagicWandSelection,
      confirmCrop,
      trimTransparentEdges,
      cancelCrop,
      handleSetTool,
      handleToggleStyleLibrary,
      handleClear,
      handleClearAllData,
      handleResetPreferences,
      canClear,
      canClearAllData,
      setIsOnionSkinEnabled,
      setOnionSkinPrevFrames,
      setOnionSkinNextFrames,
      setOnionSkinOpacity,
      undo: handleUndo,
      redo: handleRedo,
      canUndo,
      canRedo,
    }),
    [
      uiState,
      appState,
      frames,
      setCurrentFrameIndex,
      setPaths,
      handleLoadFile,
      handleDeletePaths,
      togglePathsProperty,
      toggleGroupCollapse,
      setPathName,
      reorderPaths,
      addFrame,
      copyFrame,
      deleteFrame,
      reorderFrames,
      undo,
      redo,
      pathCanUndo,
      pathCanRedo,
      beginCoalescing,
      endCoalescing,
      selectedPathIds,
      setSelectedPathIds,
      finishBrushPath,
      handleFinishPenPath,
      handleCancelPenPath,
      handleFinishLinePath,
      handleCancelLinePath,
      handleReorder,
      handleDeleteSelected,
      currentBrushPath,
      setCurrentBrushPath,
      currentPenPath,
      setCurrentPenPath,
      currentLinePath,
      setCurrentLinePath,
      updateTextEditor,
      finalizeTextEditor,
      openTextEditorAt,
      editTextPath,
      groupIsolation,
      viewTransform,
      toolbarState,
      paths,
      appActions,
      drawingInteraction,
      selectionInteraction,
      pointerInteraction,
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
      setFps,
      setIsPlaying,
      setContextMenu,
      setStyleClipboard,
      setStyleLibrary,
      setMaterialLibrary,
      setActiveFileHandle,
      setActiveFileName,
      setIsLoading,
      showConfirmation,
      hideConfirmation,
      setCroppingState,
      setCurrentCropRect,
      pushCropHistory,
      setCropTool,
      setCropMagicWandOptions,
      setCropSelectionMode,
      setCropSelectionOperation,
      invertMagicWandSelection,
      selectMagicWandAt,
      applyMagicWandSelection,
      cutMagicWandSelection,
      confirmCrop,
      trimTransparentEdges,
      cancelCrop,
      handleSetTool,
      handleToggleStyleLibrary,
      handleClear,
      handleClearAllData,
      handleResetPreferences,
      canClear,
      canClearAllData,
      setIsOnionSkinEnabled,
      setOnionSkinPrevFrames,
      setOnionSkinNextFrames,
      setOnionSkinOpacity,
      handleUndo,
      handleRedo,
      canUndo,
      canRedo,
    ]
  );

  return store;
};
