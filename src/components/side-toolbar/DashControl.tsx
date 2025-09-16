import React, { Fragment } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { ICONS } from '@/constants';
import type { EndpointStyle } from '@/types';
import PanelButton from '@/components/PanelButton';
import { useDashGapInput } from '@/hooks/side-toolbar/useDashGapInput';
import { SwitchControl } from './shared';
import { PANEL_CLASSES } from '../panelStyles';

interface DashControlProps {
    strokeWidth: number;
    strokeLineDash: [number, number] | undefined;
    setStrokeLineDash: (dash: [number, number] | undefined) => void;
    setStrokeLineCapStart: (cap: EndpointStyle) => void;
    setStrokeLineCapEnd: (cap: EndpointStyle) => void;
    beginCoalescing: () => void;
    endCoalescing: () => void;
}

export const DashControl: React.FC<DashControlProps> = React.memo((props) => {
    const { 
        strokeWidth,
    } = props;

    const dashGap = useDashGapInput(props);

    return (
        <div className={`flex flex-col items-center w-14 transition-opacity ${strokeWidth === 0 ? 'opacity-50' : ''}`} title="虚线样式">
            <Popover className="relative">
                <Popover.Button
                    as={PanelButton}
                    variant="unstyled"
                    disabled={strokeWidth === 0}
                    className="p-2 h-9 w-9 rounded-lg flex items-center justify-center transition-colors text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)] disabled:cursor-not-allowed"
                    title="虚线样式"
                >
                    {ICONS.DASH_SETTINGS}
                </Popover.Button>
                <Transition as={Fragment} enter="transition ease-out duration-200" enterFrom="opacity-0 translate-y-1" enterTo="opacity-100 translate-y-0" leave="transition ease-in duration-150" leaveFrom="opacity-100 translate-y-0" leaveTo="opacity-0 translate-y-1">
                    <Popover.Panel className="absolute bottom-0 mb-0 right-full mr-2 w-48 bg-[var(--ui-popover-bg)] backdrop-blur-lg rounded-xl shadow-lg border border-[var(--ui-panel-border)] z-20 p-4">
                        <div className={PANEL_CLASSES.section}>
                            <SwitchControl label="虚线" enabled={dashGap.isDashed} setEnabled={dashGap.handleToggleDashed} />
                            <div className={`space-y-3 transition-opacity ${!dashGap.isDashed ? 'opacity-50 pointer-events-none' : ''}`}>
                                <div className="grid grid-cols-2 items-center gap-2">
                                    <label htmlFor="dash-length-input" className={`${PANEL_CLASSES.label} text-[var(--text-primary)]`}>虚线长度</label>
                                    <div className={`${PANEL_CLASSES.inputWrapper} cursor-ns-resize`} onWheel={dashGap.handleDashWheel} title="使用滚轮调节">
                                        <input
                                            id="dash-length-input"
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            value={dashGap.localDash}
                                            onChange={(e) => dashGap.setLocalDash(e.target.value.replace(/[^0-9]/g, ''))}
                                            onBlur={dashGap.handleCommit}
                                            onKeyDown={(e) => { if (e.key === 'Enter') { dashGap.handleCommit(); (e.currentTarget as HTMLInputElement).blur(); }}}
                                            className={PANEL_CLASSES.input}
                                            aria-label="虚线长度"
                                        />
                                        <span className={PANEL_CLASSES.inputSuffix}>px</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 items-center gap-2">
                                    <label htmlFor="dash-gap-input" className={`${PANEL_CLASSES.label} text-[var(--text-primary)]`}>虚线间隔</label>
                                    <div className={`${PANEL_CLASSES.inputWrapper} cursor-ns-resize`} onWheel={dashGap.handleGapWheel} title="使用滚轮调节">
                                        <input
                                            id="dash-gap-input"
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            value={dashGap.localGap}
                                            onChange={(e) => dashGap.setLocalGap(e.target.value.replace(/[^0-9]/g, ''))}
                                            onBlur={dashGap.handleCommit}
                                            onKeyDown={(e) => { if (e.key === 'Enter') { dashGap.handleCommit(); (e.currentTarget as HTMLInputElement).blur(); }}}
                                            className={PANEL_CLASSES.input}
                                            aria-label="虚线间隔"
                                        />
                                        <span className={PANEL_CLASSES.inputSuffix}>px</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Popover.Panel>
                </Transition>
            </Popover>
        </div>
    );
});