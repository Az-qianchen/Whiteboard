import React from 'react';
import { useTranslation } from 'react-i18next';
import { FloatingColorPicker } from '../FloatingColorPicker';
import PanelButton from '@/components/PanelButton';
import type { GradientFill } from '@/types';
import { gradientToCss } from '@/lib/gradient';

interface ColorControlProps {
    label: string;
    color: string;
    setColor: (color: string) => void;
    beginCoalescing: () => void;
    endCoalescing: () => void;
    disabled?: boolean;
    className?: string;
    gradient?: GradientFill | null;
}

export const ColorControl: React.FC<ColorControlProps> = React.memo(({
    label,
    color,
    setColor,
    beginCoalescing,
    endCoalescing,
    disabled = false,
    className = '',
    gradient = null
}) => {
    const { t } = useTranslation();
    const colorIsTransparent = color === 'transparent' || (color.includes('rgba') && color.endsWith('0)')) || (color.includes('hsla') && color.endsWith('0)'));
    const checkerboardStyle = {
        backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
        backgroundSize: '10px 10px',
        backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0px',
    };

    const gradientStyle = gradient
        ? {
            backgroundImage: `${gradientToCss(gradient)}, ${checkerboardStyle.backgroundImage}`,
            backgroundSize: `cover, ${checkerboardStyle.backgroundSize}`,
            backgroundPosition: `0 0, ${checkerboardStyle.backgroundPosition}`,
            backgroundColor: 'transparent',
        }
        : {};

    const fillStyle = gradient
        ? gradientStyle
        : {
            backgroundColor: color,
            ...(colorIsTransparent ? checkerboardStyle : {}),
        };

    const selectLabel = t('sideToolbar.colorControl.select', { label });

    return (
        <div className={`flex flex-col items-center w-14 transition-opacity ${disabled ? 'opacity-50' : ''} ${className}`} title={label}>
            <FloatingColorPicker
                color={color}
                onChange={setColor}
                onInteractionStart={beginCoalescing}
                onInteractionEnd={endCoalescing}
                placement="left"
            >
                {({ ref, onClick }) => (
                    <PanelButton
                        variant="unstyled"
                        ref={ref as any}
                        onClick={onClick}
                        disabled={disabled}
                        className="h-7 w-7 rounded-full transition-transform transform hover:scale-110 disabled:cursor-not-allowed disabled:hover:scale-100"
                        style={fillStyle}
                        aria-label={selectLabel}
                        title={selectLabel}
                    />
                )}
            </FloatingColorPicker>
        </div>
    );
});
