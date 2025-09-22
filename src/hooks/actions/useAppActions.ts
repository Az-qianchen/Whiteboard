/**
 * 本文件定义了一个主应用操作 Hook (useAppActions)，
 * 它通过组合多个职责更单一的子 Hooks，为应用提供一个统一的操作接口。
 */

import { useMemo } from 'react';
import { useClipboardActions } from './useClipboardActions';
import { useExportActions } from './useExportActions';
import { useFileActions } from './useFileActions';
import { useLibraryActions } from './useLibraryActions';
import { useObjectActions } from './useObjectActions';
import type { AnyPath, Point, Tool, WhiteboardData, StyleClipboardData, MaterialData, LibraryData, Alignment, DistributeMode, PngExportOptions, Frame, AnimationExportOptions } from '@/types';
import type { FileSystemFileHandle } from 'wicg-file-system-access';

// The props type is a combination of all props needed by the sub-hooks.
// This keeps the composition simple in useAppStore.
export interface AppActionsProps {
  paths: AnyPath[];
  frames: Frame[];
  fps: number;
  setFps: (val: number | ((prev: number) => number)) => void;
  backgroundColor: string;
  selectedPathIds: string[];
  requestFitToContent: () => void;
  pathState: {
    setPaths: (updater: React.SetStateAction<AnyPath[]>) => void;
    setSelectedPathIds: React.Dispatch<React.SetStateAction<string[]>>;
    handleLoadFile: (newFrames: Frame[], newFrameIndex?: number) => void;
    handleReorder: (direction: 'forward' | 'backward' | 'front' | 'back') => void;
    beginCoalescing: () => void;
    endCoalescing: () => void;
  };
  toolbarState: {
    [key: string]: any;
    setTool: (tool: Tool) => void;
  };
  viewTransform: {
    viewTransform: {
      scale: number;
    }
    getPointerPosition: (e: { clientX: number, clientY: number }, svg: SVGSVGElement) => Point;
  };
  getPointerPosition: (e: { clientX: number, clientY: number }, svg: SVGSVGElement) => Point;
  activeFileHandle: FileSystemFileHandle | null;
  setActiveFileHandle: React.Dispatch<React.SetStateAction<FileSystemFileHandle | null>>;
  setActiveFileName: React.Dispatch<React.SetStateAction<string | null>>;
  activeFileName: string | null;
  setBackgroundColor: (color: string) => void;
  styleClipboard: StyleClipboardData | null;
  setStyleClipboard: React.Dispatch<React.SetStateAction<StyleClipboardData | null>>;
  styleLibrary: StyleClipboardData[];
  setStyleLibrary: React.Dispatch<React.SetStateAction<StyleClipboardData[]>>;
  materialLibrary: MaterialData[];
  setMaterialLibrary: React.Dispatch<React.SetStateAction<MaterialData[]>>;
  pngExportOptions: PngExportOptions;
  showConfirmation: (title: string, message: string, onConfirm: () => void) => void;
  markDocumentSaved: (signature: string) => void;
}

/**
 * 一个自定义 Hook，用于封装应用中的所有主要操作逻辑。
 * @param props - 包含应用状态和更新函数的对象。
 * @returns 一个包含所有可执行操作函数的对象。
 */
export const useAppActions = (props: AppActionsProps) => {
  const clipboardActions = useClipboardActions(props);
  const exportActions = useExportActions(props);
  const fileActions = useFileActions(props);
  const libraryActions = useLibraryActions(props);
  const objectActions = useObjectActions(props);

  return useMemo(
    () => ({
      ...clipboardActions,
      ...exportActions,
      ...fileActions,
      ...libraryActions,
      ...objectActions,
    }),
    [clipboardActions, exportActions, fileActions, libraryActions, objectActions]
  );
};