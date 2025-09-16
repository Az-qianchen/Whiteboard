/**
 * 本文件定义了一个浮动的动画导出选项面板组件。
 * 它允许用户选择导出格式（PNG 序列或精灵图）并配置相关选项。
 */
import React, { Fragment, useState, useRef, useLayoutEffect, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Transition, RadioGroup, Popover } from '@headlessui/react';
import type { AnimationExportOptions, FrameData } from '../types';
import { useAppContext } from '../context/AppContext';
import { ICONS } from '../constants';
import PanelButton from '@/components/PanelButton';
import { PANEL_CLASSES } from './panelStyles';

interface FloatingAnimationExporterProps {
    children: (props: { ref: React.RefObject<any>, onClick: () => void }) => React.ReactNode;
    onExportAnimation: (options: AnimationExportOptions) => Promise<void>;
    canExport: boolean;
    placement?: 'left' | 'right';
}

export const FloatingAnimationExporter: React.FC<FloatingAnimationExporterProps> = ({
    children,
    onExportAnimation,
    canExport,
    placement = 'right',
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const triggerRef = useRef<HTMLElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const [isMounted, setIsMounted] = useState(false);
    
    const [format, setFormat] = useState<AnimationExportOptions['format']>('sequence');
    const [columns, setColumns] = useState(10);
    const [clipToFrameId, setClipToFrameId] = useState<string | 'full'>('full');

    const { frames } = useAppContext();
    
    const allFrameShapes = useMemo(() => {
        const seen = new Set<string>();
        const uniqueFrames: FrameData[] = [];
        for (const frame of frames) {
            for (const path of frame.paths) {
                if (path.tool === 'frame' && !seen.has(path.id)) {
                    uniqueFrames.push(path as FrameData);
                    seen.add(path.id);
                }
            }
        }
        return uniqueFrames;
    }, [frames]);

    useEffect(() => { setIsMounted(true); }, []);

    useLayoutEffect(() => {
        if (!isOpen || !triggerRef.current) return;
        const triggerRect = triggerRef.current.getBoundingClientRect();
        const panelWidth = 240;
        const panelHeight = 280; // Increased height for the new dropdown
        const gap = 8;
        const margin = 10;
        const { innerWidth: vw, innerHeight: vh } = window;

        let finalY = triggerRect.top;
        if (finalY + panelHeight > vh - margin) finalY = vh - panelHeight - margin;
        finalY = Math.max(margin, finalY);

        const positions = { left: triggerRect.left - panelWidth - gap, right: triggerRect.right + gap };
        const preferredX = positions[placement];
        const fallbackX = placement === 'left' ? positions.right : positions.left;
        let finalX = preferredX;

        if (!(preferredX >= margin && (preferredX + panelWidth) <= (vw - margin))) {
            if (fallbackX >= margin && (fallbackX + panelWidth) <= (vw - margin)) {
                finalX = fallbackX;
            } else {
                finalX = Math.max(margin, Math.min(preferredX, vw - panelWidth - margin));
            }
        }
        setPosition({ x: finalX, y: finalY });
    }, [isOpen, placement]);

    const toggleExporter = () => { if (canExport) setIsOpen(p => !p); };

    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node) && triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside, true);
        return () => document.removeEventListener('mousedown', handleClickOutside, true);
    }, [isOpen]);

    const getFrameLabel = (frameId: string | 'full') => {
        if (frameId === 'full') {
            return '完整画布';
        }
        const frameIndex = allFrameShapes.findIndex(f => f.id === frameId);
        if (frameIndex === -1) {
            return '完整画布'; // Fallback
        }
        const frame = allFrameShapes[frameIndex];
        return `画框 ${frameIndex + 1} ${frame.name ? `(${frame.name})` : ''}`;
    }

    const exporterElement = (
        <Transition show={isOpen} as={Fragment} enter="transition ease-out duration-100" enterFrom="transform opacity-0 scale-95" enterTo="transform opacity-100 scale-100" leave="transition ease-in duration-75" leaveFrom="transform opacity-100 scale-100" leaveTo="transform opacity-0 scale-95">
            <div ref={panelRef} className="fixed z-50 w-60 bg-[var(--ui-popover-bg)] backdrop-blur-lg rounded-xl shadow-lg border border-[var(--ui-panel-border)] p-4" style={{ left: position.x, top: position.y }}>
                <div className={PANEL_CLASSES.section}>
                    <h3 className={PANEL_CLASSES.sectionTitle}>导出动画</h3>

                    <div>
                        <label className={`${PANEL_CLASSES.label} text-[var(--text-primary)]`}>导出区域</label>
                        <Popover className="relative mt-1">
                            <Popover.Button
                                as={PanelButton}
                                variant="unstyled"
                                disabled={allFrameShapes.length === 0}
                                className={`${PANEL_CLASSES.inputWrapper} w-full justify-between text-sm text-left text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] disabled:opacity-50`}
                            >
                                <span className="truncate">{getFrameLabel(clipToFrameId)}</span>
                                <div className="w-4 h-4 text-[var(--text-secondary)] flex-shrink-0">{ICONS.CHEVRON_DOWN}</div>
                            </Popover.Button>
                            <Transition
                                as={Fragment}
                                enter="transition ease-out duration-100"
                                enterFrom="transform opacity-0 scale-95"
                                enterTo="transform opacity-100 scale-100"
                                leave="transition ease-in duration-75"
                                leaveFrom="transform opacity-100 scale-100"
                                leaveTo="transform opacity-0 scale-95"
                            >
                                <Popover.Panel className="absolute bottom-full mb-2 w-full max-h-48 overflow-y-auto bg-[var(--ui-popover-bg)] backdrop-blur-lg rounded-xl shadow-lg border border-[var(--ui-panel-border)] z-30 p-1 style-library-grid">
                                    {({ close }) => (
                                        <div className="flex flex-col gap-1">
                                            <PanelButton
                                                variant="unstyled"
                                                onClick={() => { setClipToFrameId('full'); close(); }}
                                                className={`w-full text-left p-2 rounded-md text-sm ${clipToFrameId === 'full' ? 'bg-[var(--accent-bg)] text-[var(--accent-primary)]' : 'hover:bg-[var(--ui-element-bg-hover)] text-[var(--text-primary)]'}`}
                                            >
                                                完整画布
                                            </PanelButton>
                                            {allFrameShapes.map((frame, index) => (
                                                <PanelButton
                                                    variant="unstyled"
                                                    key={frame.id}
                                                    onClick={() => { setClipToFrameId(frame.id); close(); }}
                                                    className={`w-full text-left p-2 rounded-md text-sm ${clipToFrameId === frame.id ? 'bg-[var(--accent-bg)] text-[var(--accent-primary)]' : 'hover:bg-[var(--ui-element-bg-hover)] text-[var(--text-primary)]'}`}
                                                >
                                                    <span className="truncate">画框 {index + 1} {frame.name ? `(${frame.name})` : ''}</span>
                                                </PanelButton>
                                            ))}
                                        </div>
                                    )}
                                </Popover.Panel>
                            </Transition>
                        </Popover>
                    </div>

                    <RadioGroup value={format} onChange={setFormat}>
                        <RadioGroup.Label className={`${PANEL_CLASSES.label} text-[var(--text-primary)]`}>格式</RadioGroup.Label>
                        <div className={`${PANEL_CLASSES.controlsRow} mt-1`}>
                            <RadioGroup.Option value="sequence" as={Fragment}>
                                {({ checked }) => (
                                  <PanelButton
                                    variant="unstyled"
                                    className={`flex-1 text-center text-sm py-2 px-3 rounded-md cursor-pointer ${checked ? 'bg-[var(--accent-bg)] text-[var(--accent-primary)]' : 'bg-[var(--ui-element-bg)] text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]'}`}
                                  >
                                    PNG 序列
                                  </PanelButton>
                                )}
                            </RadioGroup.Option>
                            <RadioGroup.Option value="spritesheet" as={Fragment}>
                                {({ checked }) => (
                                  <PanelButton
                                    variant="unstyled"
                                    className={`flex-1 text-center text-sm py-2 px-3 rounded-md cursor-pointer ${checked ? 'bg-[var(--accent-bg)] text-[var(--accent-primary)]' : 'bg-[var(--ui-element-bg)] text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]'}`}
                                  >
                                    精灵图
                                  </PanelButton>
                                )}
                            </RadioGroup.Option>
                        </div>
                    </RadioGroup>

                    <div className={`grid grid-cols-2 items-center gap-3 transition-opacity ${format !== 'spritesheet' ? 'opacity-50 pointer-events-none' : ''}`}>
                        <label htmlFor="spritesheet-cols" className={`${PANEL_CLASSES.label} text-[var(--text-primary)]`}>列数</label>
                        <div className={`${PANEL_CLASSES.inputWrapper} w-full`}>
                            <input
                                id="spritesheet-cols"
                                type="number"
                                min="1"
                                step="1"
                                value={columns}
                                onChange={e => setColumns(Math.max(1, parseInt(e.target.value) || 1))}
                                className={`${PANEL_CLASSES.input} hide-spinners`}
                            />
                        </div>
                    </div>
                    
                    <PanelButton
                      variant="unstyled"
                      onClick={async () => { await onExportAnimation({ format, columns, clipToFrameId }); setIsOpen(false); }}
                      className="w-full flex items-center justify-center gap-2 p-2 rounded-md text-sm bg-[var(--accent-solid-bg)] text-[var(--text-on-accent-solid)] hover:opacity-90 transition-opacity"
                    >
                      导出
                    </PanelButton>
                </div>
            </div>
        </Transition>
    );

    return (
        <>
            {children({ ref: triggerRef, onClick: toggleExporter })}
            {isMounted ? createPortal(exporterElement, document.body) : null}
        </>
    );
};
