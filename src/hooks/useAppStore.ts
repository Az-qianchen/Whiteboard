/**
 * 本文件定义了一个主应用状态管理 Hook (useAppStore)。
 * 它整合了所有独立的状态管理 Hooks（如 usePaths, useToolbarState 等），
 * 并为整个应用提供一个统一的状态和操作接口。
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import type { WhiteboardData, Tool, AnyPath, StyleClipboardData, MaterialData, TextData, PngExportOptions, ImageData as PathImageData, BBox, Frame, Point } from '../types';
import { measureText, rotatePoint } from '@/lib/drawing';
import { removeBackground } from '@/lib/image';
import { createDocumentSignature } from '@/lib/document';

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
  naturalHeight: number
): { x: number; y: number } | null => {
  const rotation = image.rotation ?? 0;
  const center = { x: image.x + image.width / 2, y: image.y + image.height / 2 };
  let localPoint = point;
  if (rotation) {
    localPoint = rotatePoint(point, center, -rotation);
  }

  const normalizedX = (localPoint.x - image.x) / image.width;
  const normalizedY = (localPoint.y - image.y) / image.height;
  if (normalizedX < 0 || normalizedX > 1 || normalizedY < 0 || normalizedY > 1) {
    return null;
  }

  return {
    x: Math.floor(normalizedX * naturalWidth),
    y: Math.floor(normalizedY * naturalHeight),
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
  croppingState: { pathId: string; originalPath: PathImageData } | null;
  currentCropRect: BBox | null;
  cropTool: 'crop' | 'magic-wand';
  cropMagicWandOptions: { threshold: number; contiguous: boolean };
  cropSelectionContours: Array<{ d: string; inner: boolean }> | null;
  cropPendingCutoutSrc: string | null;
  cropSelectionInverted: boolean;
  hasUnsavedChanges: boolean;
  lastSavedDocumentSignature: string | null;
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
  editingTextPathId: null,
  activeFileHandle: null,
  activeFileName: null,
  isLoading: true,
  confirmationDialog: null,
  croppingState: null,
  currentCropRect: null,
  cropTool: 'crop',
  cropMagicWandOptions: { threshold: 20, contiguous: true },
  cropSelectionContours: null,
  cropPendingCutoutSrc: null,
  cropSelectionInverted: false,
  hasUnsavedChanges: true,
  lastSavedDocumentSignature: null,
});


/**
 * 集中管理整个应用状态的主 Hook。
 * @returns 返回一个包含所有状态和操作函数的对象。
 */
