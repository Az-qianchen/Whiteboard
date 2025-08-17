

import React from 'react';
import { ICONS } from '../constants';

interface StatusBarProps {
  zoomLevel: number;
  onUndo: () => void;
  canUndo: boolean;
  onRedo: () => void;
  canRedo: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  zoomLevel,
  onUndo,
  canUndo,
  onRedo,
  canRedo,
}) => {
  return (
    <div className="flex items-center gap-2 bg-[var(--ui-panel-bg)] backdrop-blur-lg shadow-xl border border-[var(--ui-panel-border)] rounded-xl p-2 text-[var(--text-primary)]">
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
    </div>
  );
};