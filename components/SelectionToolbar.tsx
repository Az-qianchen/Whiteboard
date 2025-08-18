/**
 * 本文件定义了当有图形被选中时出现的选择工具栏。
 * 它允许用户在“移动/变换”模式和“编辑锚点”模式之间切换。
 */

import React, { Fragment, useState } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { ICONS } from '../constants';
import type { SelectionMode } from '../types';
import { Slider } from './side-toolbar';

interface SelectionToolbarProps {
  selectionMode: SelectionMode;
  setSelectionMode: (mode: SelectionMode) => void;
  isSimplifiable: boolean;
  beginSimplify: () => void;
  setSimplify: (tolerance: number) => void;
  endSimplify: () => void;
}

export const SelectionToolbar: React.FC<SelectionToolbarProps> = ({ 
  selectionMode, 
  setSelectionMode,
  isSimplifiable,
  beginSimplify,
  setSimplify,
  endSimplify,
}) => {
  const modes = [
    { name: 'move', title: '移动/变换 (M)', icon: ICONS.MOVE },
    { name: 'edit', title: '编辑锚点 (V)', icon: ICONS.EDIT },
  ];
  
  const [simplifyValue, setSimplifyValue] = useState(0);

  const handleSimplifyStart = () => {
    beginSimplify();
  };
  const handleSimplifyChange = (newValue: number) => {
    setSimplifyValue(newValue);
    setSimplify(newValue);
  };
  const handleSimplifyEnd = () => {
    endSimplify();
    setSimplifyValue(0);
  };

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

      {isSimplifiable && (
        <>
          <div className="h-6 w-px bg-[var(--separator)]"></div>
          <Popover className="relative">
            {({ open }) => (
              <>
                <Popover.Button
                  title="简化路径"
                  className={`p-2 rounded-lg flex items-center justify-center w-10 h-10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-opacity-75 ${
                    open
                      ? 'bg-[var(--accent-secondary)] text-[var(--accent-primary)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--ui-hover-bg)]'
                  }`}
                >
                  {ICONS.SIMPLIFY_PATH}
                </Popover.Button>
                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Popover.Panel className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-60 bg-[var(--ui-popover-bg)] backdrop-blur-lg rounded-xl shadow-lg border border-[var(--ui-panel-border)] p-4">
                    <Slider 
                      label="简化"
                      value={simplifyValue}
                      setValue={handleSimplifyChange}
                      min={0} max={50} step={1}
                      onInteractionStart={handleSimplifyStart}
                      onInteractionEnd={handleSimplifyEnd}
                    />
                  </Popover.Panel>
                </Transition>
              </>
            )}
          </Popover>
        </>
      )}
    </div>
  );
};