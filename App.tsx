/**
 * 本文件是应用的主组件 (App)。
 * 它负责整合所有 UI 组件，如工具栏、白板、菜单等，
 * 并通过组合多个自定义 Hooks 来管理整个应用的状态。
 * 经过重构，它现在使用 AppProvider 来提供全局状态。
 */

import React from 'react';
import { AppProvider } from './context/AppContext';
import { MainLayout } from './components/MainLayout';

/**
 * 应用的根组件。
 * @description 该组件使用 AppProvider 将全局状态提供给其子组件 MainLayout。
 */
const App: React.FC = () => {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
};

export default App;