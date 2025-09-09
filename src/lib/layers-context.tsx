/**
 * 本文件定义了用于图层状态管理的 React Context。
 * 通过提供一个全局的 LayersContext，避免了在组件树中深层传递 props 的问题。
 */
import React, { createContext, useContext, useMemo } from 'react';
import type { AnyPath } from '../types';
import { usePaths } from '../hooks/usePaths';

// 从 usePaths hook 的返回类型推断 Context 的状态类型
type LayersContextState = ReturnType<typeof usePaths>;

// 创建一个具有未定义初始值的 Context
const LayersContext = createContext<LayersContextState | undefined>(undefined);

interface LayersProviderProps extends LayersContextState {
  children: React.ReactNode;
}

/**
 * LayersProvider 组件
 * @description 这个组件接收 usePaths hook 返回的所有状态和函数，并通过 Context 提供给其所有子组件。
 * @param props - 包含图层状态、操作函数以及子组件。
 */
export const LayersProvider: React.FC<LayersProviderProps> = ({ children, ...pathState }) => {
  // 使用 useMemo 来记忆 context 的值，仅当 pathState 中的任何值发生变化时才重新创建。
  // 这可以防止不必要的子组件重渲染。
  const contextValue = useMemo(() => ({
    ...pathState
  }), [pathState]);

  return (
    <LayersContext.Provider value={contextValue as LayersContextState}>
      {children}
    </LayersContext.Provider>
  );
};

/**
 * useLayers 自定义 Hook
 * @description 这是一个用于消费 LayersContext 的便捷 hook。
 * 它确保了 context 在被使用时已经被定义，并返回完整的图层状态和操作函数。
 * @throws 如果在 LayersProvider 外部使用，将抛出错误。
 * @returns 返回 LayersContext 的值。
 */
export const useLayers = (): LayersContextState => {
  const context = useContext(LayersContext);
  if (context === undefined) {
    throw new Error('useLayers must be used within a LayersProvider');
  }
  return context;
};