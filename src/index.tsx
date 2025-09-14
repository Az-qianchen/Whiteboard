/**
 * 本文件是 React 应用的入口点。
 * 它负责将主组件 App 挂载到 HTML 页面中的根 DOM 元素上。
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// 屏蔽浏览器捏合缩放与 Ctrl+滚轮放大，避免页面缩放或回退
const blockGesture = (e: Event) => e.preventDefault();
['gesturestart', 'gesturechange', 'gestureend'].forEach(evt => {
  document.addEventListener(evt, blockGesture, { passive: false });
});

document.addEventListener(
  'wheel',
  e => {
    if ((e as WheelEvent).ctrlKey) {
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
