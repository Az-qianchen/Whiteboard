/**
 * 本文件定义了主菜单组件。
 * 它通常通过一个汉堡图标触发，提供了文件操作（如打开、保存、另存为）、
 * 导入/导出以及清空画布等功能。
 */

import React, { Fragment } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { ICONS } from '../constants';
import { ColorPicker } from './ColorPicker';
import { StatusBar } from './StatusBar';

interface MainMenuProps {
  onSave: () => Promise<void>;
  onSaveAs: () => Promise<void>;
  onOpen: () => void;
  onImport: () => void;
  onClear: () => void;
  canClear: boolean;
  onExportSvg: () => Promise<void>;
  onExportPng: () => Promise<void>;
  canExport: boolean;
  backgroundColor: string;
  setBackgroundColor: (color: string) => void;
  activeFileName: string | null;
  // StatusBar Props
  zoomLevel: number;
  onUndo: () => void;
  canUndo: boolean;
  onRedo: () => void;
  canRedo: boolean;
  elementCount: number;
  canvasWidth: number;
  canvasHeight: number;
  isStatusBarCollapsed: boolean;
  onToggleStatusBarCollapse: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = (props) => { 
  const {
    onSave, onSaveAs, onOpen, onImport, onClear, canClear,
    onExportSvg, onExportPng, canExport,
    backgroundColor, setBackgroundColor,
    activeFileName,
    zoomLevel, onUndo, canUndo, onRedo, canRedo,
    elementCount, canvasWidth, canvasHeight,
    isStatusBarCollapsed, onToggleStatusBarCollapse
  } = props;

  const menuActions = [
    { label: '打开...', handler: onOpen, icon: ICONS.OPEN, disabled: false },
    { label: '保存', handler: onSave, icon: ICONS.SAVE, disabled: false },
    { label: '另存为...', handler: onSaveAs, icon: ICONS.SAVE, disabled: false },
    { label: '导入...', handler: onImport, icon: ICONS.IMPORT, disabled: false },
    { label: '---' },
    { label: '背景', isColorPicker: true }, // Special item for color picker
    { label: '---' },
    { label: '导出为 SVG...', handler: onExportSvg, icon: ICONS.COPY_SVG, disabled: !canExport },
    { label: '导出为 PNG...', handler: onExportPng, icon: ICONS.COPY_PNG, disabled: !canExport },
    { label: '---' },
    { label: '清空画布', handler: onClear, icon: ICONS.CLEAR, isDanger: true, disabled: !canClear },
  ];

  const checkerboardStyle = {
      backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
      backgroundSize: '8px 8px',
  };

  return (
    <nav className="w-64 bg-[var(--ui-panel-bg)] border-r border-[var(--ui-panel-border)] flex flex-col h-screen p-3 z-30 flex-shrink-0">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-10 w-10 p-2 rounded-lg flex items-center justify-center bg-[var(--accent-bg)] text-[var(--accent-primary)] ring-1 ring-inset ring-[var(--accent-primary-muted)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 5-3-3-6 6 3 3"/><path d="m9 8 3 3"/><path d="M14 4 3 15.25V21h5.75L20 9.75Z"/></svg>
        </div>
        <div>
            <h1 className="text-base font-bold text-[var(--text-primary)]">画板</h1>
            <p className="text-xs text-[var(--text-secondary)] truncate" title={activeFileName ?? '未命名'}>{activeFileName ?? '未命名'}</p>
        </div>
      </div>
      
      <div className="flex flex-col gap-1 flex-grow">
        {menuActions.map((action, index) => {
          if (action.label === '---') {
            return <div key={`sep-${index}`} className="h-px my-2 bg-[var(--ui-separator)]" />;
          }

          if ((action as any).isColorPicker) {
            return (
              <Popover as="div" className="relative" key="bg-color-picker">
                <Popover.Button className="w-full flex items-center gap-3 p-2 rounded-md text-left text-sm transition-colors text-[var(--text-primary)] hover:bg-[var(--ui-hover-bg)] focus:outline-none focus-visible:ring-2 ring-[var(--accent-primary)]">
                  <div className="w-4 h-4 flex-shrink-0 text-[var(--text-secondary)]">{ICONS.BACKGROUND_COLOR}</div>
                  <span className="flex-grow">画布背景...</span>
                  <div 
                    className="w-5 h-5 rounded-sm ring-1 ring-inset ring-white/20"
                    style={{ 
                      backgroundColor: backgroundColor,
                      ...(backgroundColor === 'transparent' && checkerboardStyle)
                    }}
                  />
                </Popover.Button>
                <Transition as={Fragment} enter="transition ease-out duration-200" enterFrom="opacity-0 translate-y-1" enterTo="opacity-100 translate-y-0" leave="transition ease-in duration-150" leaveFrom="opacity-100 translate-y-0" leaveTo="opacity-0 translate-y-1">
                  <Popover.Panel 
                    className="absolute top-0 left-full ml-2 z-40"
                    onClickCapture={(e) => e.stopPropagation()}
                  >
                     <ColorPicker color={backgroundColor} onChange={setBackgroundColor} />
                  </Popover.Panel>
                </Transition>
              </Popover>
            );
          }

          return (
            <button
              key={action.label}
              onClick={() => !(action as any).disabled && (action as any).handler()}
              disabled={(action as any).disabled}
              className={`w-full flex items-center gap-3 p-2 rounded-md text-left text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                (action as any).isDanger
                  ? 'text-[var(--danger-text)] hover:bg-[var(--danger-bg)] focus:bg-[var(--danger-bg)]'
                  : 'text-[var(--text-primary)] hover:bg-[var(--ui-hover-bg)] focus:bg-[var(--ui-hover-bg)]'
              } focus:outline-none focus-visible:ring-2 ring-[var(--accent-primary)]`}
            >
              <div className="w-4 h-4 flex-shrink-0 text-[var(--text-secondary)]">{(action as any).icon}</div>
              <span className="flex-grow">{action.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto pt-2">
        <StatusBar 
            zoomLevel={zoomLevel} 
            onUndo={onUndo} 
            canUndo={canUndo} 
            onRedo={onRedo} 
            canRedo={canRedo} 
            elementCount={elementCount}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            isCollapsed={isStatusBarCollapsed}
            onToggleCollapse={onToggleStatusBarCollapse}
        />
      </div>
    </nav>
  );
};