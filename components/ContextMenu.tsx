
import React, { useEffect, useRef, Fragment } from 'react';
import { Transition } from '@headlessui/react';

interface ContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  actions: {
    label: string;
    handler?: () => void;
    disabled?: boolean;
    isDanger?: boolean;
    icon?: React.ReactNode;
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
        className="fixed z-50 w-48 min-w-max bg-white dark:bg-[#4A5568] rounded-lg shadow-2xl border border-slate-200 dark:border-slate-600 p-1"
      >
        <div className="flex flex-col">
          {actions.map((action, index) => (
             action.label === '---' ? <div key={`sep-${index}`} className="h-px my-1 bg-slate-200 dark:bg-slate-600" /> : (
            <button
              key={action.label}
              onClick={() => {
                action.handler?.();
                onClose();
              }}
              disabled={action.disabled}
              className={`w-full flex items-center gap-3 p-2 rounded-md text-left text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                action.isDanger
                  ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50'
                  : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600'
              }`}
            >
              {action.icon && <div className="w-4 h-4 flex-shrink-0 text-slate-500 dark:text-slate-400">{action.icon}</div>}
              <span className="flex-grow">{action.label}</span>
            </button>
            )
          ))}
        </div>
      </div>
    </Transition>
  );
};
