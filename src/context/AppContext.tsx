/**
 * 简化后的应用全局状态 React Context。
 * 原有的 useAppStore 已被拆分为多个独立的 Zustand store，
 * 这里提供一个占位实现以保持对 useAppContext 的兼容。
 */
import React, { createContext, useContext } from 'react';

type AppContextType = Record<string, unknown>;

const AppContext = createContext<AppContextType>({});

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AppContext.Provider value={{}}>
    {children}
  </AppContext.Provider>
);

export const useAppContext = (): AppContextType => useContext(AppContext);
