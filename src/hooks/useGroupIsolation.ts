/**
 * 本文件定义了一个自定义 Hook，用于管理组隔离模式的状态和逻辑。
 */
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { AnyPath, GroupData } from '../types';

type PathState = {
  paths: AnyPath[];
  setPaths: (updater: React.SetStateAction<AnyPath[]>) => void;
};

/**
 * 管理组隔离模式状态的 Hook。
 * @param pathState - 包含根路径及其设置器的对象。
 * @returns 返回隔离模式的状态和操作函数。
 */
export const useGroupIsolation = (pathState: any) => {
  const [groupIsolationPath, setGroupIsolationPath] = useState<AnyPath[]>([]);

  // Effect to keep the groupIsolationPath state synchronized with the main paths state.
  // This prevents the isolated view from becoming stale after an edit.
  useEffect(() => {
    if (groupIsolationPath.length === 0) return;

    const newPath: AnyPath[] = [];
    let currentLevelPaths = pathState.paths;

    for (const oldGroup of groupIsolationPath) {
        const freshGroup = currentLevelPaths.find(p => p.id === oldGroup.id);
        if (freshGroup && freshGroup.tool === 'group') {
            newPath.push(freshGroup);
            currentLevelPaths = (freshGroup as GroupData).children;
        } else {
            // A group in the path was deleted or is no longer a group. Exit isolation.
            setGroupIsolationPath([]);
            return;
        }
    }

    // Only update state if the path has actually changed to prevent render loops.
    // A reference check on the last element is sufficient because an update
    // to a nested group's children would create a new group object at each level up.
    if (groupIsolationPath.length > 0 && newPath.length > 0 &&
        groupIsolationPath[groupIsolationPath.length - 1] !== newPath[newPath.length - 1]) {
        setGroupIsolationPath(newPath);
    }
  }, [pathState.paths, groupIsolationPath]);


  /**
   * 处理双击组事件，进入该组的隔离编辑模式。
   * @param groupId - 要进入的组的 ID。
   */
  const handleGroupDoubleClick = useCallback((groupId: string) => {
    const findGroup = (paths: AnyPath[], id: string): GroupData | null => {
      for (const p of paths) {
        if (p.id === id && p.tool === 'group') return p as GroupData;
        if (p.tool === 'group') {
            const found = findGroup((p as GroupData).children, id);
            if (found) return found;
        }
      }
      return null;
    }
    const currentPaths = groupIsolationPath.length > 0 ? (groupIsolationPath[groupIsolationPath.length - 1] as GroupData).children : pathState.paths;
    const group = findGroup(currentPaths, groupId);
    if (group) {
        setGroupIsolationPath(prev => [...prev, group]);
    }
  }, [pathState.paths, groupIsolationPath]);

  /**
   * 退出当前组的隔离编辑模式，返回上一级。
   */
  const handleExitGroup = useCallback(() => {
    setGroupIsolationPath(prev => prev.slice(0, prev.length - 1));
  }, []);

  /**
   * 通过面包屑导航跳转到指定的组层级。
   * @param index - 要跳转到的组在隔离路径中的索引。
   */
  const handleJumpToGroup = useCallback((index: number) => {
    if (index < 0) {
      setGroupIsolationPath([]);
    } else {
      setGroupIsolationPath(prev => prev.slice(0, index + 1));
    }
  }, []);
  
  /**
   * 计算当前在隔离模式下可见的活动路径。
   */
  const activePaths = useMemo(() => {
    if (groupIsolationPath.length === 0) return pathState.paths;
    const currentGroup = groupIsolationPath[groupIsolationPath.length - 1];
    return (currentGroup as GroupData).children || [];
  }, [groupIsolationPath, pathState.paths]);

  /**
   * 计算在隔离模式下应在背景中渲染的路径。
   */
  const backgroundPaths = useMemo(() => {
    if (groupIsolationPath.length === 0) return [];
    return pathState.paths;
  }, [groupIsolationPath, pathState.paths]);

  /**
   * 创建一个用于更新活动路径的函数。
   */
  const setActivePaths = useCallback((updater: React.SetStateAction<AnyPath[]>) => {
    if (groupIsolationPath.length === 0) {
      pathState.setPaths(updater);
      return;
    }

    pathState.setPaths(rootPaths => {
      const newActivePaths = typeof updater === 'function' ? updater(activePaths) : updater;

      const updateRecursively = (paths: AnyPath[], groupStack: AnyPath[]): AnyPath[] => {
        if (groupStack.length === 0) return paths;
        const [nextGroupInStack, ...restStack] = groupStack;

        return paths.map(p => {
          if (p.id === nextGroupInStack.id && p.tool === 'group') {
            const group = p as GroupData;
            if (restStack.length === 0) {
              return { ...group, children: newActivePaths };
            } else {
              return { ...group, children: updateRecursively(group.children, restStack) };
            }
          }
          return p;
        });
      };
      return updateRecursively(rootPaths, groupIsolationPath);
    });
  }, [pathState, groupIsolationPath, activePaths]);

  /**
   * 记忆化为活动路径创建的 pathState 对象。
   */
  const activePathState = useMemo(() => ({
    ...pathState,
    paths: activePaths,
    setPaths: setActivePaths,
  }), [pathState, activePaths, setActivePaths]);
  
  return {
    groupIsolationPath,
    activePaths,
    backgroundPaths,
    activePathState,
    handleGroupDoubleClick,
    handleExitGroup,
    handleJumpToGroup,
  };
};