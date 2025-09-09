/**
 * 本文件定义了一个自定义 Hook (useFrameManagement)，专注于管理帧的状态。
 * 这包括添加、删除、复制和排序帧，以及对当前帧内的路径进行操作。
 * 它在内部使用 useHistoryStack 来实现历史记录功能。
 */
import { useCallback, useEffect } from 'react';
import type { AnyPath, Frame, FrameData } from '../types';
import { useHistoryStack } from './useHistoryStack';
import { getLocalStorageItem } from '../lib/utils';
import {
  recursivelyDeletePaths,
  recursivelyReorderPaths,
  recursivelySetPathName,
  recursivelyTogglePathsProperty,
  recursivelyUpdatePath,
} from './frame-management-logic';

interface FrameState {
  frames: Frame[];
  currentFrameIndex: number;
}

const getInitialFrameState = (): FrameState => ({
  frames: getLocalStorageItem('whiteboard_frames', [{ paths: [] }]),
  currentFrameIndex: getLocalStorageItem('whiteboard_currentFrameIndex', 0),
});

/**
 * 自定义 Hook，用于管理所有与帧相关的状态和操作。
 * @returns 返回一个包含帧状态和管理函数的对象。
 */
export const useFrameManagement = () => {
  const [frameHistoryState, setFrameHistoryState, undo, redo, canUndo, canRedo, beginCoalescing, endCoalescing] = useHistoryStack<FrameState>(getInitialFrameState());
  
  const { frames, currentFrameIndex } = frameHistoryState;

  useEffect(() => {
    localStorage.setItem('whiteboard_frames', JSON.stringify(frames));
    localStorage.setItem('whiteboard_currentFrameIndex', JSON.stringify(currentFrameIndex));
  }, [frames, currentFrameIndex]);

  const currentFrame = frames[currentFrameIndex];
  const paths = currentFrame?.paths ?? [];

  const setFramesState = useCallback((updater: FrameState | ((prevState: FrameState) => FrameState)) => {
    setFrameHistoryState(updater);
  }, [setFrameHistoryState]);
  
  const setCurrentFrameIndex = useCallback((updater: number | ((prevIndex: number) => number)) => {
    const newIndex = typeof updater === 'function' ? updater(frameHistoryState.currentFrameIndex) : updater;
    const clampedIndex = Math.max(0, Math.min(newIndex, frameHistoryState.frames.length - 1));
    // This state change does not create a new history entry, as it's a UI navigation action.
    // We modify history directly.
    setFrameHistoryState(prev => ({ ...prev, currentFrameIndex: clampedIndex }));
  }, [setFrameHistoryState, frameHistoryState]);

  const setPaths = useCallback((updater: React.SetStateAction<AnyPath[]>) => {
    setFramesState(prev => {
      // 1. 为当前帧计算新的路径数组
      const oldPaths = prev.frames[prev.currentFrameIndex]?.paths ?? [];
      const newPathsForCurrentFrame = typeof updater === 'function' ? updater(oldPaths) : updater;

      // 2. 从这次更新中提取出权威的画框列表
      const masterFrameList = newPathsForCurrentFrame.filter(p => p.tool === 'frame');

      // 3. 将此列表同步到所有关键帧
      const synchronizedFrames = prev.frames.map((frame, index) => {
        // 过滤掉旧的画框，只保留内容
        const contentPaths = frame.paths.filter(p => p.tool !== 'frame');

        if (index === prev.currentFrameIndex) {
          // 对于当前帧，其内容也在被更新
          const newContentPaths = newPathsForCurrentFrame.filter(p => p.tool !== 'frame');
          return { ...frame, paths: [...newContentPaths, ...masterFrameList] };
        } else {
          // 对于其他帧，只更新它们的画框列表
          return { ...frame, paths: [...contentPaths, ...masterFrameList] };
        }
      });
      
      return { ...prev, frames: synchronizedFrames };
    });
  }, [setFramesState]);
  
  const handleLoadFile = useCallback((newFrames: Frame[], newFrameIndex: number = 0) => {
    setFramesState({ frames: newFrames, currentFrameIndex: newFrameIndex });
  }, [setFramesState]);

  const handleDeletePaths = useCallback((ids: string[]) => {
    setPaths(prev => recursivelyDeletePaths(prev, ids));
  }, [setPaths]);

  const togglePathsProperty = useCallback((ids: string[], property: 'isLocked' | 'isVisible') => {
    setPaths(prev => recursivelyTogglePathsProperty(prev, ids, property));
  }, [setPaths]);
  
  const toggleGroupCollapse = useCallback((id: string) => {
    setPaths(prev => recursivelyUpdatePath(prev, id, p => ({ ...p, isCollapsed: !(p as any).isCollapsed })));
  }, [setPaths]);

  const setPathName = useCallback((id: string, name: string) => {
    setPaths(prev => recursivelySetPathName(prev, id, name));
  }, [setPaths]);

  const reorderPaths = useCallback((draggedId: string, targetId: string, position: 'above' | 'below' | 'inside') => {
    setPaths(prev => recursivelyReorderPaths(prev, draggedId, targetId, position));
  }, [setPaths]);

  /**
   * 添加一个新帧，并同步所有画框形状。
   */
  const addFrame = useCallback(() => {
    setFramesState(prev => {
      // 从当前帧中提取画框形状的主列表。
      const currentFramePaths = prev.frames[prev.currentFrameIndex]?.paths ?? [];
      const masterFrameList = currentFramePaths.filter(p => p.tool === 'frame');
      
      return {
        ...prev,
        // 添加一个只包含主画框列表的新帧。
        frames: [...prev.frames, { paths: [...masterFrameList] }],
        currentFrameIndex: prev.frames.length,
      };
    });
  }, [setFramesState]);
  
  /**
   * 复制指定索引处的帧。
   * @param index - 要复制的帧的索引。
   */
  const copyFrame = useCallback((index: number) => {
    setFramesState(prev => {
      const frameToCopy = prev.frames[index];
      if (!frameToCopy) return prev;
      const newFrames = [...prev.frames];
      newFrames.splice(index + 1, 0, JSON.parse(JSON.stringify(frameToCopy)));
      return { ...prev, frames: newFrames, currentFrameIndex: index + 1 };
    });
  }, [setFramesState]);
  
  /**
   * 删除指定索引处的帧。
   * @param index - 要删除的帧的索引。
   */
  const deleteFrame = useCallback((index: number) => {
    if (frames.length <= 1) return;
    setFramesState(prev => {
      const newFrames = prev.frames.filter((_, i) => i !== index);
      const newIndex = Math.min(prev.currentFrameIndex, newFrames.length - 1);
      return { ...prev, frames: newFrames, currentFrameIndex: newIndex };
    });
  }, [setFramesState, frames.length]);

  /**
   * 对帧进行重新排序。
   * @param fromIndex - 拖动的帧的起始索引。
   * @param toIndex - 放置帧的目标索引。
   */
  const reorderFrames = useCallback((fromIndex: number, toIndex: number) => {
    setFramesState(prev => {
        const newFrames = [...prev.frames];
        const [movedFrame] = newFrames.splice(fromIndex, 1);
        newFrames.splice(toIndex, 0, movedFrame);
        
        let newCurrentIndex = prev.currentFrameIndex;
        if (prev.currentFrameIndex === fromIndex) {
            newCurrentIndex = toIndex;
        } else if (prev.currentFrameIndex > fromIndex && prev.currentFrameIndex <= toIndex) {
            newCurrentIndex--;
        } else if (prev.currentFrameIndex < fromIndex && prev.currentFrameIndex >= toIndex) {
            newCurrentIndex++;
        }

        return { ...prev, frames: newFrames, currentFrameIndex: newCurrentIndex };
    });
  }, [setFramesState]);

  return {
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
  };
};
