import React, { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { ICONS } from '../constants';

interface MainMenuProps {
  onSave: () => Promise<void>;
  onSaveAs: () => Promise<void>;
  onOpen: () => void;
  onImport: () => void;
  onClear: () => void;
  canClear: boolean;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onSave, onSaveAs, onOpen, onImport, onClear, canClear }) => {
  const menuActions = [
    { label: '打开...', handler: onOpen, icon: ICONS.OPEN, isDanger: false, disabled: false },
    { label: '保存', handler: onSave, icon: ICONS.SAVE, isDanger: false, disabled: false },
    { label: '另存为...', handler: onSaveAs, icon: ICONS.SAVE, isDanger: false, disabled: false },
    { label: '导入...', handler: onImport, icon: ICONS.IMPORT, isDanger: false, disabled: false },
    { label: '---' },
    { label: '清空画布', handler: onClear, icon: ICONS.CLEAR, isDanger: true, disabled: !canClear },
  ];

  return (
    <Menu as="div" className="relative">
      <Menu.Button
        className="h-10 w-10 p-2 rounded-lg flex items-center justify-center transition-colors text-[var(--text-primary)] bg-[var(--ui-panel-bg)] backdrop-blur-lg shadow-lg border border-[var(--ui-panel-border)] hover:bg-[var(--ui-hover-bg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
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
            {menuActions.map((action, index) =>
              action.label === '---' ? (
                <div key={`sep-${index}`} className="h-px my-1 bg-[var(--separator)]" />
              ) : (
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
              )
            )}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
};
