/**
 * 本文件是 React 应用的入口点。
 * 它负责将主组件 App 挂载到 HTML 页面中的根 DOM 元素上。
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import '@/lib/i18n';
import { registerSW } from 'virtual:pwa-register';

// 阻止浏览器默认手势（捏合缩放、双指滑动回退等）
const preventDefault = (e: Event) => e.preventDefault();
['gesturestart', 'gesturechange', 'gestureend'].forEach(evt => {
  window.addEventListener(evt, preventDefault, { passive: false });
});

// 禁用 Ctrl+滚轮及页面层级的滚轮默认行为，避免触发页面缩放或回退
window.addEventListener(
  'wheel',
  e => {
    if ((e as WheelEvent).ctrlKey || e.target === document.body) {
      e.preventDefault();
    }
  },
  { passive: false }
);

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
