/**
 * 本文件定义了一个自定义 Hook (useLiveDrawingState)，
 * 它只负责管理正在绘制过程中的临时路径状态。
 */
import { useState } from 'react';
import type { LivePath, VectorPathData } from '../types';

/**
 * 自定义 Hook，用于管理实时绘图状态。
 * @returns 返回一个包含当前画笔、钢笔和线条路径及其设置函数的对象。
 */
export const useLiveDrawingState = () => {
  const [currentBrushPath, setCurrentBrushPath] = useState<LivePath | null>(null);
  const [currentPenPath, setCurrentPenPath] = useState<VectorPathData | null>(null);
  const [currentLinePath, setCurrentLinePath] = useState<VectorPathData | null>(null);

  return {
    currentBrushPath,
    setCurrentBrushPath,
    currentPenPath,
    setCurrentPenPath,
    currentLinePath,
    setCurrentLinePath,
  };
};
