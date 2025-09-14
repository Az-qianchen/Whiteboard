
import React from 'react';
import { FloatingColorPicker } from '../FloatingColorPicker';
import PanelButton from '@/components/PanelButton';

interface ColorControlProps {
    label: string;
    color: string;
    setColor: (color: string) => void;
    beginCoalescing: () => void;
    endCoalescing: () => void;
    disabled?: boolean;
}

export const ColorControl: React.FC<ColorControlProps> = React.memo(({
    label,
    color,
    setColor,
    beginCoalescing,
    endCoalescing,
    disabled = false
}) => {
    const isTransparent = color === 'transparent' || (color.includes('rgba') && color.endsWith('0)')) || (color.includes('hsla') && color.endsWith('0)'));
    const checkerboardStyle = {
        backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
        backgroundSize: '10px 10px',
        backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0px',
    };

    return (
        <div className={`flex flex-col items-center w-14 transition-opacity ${disabled ? 'opacity-50' : ''}`} title={label}>
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
                        className="h-7 w-7 rounded-full ring-1 ring-inset ring-white/10 transition-transform transform hover:scale-110 disabled:cursor-not-allowed disabled:hover:scale-100"
                        style={{
                            backgroundColor: color,
                            ...(isTransparent && checkerboardStyle)
                        }}
                        aria-label={`选择${label}`}
                        title={`选择${label}`}
                    />
                )}
            </FloatingColorPicker>
        </div>
    );
});
