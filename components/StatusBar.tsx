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
    <div className="w-full bg-[var(--ui-element-bg)] rounded-lg p-2 text-[var(--text-primary)] text-sm">
      <div className="flex justify-between items-center">
        <span className="font-medium text-[var(--text-secondary)]">缩放: {Math.round(zoomLevel * 100)}%</span>
        <button
          onClick={onToggleCollapse}
          title={isCollapsed ? "展开状态栏" : "折叠状态栏"}
          className="p-1 h-6 w-6 rounded-md flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] text-[var(--text-primary)] hover:bg-[var(--ui-element-bg-hover)]"
        >
          <div className={`transition-transform duration-300 ${isCollapsed ? '-rotate-90' : 'rotate-90'}`}>
            {ICONS.CHEVRON_LEFT}
          </div>
        </button>
      </div>
      <div className={`grid transition-all duration-300 ease-in-out ${isCollapsed ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'}`}>
        <div className="overflow-hidden">
            <div className="pt-2">
              <div className="h-px mb-2 bg-[var(--ui-separator)]" />
              <div className="flex items-center justify-around">
                  <button
                      onClick={onUndo}
                      disabled={!canUndo}
                      title="撤销 (Ctrl+Z)"
                      className="p-2 h-8 w-8 rounded-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] text-[var(--text-primary)] hover:bg-[var(--ui-element-bg-hover)]"
                  >
                      {ICONS.UNDO}
                  </button>
                  <button
                      onClick={onRedo}
                      disabled={!canRedo}
                      title="重做 (Ctrl+Shift+Z)"
                      className="p-2 h-8 w-8 rounded-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] text-[var(--text-primary)] hover:bg-[var(--ui-element-bg-hover)]"
                  >
                      {ICONS.REDO}
                  </button>
              </div>
              {elementCount > 0 && (
              <>
                  <div className="h-px my-2 bg-[var(--ui-separator)]" />
                  <div className="space-y-1 text-xs text-[var(--text-secondary)] px-1">
                    <div className="flex justify-between">
                      <span>元素:</span>
                      <span className="font-mono">{elementCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>宽度:</span>
                      <span className="font-mono">{canvasWidth}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>高度:</span>
                      <span className="font-mono">{canvasHeight}</span>
                    </div>
                  </div>
              </>
              )}
            </div>
        </div>
      </div>
    </div>
  );
};
