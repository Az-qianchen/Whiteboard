/**
 * 本文件定义了一个自定义 Hook (usePaths)，用于管理应用中所有路径数据。
 * 它负责处理路径的创建、更新、删除，并维护一个支持撤销/重做的历史记录栈。
 */

import React, { useState, useRef, useCallback } from 'react';
import type { AnyPath, LivePath, VectorPathData, BrushPathData, GroupData } from '../types';
import { brushToVectorPath, getPathBoundingBox } from '../lib/drawing';
import type { BBox } from '../types';

const MAX_HISTORY = 200;

function isBboxInside(innerBbox: BBox, outerBbox: BBox): boolean {
    if (!innerBbox || !outerBbox) return false;
    return (
        innerBbox.x >= outerBbox.x &&
        innerBbox.y >= outerBbox.y &&
        (innerBbox.x + innerBbox.width) <= (outerBbox.x + outerBbox.width) &&
        (innerBbox.y + innerBbox.height) <= (outerBbox.y + outerBbox.height)
    );
}

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
  
  const paths = history[historyIndex] ?? [];
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
      const currentPaths = current.history[current.index] ?? [];
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
   * 加载一组新的路径，完全替换当前的状态和历史记录。
   * 用于打开文件。
   * @param {AnyPath[]} newPaths - 要加载的新路径数组。
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
        const currentPaths = current.history[current.index] ?? [];
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
   * 完成当前的画笔路径，将其从临时状态转换为永久矢量路径并添加到画布中。
   */
  const finishBrushPath = () => {
    if (currentBrushPath && currentBrushPath.points.length > 1) {
      const vectorPathData = brushToVectorPath({
        ...currentBrushPath,
      });
      setPaths(prev => [...prev, vectorPathData]);
    }
    setCurrentBrushPath(null);
  };
  
  /**
   * 完成当前的钢笔路径，可选择性地闭合路径，并将其添加到画布中。
   * @param {boolean} isClosed - 是否闭合路径。
   */
  const handleFinishPenPath = (isClosed: boolean = false) => {
    if (currentPenPath && currentPenPath.anchors.length > 0) {
      const finalPath: VectorPathData = { ...currentPenPath, isClosed };
      setPaths(prev => [...prev, finalPath]);
    }
    setCurrentPenPath(null);
  };

  /**
   * 取消当前的钢笔路径绘制。
   */
  const handleCancelPenPath = useCallback(() => {
    setCurrentPenPath(null);
  }, []);

  /**
   * 完成当前的线条路径绘制并将其添加到画布中。
   */
  const handleFinishLinePath = () => {
    if (currentLinePath && currentLinePath.anchors.length > 1) {
      setPaths(prev => [...prev, currentLinePath]);
    }
    setCurrentLinePath(null);
  };
  
  /**
   * 取消当前的线条路径绘制。
   */
  const handleCancelLinePath = useCallback(() => {
    setCurrentLinePath(null);
  }, []);

  /**
   * 执行撤销操作。如果正在绘制钢笔或线条路径，则移除最后一个锚点；否则，回退到历史记录中的上一个状态。
   */
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
  
  /**
   * 执行重做操作，前进到历史记录中的下一个状态。
   */
  const handleRedo = () => {
    endCoalescing();
    if (historyIndex < history.length - 1) {
      setHistState(current => ({ ...current, index: current.index + 1 }));
    }
  };

  /**
   * 清空画布并重置历史记录。
   */
  const handleClear = useCallback(() => {
    endCoalescing();
    // 这会将整个历史记录重置为单个空白状态。
    setHistState({ history: [[]], index: 0 });
    
    // 同时清除此 hook 管理的任何正在进行的绘图状态至关重要。
    setCurrentBrushPath(null);
    setCurrentPenPath(null);
    setCurrentLinePath(null);
    
    // 并重置任何选择。
    setSelectedPathIds([]);
  }, [endCoalescing]);
  
  /**
   * 从画布中删除指定 ID 的路径，包括组内的路径。
   * @param {string[]} idsToDelete - 要删除的路径 ID 数组。
   */
  const handleDeletePaths = useCallback((idsToDelete: string[]) => {
    if (idsToDelete.length === 0) return;

    const idsSet = new Set(idsToDelete);

    const filterRecursively = (paths: AnyPath[]): AnyPath[] => {
        return paths
            .filter(p => !idsSet.has(p.id))
            .map(p => {
                if (p.tool === 'group') {
                    const group = p as GroupData;
                    const newChildren = filterRecursively(group.children);
                    return { ...group, children: newChildren };
                }
                return p;
            });
    };

    setPaths(filterRecursively);
    setSelectedPathIds(prev => prev.filter(id => !idsSet.has(id)));
  }, [setPaths, setSelectedPathIds]);


  /**
   * 删除当前选中的路径。
   */
  const handleDeleteSelected = useCallback(() => {
    handleDeletePaths(selectedPathIds);
  }, [selectedPathIds, handleDeletePaths]);

  /**
   * 重新排序选中的路径（上移、下移、置顶、置底）。
   * @param {'forward' | 'backward' | 'front' | 'back'} direction - 排序方向。
   */
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
            if (currentPath && nextPath && selectedSet.has(currentPath.id) && !selectedSet.has(nextPath.id)) {
              [newPaths[i], newPaths[i + 1]] = [nextPath, currentPath];
            }
          }
          return newPaths;
        case 'backward':
          for (let i = 1; i < newPaths.length; i++) {
            const currentPath = newPaths[i];
            const prevPath = newPaths[i - 1];
            if (currentPath && prevPath && selectedSet.has(currentPath.id) && !selectedSet.has(prevPath.id)) {
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

  /**
   * 切换路径的可见性或锁定状态。
   * @param {string[]} pathIds - 要切换属性的路径 ID 数组。
   * @param {'isVisible' | 'isLocked'} property - 要切换的属性。
   */
  const togglePathsProperty = useCallback((pathIds: string[], property: 'isVisible' | 'isLocked') => {
    const idsSet = new Set(pathIds);
      const findAndToggle = (paths: AnyPath[]): AnyPath[] => {
          return paths.map(p => {
              let newPath = p;
              if (idsSet.has(p.id)) {
                  const currentVal = p[property] ?? (property === 'isVisible' ? true : false);
                  newPath = { ...p, [property]: !currentVal };
              }
              if (newPath.tool === 'group') {
                  const group = newPath as GroupData;
                  return { ...group, children: findAndToggle(group.children) };
              }
              return newPath;
          });
      };
      setPaths(findAndToggle);
  }, [setPaths]);

  /**
   * 切换组的折叠/展开状态。
   * @param {string} groupId - 要切换的组 ID。
   */
  const toggleGroupCollapse = useCallback((groupId: string) => {
    const findAndToggle = (paths: AnyPath[]): AnyPath[] => {
        return paths.map(p => {
            if (p.id === groupId && p.tool === 'group') {
                const group = p as GroupData;
                return { ...group, isCollapsed: !(group.isCollapsed ?? false) };
            }
            if (p.tool === 'group') {
                const group = p as GroupData;
                return { ...group, children: findAndToggle(group.children) };
            }
            return p;
        });
    };
    setPaths(findAndToggle);
  }, [setPaths]);
  
  /**
   * 设置路径的名称（用于图层面板）。
   * @param {string} pathId - 要重命名的路径 ID。
   * @param {string} name - 新的名称。
   */
  const setPathName = useCallback((pathId: string, name: string) => {
      const findAndSetName = (paths: AnyPath[]): AnyPath[] => {
          return paths.map(p => {
              if (p.id === pathId) {
                  return { ...p, name };
              }
              if (p.tool === 'group') {
                  const group = p as GroupData;
                  return { ...group, children: findAndSetName(group.children) };
              }
              return p;
          });
      };
      setPaths(findAndSetName);
  }, [setPaths]);


  /**
   * 在图层面板中重新排序路径。
   * @param {string} draggedId - 被拖动的路径 ID。
   * @param {string} targetId - 拖放目标路径 ID。
   * @param {'above' | 'below' | 'inside'} position - 拖放位置。
   */
  const reorderPaths = useCallback((draggedId: string, targetId: string, position: 'above' | 'below' | 'inside') => {
    setPaths(currentPaths => {
        let draggedItem: AnyPath | null = null;

        const findAndRemove = (paths: AnyPath[]): AnyPath[] => {
            const newPaths = [];
            for (const path of paths) {
                if (path.id === draggedId) {
                    draggedItem = path;
                    continue;
                }
                if (path.tool === 'group') {
                    const group = path as GroupData;
                    const newChildren = findAndRemove(group.children);
                    if (newChildren.length !== group.children.length) {
                         newPaths.push({ ...group, children: newChildren });
                         continue;
                    }
                }
                newPaths.push(path);
            }
            return newPaths;
        };

        const pathsAfterRemove = findAndRemove(currentPaths);
        if (!draggedItem) return currentPaths;

        const findAndInsert = (paths: AnyPath[]): AnyPath[] | null => {
            for (let i = 0; i < paths.length; i++) {
                const path = paths[i];
                if (path?.id === targetId) {
                    const newPaths = [...paths];
                    if (position === 'inside' && path.tool === 'group') {
                        const updatedGroup = { ...path as GroupData, children: [...(path as GroupData).children, draggedItem!], isCollapsed: false };
                        newPaths.splice(i, 1, updatedGroup);
                    } else {
                        // 因为 UI 图层列表是反向的，“上方”意味着数据数组中的索引更大，“下方”意味着索引更小。
                        const insertIndex = position === 'above' ? i + 1 : i;
                        newPaths.splice(insertIndex, 0, draggedItem!);
                    }
                    return newPaths;
                }
                if (path?.tool === 'group') {
                   const group = path as GroupData;
                   const newChildren = findAndInsert(group.children);
                   if (newChildren) {
                       const newPaths = [...paths];
                       newPaths[i] = { ...group, children: newChildren };
                       return newPaths;
                   }
                }
            }
            return null;
        };
        
        const finalPaths = findAndInsert(pathsAfterRemove);
        return finalPaths || currentPaths;
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
    toggleGroupCollapse,
    setPathName,
  };
};