import { useCallback } from 'react';
import type { AnyPath, Frame } from '../types';
import {
  usePathsStore,
  useCanUndo,
  useCanRedo,
  useBeginCoalescing,
  useEndCoalescing,
} from '@/context/pathsStore';

/**
 * Frame management hook backed by Zustand store.
 * Exposes the same API shape as the previous implementation.
 */
export const useFrameManagement = () => {
  // Selectors from Zustand store
  const frames = usePathsStore((s) => s.frames);
  const currentFrameIndex = usePathsStore((s) => s.currentFrameIndex);
  const setCurrentFrameIndex = usePathsStore((s) => s.setCurrentFrameIndex);
  const setPaths = usePathsStore((s) => s.setPaths);

  const handleLoadFile = usePathsStore((s) => s.handleLoadFile);
  const handleDeletePaths = usePathsStore((s) => s.handleDeletePaths);
  const togglePathsProperty = usePathsStore((s) => s.togglePathsProperty);
  const toggleGroupCollapse = usePathsStore((s) => s.toggleGroupCollapse);
  const setPathName = usePathsStore((s) => s.setPathName);
  const reorderPaths = usePathsStore((s) => s.reorderPaths);

  const addFrame = usePathsStore((s) => s.addFrame);
  const copyFrame = usePathsStore((s) => s.copyFrame);
  const deleteFrame = usePathsStore((s) => s.deleteFrame);
  const reorderFrames = usePathsStore((s) => s.reorderFrames);

  const undo = usePathsStore((s) => s.undo);
  const redo = usePathsStore((s) => s.redo);
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  const beginCoalescing = useBeginCoalescing();
  const endCoalescing = useEndCoalescing();

  const currentFrame = frames[currentFrameIndex];
  const paths = currentFrame?.paths ?? [];

  // Stable wrapper to preserve referential stability
  const setPathsStable = useCallback((updater: React.SetStateAction<AnyPath[]>) => setPaths(updater), [setPaths]);

  return {
    frames,
    currentFrameIndex,
    setCurrentFrameIndex,
    paths,
    setPaths: setPathsStable,
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
    canUndo,
    canRedo,
    beginCoalescing,
    endCoalescing,
  };
};

