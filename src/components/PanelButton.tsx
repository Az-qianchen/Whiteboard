/**
 * 本文件定义了用于面板中的通用按钮组件。
 */
import React from 'react';
import { BUTTON_SIZE } from '@/constants';

export type PanelButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

/**
 * 面板通用按钮组件。
 */
export const PanelButton = React.forwardRef<HTMLButtonElement, PanelButtonProps>(
  ({ className = '', ...props }, ref) => (
    <button
      ref={ref}
      className={`flex items-center justify-center ${BUTTON_SIZE} rounded-lg bg-[var(--ui-panel-bg)] backdrop-blur-lg shadow-lg border border-[var(--ui-panel-border)] text-[var(--text-primary)] hover:bg-[var(--ui-hover-bg)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] ${className}`}
      {...props}
    />
  )
);

PanelButton.displayName = 'PanelButton';

export default PanelButton;
