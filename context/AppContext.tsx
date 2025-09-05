/**
 * 本文件定义了应用全局状态的 React Context。
 * 它提供了一个 AppProvider 组件和一个 useAppContext Hook，
 * 用于在整个应用中分发和访问由 useAppStore 管理的状态。
 */
import React, { createContext, useContext } from 'react';
import { useAppStore } from '../hooks/useAppStore';

// useAppStore 的返回类型是我们上下文的值类型
type AppContextType = ReturnType<typeof useAppStore>;

const AppContext = createContext<AppContextType | null>(null);

/**
 * AppProvider 组件
 * @description 为其子组件提供 useAppStore 的值。
 */
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const store = useAppStore();
  return (
    <AppContext.Provider value={store}>
      {children}
    </AppContext.Provider>
  );
};

/**
 * useAppContext 自定义 Hook
 * @description 一个便捷的 Hook，用于访问 AppContext。
 */
export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
