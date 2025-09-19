/**
 * 本文件定义了一个自定义 Hook (usePaths)，用于管理应用中所有路径数据。
 * 它负责处理路径的创建、更新、删除，并维护一个支持撤销/重做的历史记录栈。
 * 此版本已重构为协调器，组合了多个功能更专一的子 Hook。
 */

import { useState, useCallback, useEffect } from 'react';
import type { AnyPath, VectorPathData } from '../types';
import { brushToVectorPath } from '../lib/drawing';
import { useFrameManagement } from './useFrameManagement';
import { useLiveDrawingState } from './useLiveDrawingState';
import { getLocalStorageItem } from '../lib/utils';

/**
 * 自定义钩子，通过组合其他钩子来协调管理所有与路径相关的状态和操作。
 * 它维持了与重构前版本兼容的 API，供应用的其他部分使用。
 */
export const usePaths = () => {
  const frameManagement = useFrameManagement();
  const liveDrawingState = useLiveDrawingState();
  const { paths } = frameManagement;
  const [selectedPathIds, setSelectedPathIds] = useState<string[]>(() => getLocalStorageItem('whiteboard_selectedPathIds', []));

  useEffect(() => {
    localStorage.setItem('whiteboard_selectedPathIds', JSON.stringify(selectedPathIds));
  }, [selectedPathIds]);

  useEffect(() => {
    if (selectedPathIds.length === 0) return;

    const existingIds = new Set<string>();
    const stack = [...paths];
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) continue;
      existingIds.add(current.id);
      if (current.tool === 'group') {
        stack.push(...current.children);
      }
    }

    if (!selectedPathIds.some(id => !existingIds.has(id))) return;

    setSelectedPathIds(prev => prev.filter(id => existingIds.has(id)));
  }, [paths, selectedPathIds, setSelectedPathIds]);

  const { setPaths: setCurrentFramePaths } = frameManagement;
  const { currentBrushPath, setCurrentBrushPath, currentPenPath, setCurrentPenPath, currentLinePath, setCurrentLinePath } = liveDrawingState;
  
  const finishBrushPath = useCallback(() => {
    const pathToConvert = currentBrushPath;
    setCurrentBrushPath(null);
    if (pathToConvert && pathToConvert.points.length > 1) {
      const vectorPathData = brushToVectorPath({ ...pathToConvert });
      setCurrentFramePaths(prev => [...prev, vectorPathData]);
    }
  }, [currentBrushPath, setCurrentBrushPath, setCurrentFramePaths]);
  
  const handleFinishPenPath = useCallback((isClosed: boolean = false) => {
    if (currentPenPath && currentPenPath.anchors.length > 0) {
      const finalPath: VectorPathData = isClosed ? { ...currentPenPath, isClosed: true } : currentPenPath;
      setCurrentFramePaths(prev => [...prev, finalPath]);
      setCurrentPenPath(null);
    }
  }, [currentPenPath, setCurrentPenPath, setCurrentFramePaths]);
  
  const handleCancelPenPath = useCallback(() => {
    setCurrentPenPath(null);
  }, [setCurrentPenPath]);

  const handleFinishLinePath = useCallback(() => {
      if (currentLinePath && currentLinePath.anchors.length > 1) {
          setCurrentFramePaths(prev => [...prev, currentLinePath]);
      }
      setCurrentLinePath(null);
  }, [currentLinePath, setCurrentLinePath, setCurrentFramePaths]);

  const handleCancelLinePath = useCallback(() => {
      setCurrentLinePath(null);
  }, [setCurrentLinePath]);
  
  const handleReorder = useCallback((direction: 'forward' | 'backward' | 'front' | 'back') => {
    frameManagement.setPaths(currentPaths => {
      if (selectedPathIds.length === 0) return currentPaths;
      
      const selectedSet = new Set(selectedPathIds);
      const selected = currentPaths.filter(p => selectedSet.has(p.id));
      const notSelected = currentPaths.filter(p => !selectedSet.has(p.id));

      switch(direction) {
        case 'front': return [...notSelected, ...selected];
        case 'back': return [...selected, ...notSelected];
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
  }, [selectedPathIds, frameManagement.setPaths]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedPathIds.length > 0) {
      frameManagement.handleDeletePaths(selectedPathIds);
      setSelectedPathIds([]);
    }
  }, [selectedPathIds, frameManagement]);

  return {
    ...frameManagement,
    ...liveDrawingState,
    selectedPathIds,
    setSelectedPathIds,
    finishBrushPath,
    handleFinishPenPath,
    handleCancelPenPath,
    handleFinishLinePath,
    handleCancelLinePath,
    handleReorder,
    handleDeleteSelected,
  };
};
