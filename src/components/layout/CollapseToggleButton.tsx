import React from 'react';
import PanelButton from '@/components/PanelButton';
import { CONTROL_BUTTON_CLASS } from '@/constants';

export type CollapseToggleButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'title' | 'children'> & {
    isCollapsed: boolean;
    onToggle: () => void;
    collapsedLabel: string;
    expandedLabel: string;
    icon: React.ReactNode;
    rotateWhen?: 'collapsed' | 'expanded';
    className?: string;
};

export function CollapseToggleButton({
    isCollapsed,
    onToggle,
    collapsedLabel,
    expandedLabel,
    icon,
    rotateWhen = 'collapsed',
    className,
    type,
    ...buttonProps
}: CollapseToggleButtonProps) {
    const combinedClassName = className ? `${CONTROL_BUTTON_CLASS} ${className}` : CONTROL_BUTTON_CLASS;
    const label = isCollapsed ? collapsedLabel : expandedLabel;
    const shouldRotate = rotateWhen === 'collapsed' ? isCollapsed : !isCollapsed;

    return (
        <PanelButton
            type={type ?? 'button'}
            onClick={onToggle}
            title={label}
            aria-label={label}
            aria-pressed={!isCollapsed}
            variant="unstyled"
            className={combinedClassName}
            {...buttonProps}
        >
            <span className={`transition-transform duration-300 ${shouldRotate ? 'rotate-180' : ''}`}>
                {icon}
            </span>
        </PanelButton>
    );
}

export default CollapseToggleButton;
