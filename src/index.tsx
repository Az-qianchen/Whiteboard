/**
 * 本文件是 React 应用的入口点。
 * 它负责将主组件 App 挂载到 HTML 页面中的根 DOM 元素上。
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// 屏蔽全局浏览器捏合手势，避免页面缩放
const blockGesture = (e: Event) => e.preventDefault();
document.addEventListener('gesturestart', blockGesture);
document.addEventListener('gesturechange', blockGesture);
document.addEventListener('gestureend', blockGesture);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

registerSW({ immediate: true });
