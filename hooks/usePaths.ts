/**
 * 本文件定义了一个自定义 Hook (usePaths)，用于管理应用中所有路径数据。
 * 它负责处理路径的创建、更新、删除，并维护一个支持撤销/重做的历史记录栈。
 */

import React, { useState, useRef, useCallback } from 'react';
import type { AnyPath, LivePath, VectorPathData, BrushPathData } from '../types';
import { brushToVectorPath } from '../lib/drawing';

const MAX_HISTORY = 200;

/**
 * 自定义钩子，用于管理所有与路径相关的状态和操作，包括撤销/重做历史记录。
 * 此版本支持将快速更新合并为单个撤销步骤，并限制历史记录大小。
 */
export const usePaths = () => {
  const [histState, setHistState] = useState<{ history: AnyPath[][], index: number }>({
    history: [[]],
    index: 0,
  });
  const { history, index: historyIndex } = histState;
  
  const paths = history[historyIndex];
  const isCoalescingOp = useRef(false);

  const [currentBrushPath, setCurrentBrushPath] = useState<LivePath | null>(null);
  const [currentPenPath, setCurrentPenPath] = useState<VectorPathData | null>(null);
  const [currentLinePath, setCurrentLinePath] = useState<VectorPathData | null>(null);
  const [selectedPathIds, setSelectedPathIds] = useState<string[]>([]);

  /**
   * 更新路径状态。根据 isCoalescingOp 的状态，
   * 此函数可以创建新的历史记录条目，也可以更新当前条目。
   */
  const setPaths = useCallback((updater: React.SetStateAction<AnyPath[]>) => {
    setHistState(current => {
      const currentPaths = current.history[current.index];
      const newPaths = typeof updater === 'function' ? updater(currentPaths) : updater;

      if (newPaths === currentPaths) return current;

      if (isCoalescingOp.current) {
        const newHistory = [...current.history];
        newHistory[current.index] = newPaths;
        return { ...current, history: newHistory };
      } else {
        let newHistory = current.history.slice(0, current.index + 1);
        newHistory.push(newPaths);

        if (newHistory.length > MAX_HISTORY) {
          newHistory = newHistory.slice(-MAX_HISTORY);
        }

        return {
          history: newHistory,
          index: newHistory.length - 1,
        };
      }
    });
  }, []);
  
  const endCoalescing = useCallback(() => {
    isCoalescingOp.current = false;
  }, []);

  /**
   * Loads a new set of paths, completely replacing the current state and history.
   * Used for opening a file.
   */
  const handleLoadFile = useCallback((newPaths: AnyPath[]) => {
    setHistState({ history: [newPaths], index: 0 });
    setCurrentBrushPath(null);
    setCurrentPenPath(null);
    setCurrentLinePath(null);
    setSelectedPathIds([]);
    endCoalescing();
  }, [endCoalescing]);

  /**
   * 在开始一系列应合并的快速更新之前调用此函数。
   * 这会创建一个新的历史记录条目，该条目将是所有后续合并更新的目标。
   */
  const beginCoalescing = useCallback(() => {
    // 只有当没有正在进行的合并操作时，才创建一个新的历史基线
    if (!isCoalescingOp.current) {
      setHistState(current => {
        const currentPaths = current.history[current.index];
        let newHistory = current.history.slice(0, current.index + 1);
        newHistory.push(currentPaths); 

        if (newHistory.length > MAX_HISTORY) {
            newHistory = newHistory.slice(-MAX_HISTORY);
        }

        return {
          history: newHistory,
          index: newHistory.length - 1,
        };
      });
    }
    isCoalescingOp.current = true;
  }, []);

  const finishBrushPath = () => {
    if (currentBrushPath && currentBrushPath.points.length > 1) {
      const vectorPathData = brushToVectorPath({
        ...currentBrushPath,
      });
      setPaths(prev => [...prev, vectorPathData]);
    }
    setCurrentBrushPath(null);
  };
  
  const handleFinishPenPath = (isClosed: boolean = false) => {
    if (currentPenPath && currentPenPath.anchors.length > 0) {
      const finalPath: VectorPathData = { ...currentPenPath, isClosed };
      setPaths(prev => [...prev, finalPath]);
    }
    setCurrentPenPath(null);
  };

  const handleCancelPenPath = useCallback(() => {
    setCurrentPenPath(null);
  }, []);

  const handleFinishLinePath = () => {
    if (currentLinePath && currentLinePath.anchors.length > 1) {
      setPaths(prev => [...prev, currentLinePath]);
    }
    setCurrentLinePath(null);
  };
  
  const handleCancelLinePath = useCallback(() => {
    setCurrentLinePath(null);
  }, []);

  const handleUndo = () => {
    endCoalescing();
    if (currentPenPath && currentPenPath.anchors.length > 0) {
      const newAnchors = currentPenPath.anchors.slice(0, -1);
      if (newAnchors.length > 0) {
        setCurrentPenPath({ ...currentPenPath, anchors: newAnchors });
      } else {
        setCurrentPenPath(null);
      }
    } else if (currentLinePath && currentLinePath.anchors.length > 0) {
      const newAnchors = currentLinePath.anchors.slice(0, -1);
      if (newAnchors.length > 0) {
        setCurrentLinePath(prev => (prev ? { ...prev, anchors: newAnchors } : null));
      } else {
        setCurrentLinePath(null);
      }
    } else if (historyIndex > 0) {
      setHistState(current => ({ ...current, index: current.index - 1 }));
    }
  };
  
  const handleRedo = () => {
    endCoalescing();
    if (historyIndex < history.length - 1) {
      setHistState(current => ({ ...current, index: current.index + 1 }));
    }
  };

  const handleClear = useCallback(() => {
    endCoalescing();
    // This resets the entire history to a single blank state.
    setHistState({ history: [[]], index: 0 });
    
    // It's crucial to also clear any in-progress drawing states
    // that are managed by this hook.
    setCurrentBrushPath(null);
    setCurrentPenPath(null);
    setCurrentLinePath(null);
    
    // And reset any selections.
    setSelectedPathIds([]);
  }, [endCoalescing]);
  
  const handleDeletePaths = useCallback((idsToDelete: string[]) => {
    if (idsToDelete.length === 0) return;
    setPaths(prev => prev.filter(p => !idsToDelete.includes(p.id)));
    // Also remove them from selection if they were selected
    setSelectedPathIds(prev => prev.filter(id => !idsToDelete.includes(id)));
  }, [setPaths, setSelectedPathIds]);

  const handleDeleteSelected = useCallback(() => {
    handleDeletePaths(selectedPathIds);
  }, [selectedPathIds, handleDeletePaths]);

  const handleReorder = useCallback((direction: 'forward' | 'backward' | 'front' | 'back') => {
    if (selectedPathIds.length === 0) return;

    setPaths(currentPaths => {
      const newPaths = [...currentPaths];
      const selectedSet = new Set(selectedPathIds);

      switch (direction) {
        case 'forward':
          for (let i = newPaths.length - 2; i >= 0; i--) {
            const currentPath = newPaths[i];
            const nextPath = newPaths[i + 1];
            if (selectedSet.has(currentPath.id) && !selectedSet.has(nextPath.id)) {
              [newPaths[i], newPaths[i + 1]] = [nextPath, currentPath];
            }
          }
          return newPaths;
        case 'backward':
          for (let i = 1; i < newPaths.length; i++) {
            const currentPath = newPaths[i];
            const prevPath = newPaths[i - 1];
            if (selectedSet.has(currentPath.id) && !selectedSet.has(prevPath.id)) {
              [newPaths[i], newPaths[i - 1]] = [prevPath, currentPath];
            }
          }
          return newPaths;
        case 'front': {
          const selectedItems = newPaths.filter(p => selectedSet.has(p.id));
          const otherItems = newPaths.filter(p => !selectedSet.has(p.id));
          return [...otherItems, ...selectedItems];
        }
        case 'back': {
          const selectedItems = newPaths.filter(p => selectedSet.has(p.id));
          const otherItems = newPaths.filter(p => !selectedSet.has(p.id));
          return [...selectedItems, ...otherItems];
        }
        default:
          return currentPaths;
      }
    });
  }, [selectedPathIds, setPaths]);

  const togglePathsProperty = useCallback((pathIds: string[], property: 'isVisible' | 'isLocked') => {
      setPaths(prevPaths => prevPaths.map(p => {
          if (pathIds.includes(p.id)) {
              // isVisible defaults to true, isLocked defaults to false
              const currentVal = p[property] ?? (property === 'isVisible' ? true : false);
              return { ...p, [property]: !currentVal };
          }
          return p;
      }));
  }, [setPaths]);

  const reorderPaths = useCallback((draggedId: string, targetId: string, position: 'above' | 'below') => {
      setPaths(currentPaths => {
          const pathsCopy = [...currentPaths];
          const draggedIndex = pathsCopy.findIndex(p => p.id === draggedId);
          if (draggedIndex === -1) return currentPaths;

          const [draggedItem] = pathsCopy.splice(draggedIndex, 1);

          const targetIndexRaw = pathsCopy.findIndex(p => p.id === targetId);
          if (targetIndexRaw === -1) return currentPaths;
          
          const finalIndex = position === 'above' ? targetIndexRaw + 1 : targetIndexRaw;

          pathsCopy.splice(finalIndex, 0, draggedItem);
          return pathsCopy;
      });
  }, [setPaths]);

  const canUndo = (currentPenPath && currentPenPath.anchors.length > 0) || (currentLinePath && currentLinePath.anchors.length > 0) || historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  const canClear = paths.length > 0 || !!currentBrushPath || !!currentPenPath || !!currentLinePath;


  return {
    paths,
    setPaths,
    beginCoalescing,
    endCoalescing,
    currentBrushPath,
    setCurrentBrushPath,
    currentPenPath,
    currentLinePath,
    setCurrentPenPath,
    setCurrentLinePath,
    selectedPathIds,
    setSelectedPathIds,
    finishBrushPath,
    handleFinishPenPath,
    handleCancelPenPath,
    handleFinishLinePath,
    handleCancelLinePath,
    handleUndo,
    canUndo,
    handleRedo,
    canRedo,
    handleClear,
    canClear,
    handleDeleteSelected,
    handleDeletePaths,
    handleLoadFile,
    handleReorder,
    togglePathsProperty,
    reorderPaths,
  };
};