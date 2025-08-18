/**
 * 本文件定义了主菜单组件。
 * 它通常通过一个汉堡图标触发，提供了文件操作（如打开、保存、另存为）、
 * 导入/导出以及清空画布等功能。
 */

import React, { Fragment } from 'react';
import { Menu, Transition, Popover } from '@headlessui/react';
import { ICONS } from '../constants';
import { ColorPicker } from './ColorPicker';

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
}

export const MainMenu: React.FC<MainMenuProps> = ({ 
  onSave, onSaveAs, onOpen, onImport, onClear, canClear,
  onExportSvg, onExportPng, canExport,
  backgroundColor, setBackgroundColor,
}) => {
  const menuActions = [
    { label: '打开...', handler: onOpen, icon: ICONS.OPEN, isDanger: false, disabled: false },
    { label: '保存', handler: onSave, icon: ICONS.SAVE, isDanger: false, disabled: false },
    { label: '另存为...', handler: onSaveAs, icon: ICONS.SAVE, isDanger: false, disabled: false },
    { label: '导入...', handler: onImport, icon: ICONS.IMPORT, isDanger: false, disabled: false },
    { label: '---' },
    // Background color picker will be inserted here
    { label: '---' },
    { label: '导出为 SVG...', handler: onExportSvg, icon: ICONS.COPY_SVG, isDanger: false, disabled: !canExport },
    { label: '导出为 PNG...', handler: onExportPng, icon: ICONS.COPY_PNG, isDanger: false, disabled: !canExport },
    { label: '---' },
    { label: '清空画布', handler: onClear, icon: ICONS.CLEAR, isDanger: true, disabled: !canClear },
  ];
  
  const checkerboardStyle = {
      backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
      backgroundSize: '8px 8px',
  };

  const backgroundColorItem = (
    <Popover as="div" className="relative">
      <Popover.Button className="w-full flex items-center gap-3 p-2 rounded-md text-left text-sm transition-colors text-[var(--text-primary)] hover:bg-[var(--ui-hover-bg)] focus:outline-none">
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
        <Popover.Panel className="absolute top-0 left-full ml-2 z-30">
           <ColorPicker color={backgroundColor} onChange={setBackgroundColor} />
        </Popover.Panel>
      </Transition>
    </Popover>
  );

  return (
    <Menu as="div" className="relative">
      <Menu.Button
        className="h-12 w-12 p-2 rounded-lg flex items-center justify-center transition-colors text-[var(--text-primary)] bg-[var(--ui-panel-bg)] backdrop-blur-lg shadow-lg border border-[var(--ui-panel-border)] hover:bg-[var(--ui-hover-bg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
        title="菜单"
      >
        {ICONS.MENU}
      </Menu.Button>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-200"
        enterFrom="opacity-0 translate-y-1"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in duration-150"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 translate-y-1"
      >
        <Menu.Items className="absolute top-full mt-2 left-0 w-48 bg-[var(--ui-popover-bg)] backdrop-blur-lg rounded-xl shadow-lg border border-[var(--ui-panel-border)] z-20 p-1 focus:outline-none">
          <div className="flex flex-col">
            {menuActions.map((action, index) => {
              if (index === 5) {
                // This is a special case to insert a non-closing popover item.
                // We wrap it in a div and stop propagation to prevent the menu from closing.
                return <div key="bg-color-picker" onClick={e => e.stopPropagation()}>{backgroundColorItem}</div>;
              }
              if (action.label === '---') {
                return <div key={`sep-${index}`} className="h-px my-1 bg-[var(--separator)]" />;
              }
              return (
                <Menu.Item key={action.label} disabled={action.disabled}>
                  {({ active }) => (
                    <button
                      onClick={action.handler}
                      className={`w-full flex items-center gap-3 p-2 rounded-md text-left text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        action.isDanger
                          ? `text-[var(--danger)] ${active ? 'bg-[var(--danger-bg)]' : ''}`
                          : `text-[var(--text-primary)] ${active ? 'bg-[var(--ui-hover-bg)]' : ''}`
                      }`}
                    >
                      <div className="w-4 h-4 flex-shrink-0 text-[var(--text-secondary)]">{action.icon}</div>
                      <span className="flex-grow">{action.label}</span>
                    </button>
                  )}
                </Menu.Item>
              );
            })}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
};