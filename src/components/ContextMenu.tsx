/**
 * 本文件定义了右键上下文菜单组件。
 * 它是一个通用组件，用于在指定位置显示一个操作列表，如剪切、复制、粘贴等。
 */

import React, { useState, useLayoutEffect, useEffect, useRef, Fragment } from 'react';
import { Transition } from '@headlessui/react';
import PanelButton from '@/components/PanelButton';

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

/**
 * 通用的右键上下文菜单组件。
 * @param {ContextMenuProps} props - 组件的 props。
 * @returns {React.ReactElement} 渲染后的上下文菜单。
 */
export const ContextMenu: React.FC<ContextMenuProps> = ({ isOpen, position, actions, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [finalPosition, setFinalPosition] = useState<{x: number, y: number} | null>(null);

  // 处理点击菜单外部时关闭菜单的逻辑
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // 使用 mousedown 捕获点击事件，以在其他操作触发前执行
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);
  
  // 当菜单打开或位置改变时，重置计算好的位置
  useEffect(() => {
    if (isOpen) {
      setFinalPosition(null);
    }
  }, [isOpen, position]);

  // 调整菜单位置，确保其在视口内完全可见
  useLayoutEffect(() => {
    // 仅当菜单打开且尚未计算最终位置时运行
    if (isOpen && menuRef.current && !finalPosition) {
      const menu = menuRef.current;
      const { offsetWidth: menuWidth, offsetHeight: menuHeight } = menu;
      const { innerWidth: viewportWidth, innerHeight: viewportHeight } = window;
      const margin = 5; // 距离边缘 5px

      // 从原始的 `position` prop 开始计算
      let newX = position.x;
      let newY = position.y;

      if (newX + menuWidth + margin > viewportWidth) {
        newX = viewportWidth - menuWidth - margin;
      }
      if (newY + menuHeight + margin > viewportHeight) {
        newY = viewportHeight - menuHeight - margin;
      }
      
      newX = Math.max(margin, newX);
      newY = Math.max(margin, newY);

      setFinalPosition({ x: newX, y: newY });
    }
  }, [isOpen, position, finalPosition]);

  // 初始渲染时使用原始位置，以避免 (0,0) 闪烁
  // 在最终位置计算出来后，再切换到最终位置
  const currentPosition = finalPosition || position;

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
        style={{
          top: currentPosition.y,
          left: currentPosition.x,
          // 仅当最终位置计算完成后才显示菜单
          visibility: finalPosition ? 'visible' : 'hidden',
        }}
        className="fixed z-50 w-48 min-w-max bg-[var(--ui-popover-bg)] backdrop-blur-lg rounded-xl shadow-lg border border-[var(--ui-panel-border)] p-1"
      >
        <div className="flex flex-col">
          {actions.map((action, index) => (
             action.label === '---' ? <div key={`sep-${index}`} className="h-px my-1 bg-[var(--ui-separator)]" /> : (
            <PanelButton
              variant="unstyled"
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
                  ? 'text-[var(--danger-text)] hover:bg-[var(--danger-bg)]'
                  : 'text-[var(--text-primary)] hover:bg-[var(--ui-element-bg-hover)]'
              }`}
            >
              <span className="flex-grow pr-4">{action.label}</span>
              {action.shortcut && <span className="text-xs text-[var(--text-secondary)]">{action.shortcut}</span>}
            </PanelButton>
            )
          ))}
        </div>
      </div>
    </Transition>
  );
};
