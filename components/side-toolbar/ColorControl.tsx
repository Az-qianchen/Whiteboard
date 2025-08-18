import React, { Fragment } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { ColorPicker } from '../ColorPicker';

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
        <div className={`flex flex-col items-center gap-1 w-14 transition-opacity ${disabled ? 'opacity-50' : ''}`} title={label}>
            <Popover className="relative">
                <Popover.Button
                    disabled={disabled}
                    className="h-8 w-8 rounded-full ring-1 ring-inset ring-white/10 transition-transform transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-[var(--ui-panel-bg)] disabled:cursor-not-allowed disabled:hover:scale-100"
                    style={{ 
                        backgroundColor: color, 
                        ...(isTransparent && checkerboardStyle) 
                    }}
                    aria-label={`选择${label}`}
                    title={`选择${label}`}
                />
                <Transition as={Fragment} enter="transition ease-out duration-200" enterFrom="opacity-0 translate-y-1" enterTo="opacity-100 translate-y-0" leave="transition ease-in duration-150" leaveFrom="opacity-100 translate-y-0" leaveTo="opacity-0 translate-y-1">
                    <Popover.Panel className="absolute bottom-0 mb-0 -translate-x-full left-[-1rem] z-20">
                        <ColorPicker color={color} onChange={setColor} onInteractionStart={beginCoalescing} onInteractionEnd={endCoalescing} />
                    </Popover.Panel>
                </Transition>
            </Popover>
            <span className="text-xs font-medium text-[var(--text-secondary)] sidebar-label">{label}</span>
        </div>
    );
});