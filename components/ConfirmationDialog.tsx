/**
 * 本文件定义了一个可重用的确认对话框组件。
 * 它以模态框的形式显示，用于在执行潜在的破坏性操作前征求用户确认。
 */
import React, { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmButtonText = "确认",
  cancelButtonText = "取消"
}) => {
  // 添加本地状态以在关闭过渡期间保持内容
  const [dialogContent, setDialogContent] = useState({ title, message });

  useEffect(() => {
    // 仅在对话框打开时更新内容
    // 这可以防止在 isOpen 变为 false 时内容被清除
    if (isOpen) {
      setDialogContent({ title, message });
    }
  }, [isOpen, title, message]);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-[var(--ui-popover-bg)] p-6 text-center align-middle shadow-xl transition-all border border-[var(--ui-panel-border)]">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-bold leading-6 text-[var(--text-primary)]"
                >
                  {dialogContent.title}
                </Dialog.Title>
                <div className="mt-4">
                  <p className="text-base text-[var(--text-secondary)]">
                    {dialogContent.message}
                  </p>
                </div>

                <div className="mt-6 flex justify-center gap-3">
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-lg border border-transparent bg-[var(--ui-element-bg)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--ui-element-bg-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ui-popover-bg)] transition-colors"
                    onClick={onClose}
                  >
                    {cancelButtonText}
                  </button>
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-lg border border-transparent bg-[var(--danger-bg)] px-4 py-2 text-sm font-medium text-[var(--danger-text)] hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ui-popover-bg)] transition-colors"
                    onClick={onConfirm}
                  >
                    {confirmButtonText}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};