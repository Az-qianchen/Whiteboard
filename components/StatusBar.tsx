/**
 * 本文件定义了应用底部的状态栏组件。
 * 它显示当前的缩放级别，并提供撤销和重做操作的快捷按钮。
 */

import React from 'react';
import { ICONS } from '../constants';

interface StatusBarProps {
  zoomLevel: number;
  onUndo: () => void;
  canUndo: boolean;
  onRedo: () => void;
  canRedo: boolean;
  elementCount: number;
  canvasWidth: number;
  canvasHeight: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  zoomLevel,
  onUndo,
  canUndo,
  onRedo,
  canRedo,
  elementCount,
  canvasWidth,
  canvasHeight,
  isCollapsed,
  onToggleCollapse,
}) => {
  return (
    <div className="flex items-center bg-[var(--ui-panel-bg)] backdrop-blur-lg shadow-xl border border-[var(--ui-panel-border)] rounded-xl p-2 text-[var(--text-primary)]">
      <div className={`flex items-center gap-2 overflow-hidden transition-all duration-300 ease-in-out ${isCollapsed ? 'max-w-0 opacity-0' : 'max-w-md opacity-100 pr-2 mr-2'}`}>
        <div className="text-sm font-medium text-[var(--text-secondary)] px-2">
          {Math.round(zoomLevel * 100)}%
        </div>
        <div className="h-6 w-px bg-[var(--separator)]"></div>
        <div className="flex items-center gap-1">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="撤销 (Ctrl+Z)"
            className="p-2 h-8 w-8 rounded-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] text-[var(--text-primary)] hover:bg-[var(--ui-hover-bg)]"
          >
            {ICONS.UNDO}
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="重做 (Ctrl+Shift+Z)"
            className="p-2 h-8 w-8 rounded-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] text-[var(--text-primary)] hover:bg-[var(--ui-hover-bg)]"
          >
            {ICONS.REDO}
          </button>
        </div>
        {elementCount > 0 && (
          <>
            <div className="h-6 w-px bg-[var(--separator)]"></div>
            <div className="text-sm font-medium text-[var(--text-secondary)] px-2 whitespace-nowrap">
              元素: {elementCount} 宽度: {canvasWidth} 高度: {canvasHeight}
            </div>
          </>
        )}
      </div>
      <button
        onClick={onToggleCollapse}
        title={isCollapsed ? "展开状态栏" : "折叠状态栏"}
        className="p-2 h-8 w-8 rounded-md flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] text-[var(--text-primary)] hover:bg-[var(--ui-hover-bg)]"
      >
        <div className={`transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}>
          {ICONS.CHEVRON_LEFT}
        </div>
      </button>
    </div>
  );
};