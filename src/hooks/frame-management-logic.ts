/**
 * 本文件包含用于帧和路径管理的递归辅助函数。
 * 这些函数从 useFrameManagement 中提取出来，以实现更好的代码组织和重用。
 */
import type { AnyPath, GroupData } from '../types';

/**
 * 递归地更新路径树中的特定路径。
 * @param paths - 当前的路径数组。
 * @param pathId - 要更新的路径 ID。
 * @param updater - 一个函数，接收旧路径并返回新路径。
 * @returns 返回更新后的路径数组。
 */
export const recursivelyUpdatePath = (paths: AnyPath[], pathId: string, updater: (path: AnyPath) => AnyPath): AnyPath[] => {
  return paths.map(p => {
    if (p.id === pathId) return updater(p);
    if (p.tool === 'group') {
      const newChildren = recursivelyUpdatePath((p as GroupData).children, pathId, updater);
      if (newChildren !== (p as GroupData).children) {
        return { ...p, children: newChildren };
      }
    }
    return p;
  });
};

/**
 * 递归地为路径树中的特定路径设置名称。
 * @param paths - 当前的路径数组。
 * @param pathId - 要设置名称的路径 ID。
 * @param name - 新的路径名称。
 * @returns 返回更新后的路径数组。
 */
export const recursivelySetPathName = (paths: AnyPath[], pathId: string, name: string): AnyPath[] => {
  return recursivelyUpdatePath(paths, pathId, p => ({ ...p, name }));
};

/**
 * 递归地从路径树中删除指定 ID 的路径。
 * @param paths - 当前的路径数组。
 * @param ids - 要删除的路径 ID 数组。
 * @returns 返回更新后的路径数组。
 */
export const recursivelyDeletePaths = (paths: AnyPath[], ids: string[]): AnyPath[] => {
  const idSet = new Set(ids);
  const filteredPaths = paths.filter(p => !idSet.has(p.id));
  return filteredPaths.map(p => {
    if (p.tool === 'group') {
      const newChildren = recursivelyDeletePaths((p as GroupData).children, ids);
      // Create a new group object only if children have changed
      if (newChildren.length !== (p as GroupData).children.length) {
        return { ...p, children: newChildren };
      }
    }
    return p;
  });
};

/**
 * 递归地切换路径树中指定路径的属性（如可见性、锁定状态）。
 * @param paths - 当前的路径数组。
 * @param ids - 要切换属性的路径 ID 数组。
 * @param property - 要切换的属性（'isLocked' 或 'isVisible'）。
 * @returns 返回更新后的路径数组。
 */
export const recursivelyTogglePathsProperty = (paths: AnyPath[], ids: string[], property: 'isLocked' | 'isVisible'): AnyPath[] => {
  const idSet = new Set(ids);
  const toggle = (path: AnyPath): AnyPath => {
    const currentValue = property === 'isLocked' ? path.isLocked === true : path.isVisible !== false;
    return { ...path, [property]: !currentValue };
  };

  const recurse = (currentPaths: AnyPath[]): AnyPath[] => {
    return currentPaths.map(p => {
      let newPath = p;
      if (idSet.has(p.id)) {
        newPath = toggle(p);
      }
      if (newPath.tool === 'group') {
        const newChildren = recurse((newPath as GroupData).children);
        if (newChildren !== (newPath as GroupData).children) {
            return { ...newPath, children: newChildren };
        }
      }
      return newPath;
    });
  }
  return recurse(paths);
};


/**
 * 递归地在路径树中重新排序路径（用于图层面板的拖放）。
 * @param paths - 当前的路径数组。
 * @param draggedId - 被拖动的路径 ID。
 * @param targetId - 放置目标的路径 ID。
 * @param position - 放置位置（'above', 'below', 'inside'）。
 * @returns 返回重新排序后的路径数组。
 */
export const recursivelyReorderPaths = (paths: AnyPath[], draggedId: string, targetId: string, position: 'above' | 'below' | 'inside'): AnyPath[] => {
  let draggedPath: AnyPath | null = null;
  
  const findAndRemove = (currentPaths: AnyPath[]): AnyPath[] => {
    const newPaths = [];
    for (const p of currentPaths) {
      if (p.id === draggedId) {
        draggedPath = p;
        continue;
      }
      if (p.tool === 'group') {
        newPaths.push({ ...p, children: findAndRemove((p as GroupData).children) });
      } else {
        newPaths.push(p);
      }
    }
    return newPaths;
  };
  
  const treeWithoutDragged = findAndRemove(paths);
  if (!draggedPath) return paths;

  const findAndInsert = (currentPaths: AnyPath[]): AnyPath[] | null => {
    for (let i = 0; i < currentPaths.length; i++) {
      const p = currentPaths[i];
      if (p.id === targetId) {
        if (position === 'inside' && p.tool === 'group') {
          const newChildren = [...(p as GroupData).children, draggedPath!];
          currentPaths[i] = { ...p, children: newChildren };
        } else {
          const insertIndex = position === 'above' ? i : i + 1;
          currentPaths.splice(insertIndex, 0, draggedPath!);
        }
        return currentPaths;
      }
      if (p.tool === 'group') {
        const newChildren = findAndInsert((p as GroupData).children);
        if (newChildren) {
          currentPaths[i] = { ...p, children: newChildren };
          return currentPaths;
        }
      }
    }
    return null;
  };

  const finalTree = findAndInsert(treeWithoutDragged);
  return finalTree || paths;
};
