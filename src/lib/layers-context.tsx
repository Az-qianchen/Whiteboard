/**
 * 本文件定义了用于图层状态管理的 React Context。
 * 通过提供一个全局的 LayersContext，避免了在组件树中深层传递 props 的问题。
 */
import React, { createContext, useContext, useMemo } from 'react';
import { usePaths } from '../hooks/usePaths';

// 从 usePaths hook 的返回类型推断 Context 的状态类型
export type LayersContextValue = ReturnType<typeof usePaths>;

type LayersSnapshot = Pick<
  LayersContextValue,
  | 'frames'
  | 'currentFrameIndex'
  | 'paths'
  | 'selectedPathIds'
  | 'currentBrushPath'
  | 'currentPenPath'
  | 'currentLinePath'
  | 'canUndo'
  | 'canRedo'
>;

const toSnapshot = (source: LayersContextValue): LayersSnapshot => ({
  frames: source.frames,
  currentFrameIndex: source.currentFrameIndex,
  paths: source.paths,
  selectedPathIds: source.selectedPathIds,
  currentBrushPath: source.currentBrushPath,
  currentPenPath: source.currentPenPath,
  currentLinePath: source.currentLinePath,
  canUndo: source.canUndo,
  canRedo: source.canRedo,
});

// 创建一个具有未定义初始值的 Context
const LayersContext = createContext<LayersContextValue | undefined>(undefined);

interface LayersProviderProps {
  children: React.ReactNode;
  value?: LayersContextValue;
}

/**
 * LayersProvider 组件
 * @description 这个组件接收 usePaths hook 返回的所有状态和函数，并通过 Context 提供给其所有子组件。
 * @param props - 包含图层状态、操作函数以及子组件。
 */
export const LayersProvider: React.FC<LayersProviderProps> = ({ children, value }) => {
  const valueRef = React.useRef<LayersContextValue | null>(value ? { ...value } : null);
  const snapshotRef = React.useRef<LayersSnapshot | null>(value ? toSnapshot(value) : null);

  if (value) {
    if (valueRef.current === null) {
      valueRef.current = { ...value };
    }

    const snapshot = toSnapshot(value);

    const snapshotChanged =
      snapshotRef.current === null ||
      snapshotRef.current.frames !== snapshot.frames ||
      snapshotRef.current.currentFrameIndex !== snapshot.currentFrameIndex ||
      snapshotRef.current.paths !== snapshot.paths ||
      snapshotRef.current.selectedPathIds !== snapshot.selectedPathIds ||
      snapshotRef.current.currentBrushPath !== snapshot.currentBrushPath ||
      snapshotRef.current.currentPenPath !== snapshot.currentPenPath ||
      snapshotRef.current.currentLinePath !== snapshot.currentLinePath ||
      snapshotRef.current.canUndo !== snapshot.canUndo ||
      snapshotRef.current.canRedo !== snapshot.canRedo;

    if (snapshotChanged) {
      snapshotRef.current = snapshot;
      valueRef.current = { ...value };
    }

    return (
      <LayersContext.Provider value={valueRef.current!}>
        {children}
      </LayersContext.Provider>
    );
  }

  const fallbackSource = usePaths();

  const {
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
    currentBrushPath,
    setCurrentBrushPath,
    currentPenPath,
    setCurrentPenPath,
    currentLinePath,
    setCurrentLinePath,
    selectedPathIds,
    setSelectedPathIds,
    finishBrushPath,
    handleFinishPenPath,
    handleCancelPenPath,
    handleFinishLinePath,
    handleCancelLinePath,
    handleReorder,
    handleDeleteSelected,
  } = fallbackSource;

  const contextValue = useMemo<LayersContextValue>(() => ({
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
    currentBrushPath,
    setCurrentBrushPath,
    currentPenPath,
    setCurrentPenPath,
    currentLinePath,
    setCurrentLinePath,
    selectedPathIds,
    setSelectedPathIds,
    finishBrushPath,
    handleFinishPenPath,
    handleCancelPenPath,
    handleFinishLinePath,
    handleCancelLinePath,
    handleReorder,
    handleDeleteSelected,
  }), [
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
    currentBrushPath,
    setCurrentBrushPath,
    currentPenPath,
    setCurrentPenPath,
    currentLinePath,
    setCurrentLinePath,
    selectedPathIds,
    setSelectedPathIds,
    finishBrushPath,
    handleFinishPenPath,
    handleCancelPenPath,
    handleFinishLinePath,
    handleCancelLinePath,
    handleReorder,
    handleDeleteSelected,
  ]);

  return (
    <LayersContext.Provider value={contextValue}>
      {children}
    </LayersContext.Provider>
  );
};

/**
 * useLayers 自定义 Hook
 * @description 这是一个用于消费 LayersContext 的便捷 hook。
 * 它确保了 context 在被使用时已经被定义，并返回完整的图层状态和操作函数。
 * @throws 如果在 LayersProvider 外部使用，将抛出错误。
 * @returns 返回 LayersContext 的值。
 */
export const useLayers = (): LayersContextValue => {
  const context = useContext(LayersContext);
  if (context === undefined) {
    throw new Error('useLayers must be used within a LayersProvider');
  }
  return context;
};