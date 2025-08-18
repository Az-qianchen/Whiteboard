import React, { Fragment } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { ICONS } from '../../constants';
import { FILL_STYLES, FILL_STYLE_ICONS } from './constants';

interface FillStyleControlProps {
    fillStyle: string;
    setFillStyle: (style: string) => void;
}

export const FillStyleControl: React.FC<FillStyleControlProps> = React.memo(({ fillStyle, setFillStyle }) => (
    <div className="flex flex-col items-center gap-1 w-14 transition-opacity" title={`填充样式: ${FILL_STYLES.find(s => s.name === fillStyle)?.title}`}>
        <Popover className="relative">
            <Popover.Button className="h-9 w-9 p-1.5 rounded-lg flex items-center justify-center transition-colors text-[var(--text-secondary)] hover:bg-[var(--ui-hover-bg)] ring-1 ring-inset ring-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] disabled:cursor-not-allowed" title={`填充样式: ${FILL_STYLES.find(s => s.name === fillStyle)?.title}`} aria-label="选择填充样式">
                {FILL_STYLE_ICONS[fillStyle as keyof typeof FILL_STYLE_ICONS]}
            </Popover.Button>
            <Transition as={Fragment} enter="transition ease-out duration-200" enterFrom="opacity-0 translate-y-1" enterTo="opacity-100 translate-y-0" leave="transition ease-in duration-150" leaveFrom="opacity-100 translate-y-0" leaveTo="opacity-0 translate-y-1">
                <Popover.Panel className="absolute bottom-0 mb-0 right-full mr-2 w-48 bg-[var(--ui-popover-bg)] backdrop-blur-lg rounded-xl shadow-lg border border-[var(--ui-panel-border)] z-20 p-2">
                    {({ close }) => (
                        <div className="grid grid-cols-1 gap-1">
                            {FILL_STYLES.map(({ name, title, icon }) => (
                                <button key={name} onClick={() => { setFillStyle(name); close(); }} className={`w-full flex items-center gap-3 p-2 rounded-md text-left text-sm transition-colors ${fillStyle === name ? 'bg-[var(--accent-secondary)] text-[var(--accent-primary)]' : 'hover:bg-[var(--ui-hover-bg)] text-[var(--text-primary)]'}`}>
                                    <div className="w-5 h-5 flex-shrink-0 text-current">{icon}</div>
                                    <span className="flex-grow">{title}</span>
                                    {fillStyle === name && <div className="w-5 h-5 text-[var(--accent-primary)]">{ICONS.CHECK}</div>}
                                </button>
                            ))}
                        </div>
                    )}
                </Popover.Panel>
            </Transition>
        </Popover>
        <span className="text-xs font-medium text-[var(--text-secondary)] sidebar-label">填充样式</span>
    </div>
));