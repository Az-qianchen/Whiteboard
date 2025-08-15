
import React, { useState, useRef, useCallback } from 'react';
import type { AnyPath, LivePath, VectorPathData } from '../types';
import { convertLivePathToVectorPath } from '../lib/path-fitting';

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

  /**
   * 在一系列更新完成后调用此函数。
   */
  const endCoalescing = useCallback(() => {
    isCoalescingOp.current = false;
  }, []);

  const finishBrushPath = () => {
    if (currentBrushPath && currentBrushPath.points.length > 1) {
      const vectorPath = convertLivePathToVectorPath(currentBrushPath);
      setPaths(prev => [...prev, vectorPath]);
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

  const handleCancelPenPath = () => {
    setCurrentPenPath(null);
  };

  const handleFinishLinePath = () => {
    if (currentLinePath && currentLinePath.anchors.length > 1) {
      setPaths(prev => [...prev, currentLinePath]);
    }
    setCurrentLinePath(null);
  };
  
  const handleCancelLinePath = () => {
    setCurrentLinePath(null);
  };

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

  const handleClear = () => {
    endCoalescing();
    setPaths([]);
    setCurrentBrushPath(null);
    setCurrentPenPath(null);
    setCurrentLinePath(null);
    setSelectedPathIds([]);
  };

  const handleDeleteSelected = useCallback(() => {
    if (selectedPathIds.length === 0) return;
    setPaths(prev => prev.filter(p => !selectedPathIds.includes(p.id)));
    setSelectedPathIds([]);
  }, [selectedPathIds, setPaths, setSelectedPathIds]);

  const canUndo = (currentPenPath && currentPenPath.anchors.length > 0) || (currentLinePath && currentLinePath.anchors.length > 0) || historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  const canClear = paths.length > 0 || (currentBrushPath && currentBrushPath.points.length > 0) || (currentLinePath && currentLinePath.anchors.length > 0);

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
  };
};