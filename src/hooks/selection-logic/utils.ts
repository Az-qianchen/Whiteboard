/**
 * 本文件包含 useSelection hook 中使用的通用工具函数。
 */
import type { AnyPath, GroupData } from '@/types';

/**
 * 递归更新路径树中的路径。
 * @param paths - 要遍历的路径数组。
 * @param updater - 一个函数，接收一个路径并返回更新后的路径或 null（无变化）。
 * @returns 返回一个新的路径数组，如果没有任何变化，则返回原始数组。
 */
export const recursivelyUpdatePaths = (paths: AnyPath[], updater: (path: AnyPath) => AnyPath | null): AnyPath[] => {
    let hasChanged = false;
    const newPaths = paths.map(p => {
        const updatedPath = updater(p);
        if (updatedPath) {
            if (updatedPath !== p) hasChanged = true;
            return updatedPath;
        }
        if (p.tool === 'group') {
            const newChildren = recursivelyUpdatePaths((p as GroupData).children, updater);
            if (newChildren !== (p as GroupData).children) {
                hasChanged = true;
                return { ...p, children: newChildren };
            }
        }
        return p;
    });
    return hasChanged ? newPaths : paths;
};
