import { useCallback, useEffect, useMemo, useState, type SetStateAction } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  usePathsStore as usePathsStoreBase,
  useCanUndo,
  useCanRedo,
  useBeginCoalescing,
  useEndCoalescing,
} from '@/context/pathsStore';
import { brushToVectorPath } from '@/lib/drawing';
import { getLocalStorageItem } from '@/lib/utils';
import { useLiveDrawingState } from './useLiveDrawingState';
import type { AnyPath, VectorPathData } from '@/types';

type PathsState = ReturnType<typeof usePathsStoreBase.getState>;

const selector = (state: PathsState) => ({
  frames: state.frames,
  currentFrameIndex: state.currentFrameIndex,
  setCurrentFrameIndex: state.setCurrentFrameIndex,
  setPaths: state.setPaths,
  handleLoadFile: state.handleLoadFile,
  handleDeletePaths: state.handleDeletePaths,
  togglePathsProperty: state.togglePathsProperty,
  toggleGroupCollapse: state.toggleGroupCollapse,
  setPathName: state.setPathName,
  reorderPaths: state.reorderPaths,
  addFrame: state.addFrame,
  copyFrame: state.copyFrame,
  deleteFrame: state.deleteFrame,
  reorderFrames: state.reorderFrames,
  undo: state.undo,
  redo: state.redo,
});

/**
 * Hook that bridges the Zustand paths store into the legacy app context shape.
 * It selects the path slice with shallow equality so only the re-exposed fields
 * trigger updates, while keeping the additional selection and live drawing
 * helpers local to this hook.
 */
export const usePathsStore = () => {
  const {
    frames,
    currentFrameIndex,
    setCurrentFrameIndex,
    setPaths: setPathsFromStore,
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
  } = usePathsStoreBase(useShallow(selector));

  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  const beginCoalescing = useBeginCoalescing();
  const endCoalescing = useEndCoalescing();

  const paths = frames[currentFrameIndex]?.paths ?? [];

  const setPaths = useCallback(
    (updater: SetStateAction<AnyPath[]>) => setPathsFromStore(updater),
    [setPathsFromStore]
  );

  const [selectedPathIds, setSelectedPathIds] = useState<string[]>(() =>
    getLocalStorageItem('whiteboard_selectedPathIds', [])
  );

  useEffect(() => {
    localStorage.setItem('whiteboard_selectedPathIds', JSON.stringify(selectedPathIds));
  }, [selectedPathIds]);

  const liveDrawingState = useLiveDrawingState();
  const {
    currentBrushPath,
    setCurrentBrushPath,
    currentPenPath,
    setCurrentPenPath,
    currentLinePath,
    setCurrentLinePath,
  } = liveDrawingState;

  const finishBrushPath = useCallback(() => {
    const pathToConvert = currentBrushPath;
    setCurrentBrushPath(null);
    if (pathToConvert && pathToConvert.points.length > 1) {
      const vectorPathData = brushToVectorPath({ ...pathToConvert });
      setPaths(prev => [...prev, vectorPathData]);
    }
  }, [currentBrushPath, setCurrentBrushPath, setPaths]);

  const handleFinishPenPath = useCallback(
    (isClosed: boolean = false) => {
      if (currentPenPath && currentPenPath.anchors.length > 0) {
        const finalPath: VectorPathData = isClosed
          ? { ...currentPenPath, isClosed: true }
          : currentPenPath;
        setPaths(prev => [...prev, finalPath]);
        setCurrentPenPath(null);
      }
    },
    [currentPenPath, setCurrentPenPath, setPaths]
  );

  const handleCancelPenPath = useCallback(() => {
    setCurrentPenPath(null);
  }, [setCurrentPenPath]);

  const handleFinishLinePath = useCallback(() => {
    if (currentLinePath && currentLinePath.anchors.length > 1) {
      setPaths(prev => [...prev, currentLinePath]);
    }
    setCurrentLinePath(null);
  }, [currentLinePath, setCurrentLinePath, setPaths]);

  const handleCancelLinePath = useCallback(() => {
    setCurrentLinePath(null);
  }, [setCurrentLinePath]);

  const handleReorder = useCallback(
    (direction: 'forward' | 'backward' | 'front' | 'back') => {
      setPaths(currentPaths => {
        if (selectedPathIds.length === 0) return currentPaths;

        const selectedSet = new Set(selectedPathIds);
        const selected = currentPaths.filter(p => selectedSet.has(p.id));
        const notSelected = currentPaths.filter(p => !selectedSet.has(p.id));

        switch (direction) {
          case 'front':
            return [...notSelected, ...selected];
          case 'back':
            return [...selected, ...notSelected];
          case 'forward': {
            const newPaths = [...currentPaths];
            for (let i = newPaths.length - 2; i >= 0; i--) {
              if (selectedSet.has(newPaths[i].id) && !selectedSet.has(newPaths[i + 1].id)) {
                [newPaths[i], newPaths[i + 1]] = [newPaths[i + 1], newPaths[i]];
              }
            }
            return newPaths;
          }
          case 'backward': {
            const newPaths = [...currentPaths];
            for (let i = 1; i < newPaths.length; i++) {
              if (selectedSet.has(newPaths[i].id) && !selectedSet.has(newPaths[i - 1].id)) {
                [newPaths[i], newPaths[i - 1]] = [newPaths[i - 1], newPaths[i]];
              }
            }
            return newPaths;
          }
        }
      });
    },
    [selectedPathIds, setPaths]
  );

  const handleDeleteSelected = useCallback(() => {
    if (selectedPathIds.length > 0) {
      handleDeletePaths(selectedPathIds);
      setSelectedPathIds([]);
    }
  }, [selectedPathIds, handleDeletePaths]);

  return useMemo(
    () => ({
      frames,
      currentFrameIndex,
      setCurrentFrameIndex,
      paths,
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
      canUndo,
      canRedo,
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
    }),
    [
      frames,
      currentFrameIndex,
      paths,
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
      canUndo,
      canRedo,
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
    ]
  );
};