export const useAppStore = () => {
  // UI slice migrated to Zustand; keep API stable by bridging setUiState
  const uiState = useUiStore();
  const initialFpsRef = useRef(uiState.fps);
  const initialFitRequestedRef = useRef(false);
  const setUiState = useCallback((updater: (s: UiState) => UiState) => {
    // Replace entire UI slice with updater result to mirror previous React setState pattern
    useUiStore.setState(updater as (prev: UiState) => UiState, true);
  }, []);
  const [appState, setAppState] = useState<AppState>(getInitialAppState);
  const [cropHistory, setCropHistory] = useState<{ past: BBox[]; future: BBox[] }>({ past: [], future: [] });
  const [cropEditedSrc, setCropEditedSrc] = useState<string | null>(null);
  const cropImageCacheRef = useRef<{
    naturalWidth: number;
    naturalHeight: number;
    imageData: ImageData;
  } | null>(null);
  interface MagicWandSnapshot {
    imageData: ImageData;
    src: string;
    cutoutSrc: string | null;
    bounds: { x: number; y: number; width: number; height: number } | null;
  }

  const cropMagicWandResultRef = useRef<{ removed: MagicWandSnapshot; kept: MagicWandSnapshot } | null>(null);
  const cropMagicWandSampleRef = useRef<{ x: number; y: number } | null>(null);

  const pathState = usePathsStore();
  const { paths, frames, setCurrentFrameIndex, setSelectedPathIds } = pathState;

  const currentDocumentSignature = useMemo(
    () => createDocumentSignature(frames, uiState.backgroundColor, uiState.fps),
    [frames, uiState.backgroundColor, uiState.fps]
  );

  useEffect(() => {
    if (!appState.croppingState) {
      cropImageCacheRef.current = null;
      cropMagicWandResultRef.current = null;
      return;
    }

    const { originalPath } = appState.croppingState;
    const src = cropEditedSrc ?? originalPath.src;
    let isCancelled = false;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    img.onload = () => {
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
    };
    img.onerror = (err) => {
      console.error('Failed to load image for cropping', err);
    };

    return () => {
      isCancelled = true;
    };
  }, [appState.croppingState?.pathId, cropEditedSrc, appState.croppingState?.originalPath.src]);

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
  const setCropTool = useCallback((tool: AppState['cropTool']) => setAppState(s => ({ ...s, cropTool: tool })), []);
  const setCropMagicWandOptions = useCallback((val: Partial<AppState['cropMagicWandOptions']>) => setAppState(s => ({
    ...s,
    cropMagicWandOptions: { ...s.cropMagicWandOptions, ...val },
  })), []);
  const clearCropSelection = useCallback(() => {
    cropMagicWandResultRef.current = null;
    cropMagicWandSampleRef.current = null;
    setAppState(s => ({
      ...s,
      cropSelectionContours: null,
      cropPendingCutoutSrc: null,
      cropSelectionInverted: false,
    }));
  }, []);

  const performMagicWandSelection = useCallback((pixel: { x: number; y: number }) => {
    const cropping = appState.croppingState;
    if (!cropping || appState.cropTool !== 'magic-wand') return;
    const cache = cropImageCacheRef.current;
    if (!cache) return;

    const { threshold, contiguous } = appState.cropMagicWandOptions;
    const result = removeBackground(cache.imageData, { x: pixel.x, y: pixel.y, threshold, contiguous });
    if (!result.mask) {
      cropMagicWandResultRef.current = null;
      setAppState(s => ({
        ...s,
        cropSelectionContours: null,
        cropPendingCutoutSrc: null,
        cropSelectionInverted: false,
      }));
      return;
    }

    const maskData = result.mask.data;

    const imageDataToDataUrl = (imageData: ImageData): string => {
      const canvas = document.createElement('canvas');
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.warn('Unable to convert magic wand result to data URL');
        return '';
      }
      ctx.putImageData(imageData, 0, 0);
      return canvas.toDataURL();
    };

    const computeBounds = (invert: boolean): { x: number; y: number; width: number; height: number } | null => {
      let minX = cache.naturalWidth;
      let minY = cache.naturalHeight;
      let maxX = -1;
      let maxY = -1;
      for (let py = 0; py < cache.naturalHeight; py++) {
        for (let px = 0; px < cache.naturalWidth; px++) {
          const index = py * cache.naturalWidth + px;
          const selected = invert ? maskData[index] === 0 : maskData[index] === 1;
          if (!selected) continue;
          if (cache.imageData.data[index * 4 + 3] === 0) continue;
          if (px < minX) minX = px;
          if (py < minY) minY = py;
          if (px > maxX) maxX = px;
          if (py > maxY) maxY = py;
        }
      }
      if (maxX < minX || maxY < minY) {
        return null;
      }
      return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
    };

    const createCutoutSrc = (imageData: ImageData, bounds: { x: number; y: number; width: number; height: number } | null): string | null => {
      if (!bounds) return null;
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, bounds.width);
      canvas.height = Math.max(1, bounds.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.warn('Unable to create cutout preview for magic wand selection');
        return null;
      }
      ctx.putImageData(imageData, -bounds.x, -bounds.y);
      return canvas.toDataURL();
    };

    const keptDataArray = new Uint8ClampedArray(cache.imageData.data);
    for (let i = 0; i < maskData.length; i++) {
      if (maskData[i] === 0) {
        keptDataArray[i * 4 + 3] = 0;
      }
    }
    const keptImageData = new ImageData(keptDataArray, cache.naturalWidth, cache.naturalHeight);

    const removedBounds = computeBounds(true);
    const keptBounds = computeBounds(false);

    const removedSnapshot: MagicWandSnapshot = {
      imageData: result.image,
      src: imageDataToDataUrl(result.image),
      cutoutSrc: createCutoutSrc(result.image, removedBounds),
      bounds: removedBounds,
    };

    const keptSnapshot: MagicWandSnapshot = {
      imageData: keptImageData,
      src: imageDataToDataUrl(keptImageData),
      cutoutSrc: createCutoutSrc(keptImageData, keptBounds),
      bounds: keptBounds,
    };

    cropMagicWandResultRef.current = { removed: removedSnapshot, kept: keptSnapshot };

    const contourPaths = buildContourPaths(result.contours, cropping.originalPath, cache.naturalWidth, cache.naturalHeight);
    setAppState(s => ({
      ...s,
      cropSelectionContours: contourPaths,
      cropPendingCutoutSrc: keptSnapshot.cutoutSrc,
      cropSelectionInverted: false,
    }));
  }, [appState.croppingState, appState.cropMagicWandOptions, appState.cropTool]);

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
    performMagicWandSelection(cropMagicWandSampleRef.current);
  }, [appState.cropMagicWandOptions, appState.cropTool, appState.croppingState, performMagicWandSelection]);

  const applyMagicWandSelection = useCallback(() => {
    const cropping = appState.croppingState;
    if (!cropping || !cropMagicWandResultRef.current) return;
    const result = cropMagicWandResultRef.current;
    const selection = appState.cropSelectionInverted ? result.kept : result.removed;
    const { src: newSrc, imageData } = selection;

    pathState.setPaths(prev => prev.map(p =>
      p.id === cropping.pathId ? { ...(p as PathImageData), src: newSrc } : p
    ));
    setCroppingState(prev => (
      prev && prev.pathId === cropping.pathId
        ? { ...prev, originalPath: { ...prev.originalPath, src: newSrc } }
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
  }, [appState.croppingState, appState.cropSelectionInverted, pathState.setPaths, setCroppingState, clearCropSelection]);

  const cancelMagicWandSelection = useCallback(() => {
    clearCropSelection();
  }, [clearCropSelection]);

  const toggleCropSelectionInverted = useCallback(() => {
    const selection = cropMagicWandResultRef.current;
    if (!selection) return;
    setAppState(prev => {
      const nextInverted = !prev.cropSelectionInverted;
      return {
        ...prev,
        cropSelectionInverted: nextInverted,
        cropPendingCutoutSrc: nextInverted ? selection.removed.cutoutSrc : selection.kept.cutoutSrc,
      };
    });
  }, []);

  const cutMagicWandSelection = useCallback(() => {
    const cropping = appState.croppingState;
    const selection = cropMagicWandResultRef.current;
    const cache = cropImageCacheRef.current;
    if (!cropping || !selection || !cache) return;

    const removal = appState.cropSelectionInverted ? selection.kept : selection.removed;
    const extracted = appState.cropSelectionInverted ? selection.removed : selection.kept;

    if (!extracted.cutoutSrc || !extracted.bounds) {
      console.warn('No cutout available for the current selection.');
      return;
    }

    const { naturalWidth, naturalHeight } = cache;
    const bounds = extracted.bounds;

    const width = (bounds.width / naturalWidth) * cropping.originalPath.width;
    const height = (bounds.height / naturalHeight) * cropping.originalPath.height;
    if (!(width > 0 && height > 0)) {
      console.warn('Cut selection has zero area, skipping.');
      return;
    }

    const centerPixel = {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
    };
    const centerWorld = mapPixelToWorldPoint(centerPixel, cropping.originalPath, naturalWidth, naturalHeight);
    const newX = centerWorld.x - width / 2;
    const newY = centerWorld.y - height / 2;

    const newImagePath: PathImageData = {
      ...cropping.originalPath,
      id: `${Date.now()}-cutout`,
      src: extracted.cutoutSrc,
      x: newX,
      y: newY,
      width,
      height,
    };

    pathState.setPaths(prev => {
      const index = prev.findIndex(p => p.id === cropping.pathId);
      if (index === -1) return prev;
      const updated = [...prev];
      const target = updated[index] as PathImageData;
      updated[index] = { ...target, src: removal.src };
      updated.splice(index + 1, 0, newImagePath);
      return updated;
    });

    setCroppingState(prev => (
      prev && prev.pathId === cropping.pathId
        ? { ...prev, originalPath: { ...prev.originalPath, src: removal.src } }
        : prev
    ));

    if (cropImageCacheRef.current) {
      cropImageCacheRef.current = {
        ...cropImageCacheRef.current,
        imageData: removal.imageData,
      };
    }
    setCropEditedSrc(removal.src);
    clearCropSelection();
  }, [appState.croppingState, appState.cropSelectionInverted, pathState.setPaths, setCroppingState, clearCropSelection]);

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
        const resetFrames = [{ paths: [] } as Frame];
        // Reset the timeline to a single empty frame so no leftover thumbnails remain
        pathState.handleLoadFile(resetFrames, 0);
        setSelectedPathIds([]);
      },
      '清空'
    );
  }, [canClearAllData, pathState, showConfirmation, setSelectedPathIds]);
  
  const groupIsolation = useGroupIsolation(pathState);
  const { activePaths, activePathState } = groupIsolation;

  const viewTransform = useViewTransform();
  const requestFitToContent = useViewTransformStore(s => s.requestFitToContent);
  const toolbarState = useToolsStore(activePaths, pathState.selectedPathIds, activePathState.setPaths, pathState.setSelectedPathIds, pathState.beginCoalescing, pathState.endCoalescing);
  
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
  
  const confirmCrop = useCallback(() => {
    if (!appState.croppingState || !appState.currentCropRect) return;
    const { pathId, originalPath } = appState.croppingState;
    const cropRect = appState.currentCropRect;
    const sourceSrc = cropEditedSrc ?? originalPath.src;

    const performCrop = async () => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = sourceSrc;
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
          ? { ...(p as PathImageData), src: newSrc, x: newX, y: newY, width: cropRect.width, height: cropRect.height, rotation }
          : p
      ));

      setCroppingState(null);
      setCurrentCropRect(null);
      setCropHistory({ past: [], future: [] });
      setCropEditedSrc(null);
      clearCropSelection();
      setAppState(prev => ({ ...prev, cropTool: 'crop' }));
      pathState.endCoalescing();
    };

    void performCrop();
  }, [appState.croppingState, appState.currentCropRect, activePathState, pathState, setCroppingState, setCurrentCropRect, cropEditedSrc, clearCropSelection]);

  const cancelCrop = useCallback(() => {
    clearCropSelection();
    setCropEditedSrc(null);
    setAppState(prev => ({ ...prev, cropTool: 'crop' }));
    setCroppingState(null);
    setCurrentCropRect(null);
    setCropHistory({ past: [], future: [] });
    pathState.endCoalescing();
  }, [setCroppingState, setCurrentCropRect, pathState, clearCropSelection]);

  const handleUndo = useCallback(() => {
    if (appState.croppingState) {
      if (cropHistory.past.length > 0) {
        undoCropRect();
      } else {
        cancelCrop();
        pathState.undo();
      }
    } else {
      pathState.undo();
    }
  }, [appState.croppingState, cropHistory.past.length, undoCropRect, cancelCrop, pathState]);

  const handleRedo = useCallback(() => {
    if (appState.croppingState && cropHistory.future.length > 0) {
      redoCropRect();
    } else {
      pathState.redo();
    }
  }, [appState.croppingState, cropHistory.future.length, redoCropRect, pathState]);

  const canUndo = pathState.canUndo || (appState.croppingState !== null && cropHistory.past.length > 0);
  const canRedo = pathState.canRedo || (appState.croppingState !== null && cropHistory.future.length > 0);

  const onDoubleClick = useCallback((path: AnyPath) => {
      if (toolbarState.selectionMode !== 'move') return;
      if (path.tool === 'text') { setEditingTextPathId(path.id); pathState.beginCoalescing(); } 
      else if (path.tool === 'group') { groupIsolation.handleGroupDoubleClick(path.id); }
      else if (path.tool === 'image') {
          pathState.beginCoalescing();
          clearCropSelection();
          setCropEditedSrc(null);
          setCropTool('crop');
          setCroppingState({ pathId: path.id, originalPath: path as PathImageData });
          setCurrentCropRect({ x: path.x, y: path.y, width: path.width, height: path.height });
          setCropHistory({ past: [], future: [] });
          pathState.setSelectedPathIds([path.id]);
      }
  }, [toolbarState.selectionMode, pathState, groupIsolation, setEditingTextPathId, setCroppingState, setCurrentCropRect, clearCropSelection, setCropTool, setCropEditedSrc]);

  const drawingInteraction = useDrawing({ pathState: activePathState, toolbarState, viewTransform, ...uiState });
  const selectionInteraction = useSelection({ pathState: activePathState, toolbarState, viewTransform, ...uiState, onDoubleClick, croppingState: appState.croppingState, currentCropRect: appState.currentCropRect, setCurrentCropRect, pushCropHistory, cropTool: appState.cropTool, onMagicWandSample: selectMagicWandAt });
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
          pathState.handleLoadFile(framesToLoad);
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
  }, [pathState.handleLoadFile, setActiveFileHandle, setActiveFileName, setBackgroundColor, setIsLoading, setFps, markDocumentSaved, initialFpsRef]);

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
    showConfirmation, hideConfirmation, setCroppingState, setCurrentCropRect, pushCropHistory,
    setCropTool, setCropMagicWandOptions, selectMagicWandAt, applyMagicWandSelection, cancelMagicWandSelection,
    toggleCropSelectionInverted, cutMagicWandSelection,
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
    undo: handleUndo,
    redo: handleRedo,
    canUndo,
    canRedo,
  };
};
