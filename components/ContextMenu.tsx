/**
 * 本文件定义了右键上下文菜单组件。
 * 它是一个通用组件，用于在指定位置显示一个操作列表，如剪切、复制、粘贴等。
 */

import React, { useEffect, useRef, Fragment } from 'react';
import { Transition } from '@headlessui/react';

interface ContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  actions: {
    label: string;
    handler?: () => void | Promise<void>;
    disabled?: boolean;
    isDanger?: boolean;
    shortcut?: string;
  }[];
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ isOpen, position, actions, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // Use mousedown to catch clicks before they trigger other actions
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  return (
    <Transition
      show={isOpen}
      as={Fragment}
      enter="transition ease-out duration-100"
      enterFrom="transform opacity-0 scale-95"
      enterTo="transform opacity-100 scale-100"
      leave="transition ease-in duration-75"
      leaveFrom="transform opacity-100 scale-100"
      leaveTo="transform opacity-0 scale-95"
    >
      <div
        ref={menuRef}
        style={{ top: position.y, left: position.x }}
        className="fixed z-50 w-48 min-w-max bg-[var(--ui-popover-bg)] backdrop-blur-lg rounded-xl shadow-lg border border-[var(--ui-panel-border)] p-1"
      >
        <div className="flex flex-col">
          {actions.map((action, index) => (
             action.label === '---' ? <div key={`sep-${index}`} className="h-px my-1 bg-[var(--separator)]" /> : (
            <button
              key={action.label}
              onClick={async () => {
                if (action.handler) {
                  await action.handler();
                }
                onClose();
              }}
              disabled={action.disabled}
              className={`w-full flex items-center justify-between p-2 rounded-md text-left text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                action.isDanger
                  ? 'text-[var(--danger)] hover:bg-[var(--danger-bg)]'
                  : 'text-[var(--text-primary)] hover:bg-[var(--ui-hover-bg)]'
              }`}
            >
              <span className="flex-grow pr-4">{action.label}</span>
              {action.shortcut && <span className="text-xs text-[var(--text-secondary)]">{action.shortcut}</span>}
            </button>
            )
          ))}
        </div>
      </div>
    </Transition>
  );
};