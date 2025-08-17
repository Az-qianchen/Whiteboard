
import React from 'react';
import { ICONS } from '../constants';
import type { SelectionMode } from '../types';

interface SelectionToolbarProps {
  selectionMode: SelectionMode;
  setSelectionMode: (mode: SelectionMode) => void;
}

export const SelectionToolbar: React.FC<SelectionToolbarProps> = ({ selectionMode, setSelectionMode }) => {
  const modes = [
    { name: 'move', title: '移动/变换 (M)', icon: ICONS.MOVE },
    { name: 'edit', title: '编辑锚点 (V)', icon: ICONS.EDIT },
  ];

  return (
    <div className="flex items-center gap-2 bg-[var(--ui-panel-bg)] backdrop-blur-lg shadow-xl border border-[var(--ui-panel-border)] rounded-xl p-2 text-[var(--text-primary)]">
      {modes.map((mode) => (
        <button
          key={mode.name}
          type="button"
          title={mode.title}
          onClick={() => setSelectionMode(mode.name as SelectionMode)}
          className={`p-2 rounded-lg flex items-center justify-center w-10 h-10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-opacity-75 ${
            selectionMode === mode.name
              ? 'bg-[var(--accent-secondary)] text-[var(--accent-primary)]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--ui-hover-bg)]'
          }`}
        >
          {mode.icon}
        </button>
      ))}
    </div>
  );
};
