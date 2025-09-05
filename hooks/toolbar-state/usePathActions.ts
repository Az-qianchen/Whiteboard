/**
 * 本文件定义了一个自定义 Hook，用于管理与路径本身相关的操作，例如路径简化。
 */
import { useState, useMemo } from 'react';
import type { AnyPath, GroupData, VectorPathData } from '../../types';
import { simplifyPath } from '../../lib/drawing';

interface PathActionsProps {
  paths: AnyPath[];
  selectedPathIds: string[];
  setPaths: React.Dispatch<React.SetStateAction<AnyPath[]>>;
  beginCoalescing: () => void;
  endCoalescing: () => void;
}

/**
 * 管理路径相关操作（如简化）的 Hook。
 * @param props - 包含路径状态和回调函数的对象。
 * @returns 返回路径操作的状态和函数。
 */
export const usePathActions = ({
  paths,
  selectedPathIds,
  setPaths,
  beginCoalescing,
  endCoalescing,
}: PathActionsProps) => {
  const [originalPathsForSimplify, setOriginalPathsForSimplify] = useState<AnyPath[] | null>(null);
  
  const selectedPaths = useMemo(() => {
    if (selectedPathIds.length === 0) return [];
    return paths.filter(p => selectedPathIds.includes(p.id));
  }, [paths, selectedPathIds]);

  /**
   * 开始路径简化操作，并存储原始路径状态。
   */
  const beginSimplify = () => {
    if (selectedPathIds.length > 0) {
      const selected = paths.filter(p => selectedPathIds.includes(p.id));
      setOriginalPathsForSimplify(selected);
      beginCoalescing();
    }
  };

  /**
   * 根据给定的容差值简化路径。
   * @param tolerance - 简化的容差值。
   */
  const setSimplify = (tolerance: number) => {
    if (!originalPathsForSimplify) return;

    const simplifyRecursively = (path: AnyPath): AnyPath => {
      if (path.tool === 'group') {
        return { ...path, children: (path as GroupData).children.map(simplifyRecursively) };
      }
      if ((path.tool === 'pen' || path.tool === 'line') && 'anchors' in path) {
        return simplifyPath(path as VectorPathData, tolerance);
      }
      return path;
    };

    const simplifiedPaths = originalPathsForSimplify.map(simplifyRecursively);
    const simplifiedMap = new Map(simplifiedPaths.map(p => [p.id, p]));
    setPaths(prev => prev.map(p => simplifiedMap.get(p.id) || p));
  };
  
  /**
   * 结束路径简化操作。
   */
  const endSimplify = () => {
    setOriginalPathsForSimplify(null);
    endCoalescing();
  };

  const isSimplifiable = useMemo(() => {
    if (selectedPaths.length === 0) return false;
    const checkPath = (p: AnyPath): boolean => {
      if (p.tool === 'pen' || p.tool === 'line' || p.tool === 'brush') return true;
      if (p.tool === 'group') return (p as GroupData).children.some(checkPath);
      return false;
    };
    return selectedPaths.some(checkPath);
  }, [selectedPaths]);

  return {
    beginSimplify,
    setSimplify,
    endSimplify,
    isSimplifiable,
  };
};
