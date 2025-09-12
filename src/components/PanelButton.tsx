import React from 'react';
import { BUTTON_SIZE } from '@/constants';

export type PanelButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

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
