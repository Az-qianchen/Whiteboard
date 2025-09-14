import React from 'react';

export type PanelButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'panel' | 'unstyled';
};

export const PanelButton = React.forwardRef<HTMLButtonElement, PanelButtonProps>(
  ({ className = '', variant = 'panel', ...props }, ref) => (
    <button
      ref={ref}
      className={
        variant === 'panel'
          ? `flex items-center justify-center h-[34px] w-[34px] rounded-lg bg-[var(--ui-panel-bg)] backdrop-blur-lg shadow-lg border-0 text-[var(--text-primary)] hover:bg-[var(--ui-hover-bg)] transition-colors focus:outline-none ${className}`
          : `focus:outline-none ${className}`
      }
      {...props}
    />
  )
);

PanelButton.displayName = 'PanelButton';

export default PanelButton;
