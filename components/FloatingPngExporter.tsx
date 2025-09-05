/**
 * 本文件定义了一个浮动的 PNG 导出选项面板组件。
 * 它使用 React Portal 将面板渲染到 document.body 中，以避免被父容器的样式（如 overflow: hidden）裁剪。
 */
import React, { Fragment, useState, useRef, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Transition, Switch } from '@headlessui/react';
import type { PngExportOptions } from '../types';

interface FloatingPngExporterProps {
    children: (props: { ref: React.RefObject<any>, onClick: () => void }) => React.ReactNode;
    pngExportOptions: PngExportOptions;
    setPngExportOptions: (options: PngExportOptions | ((prev: PngExportOptions) => PngExportOptions)) => void;
    onExportPng: () => Promise<void>;
    canExport: boolean;
    placement?: 'left' | 'right';
}

const SwitchControl: React.FC<{ label: string; enabled: boolean; setEnabled: (enabled: boolean) => void; }> = ({ label, enabled, setEnabled }) => (
    <div className="flex items-center justify-between">
        <label htmlFor={label} className="text-sm font-medium text-[var(--text-primary)]">{label}</label>
        <Switch
            id={label}
            checked={enabled}
            onChange={setEnabled}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2 focus:ring-offset-[var(--ui-panel-bg)] border ${enabled ? 'bg-[var(--accent-bg)] border-[var(--accent-primary)]' : 'bg-black/30 border-transparent'}`}
        >
            <span className={`${enabled ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
        </Switch>
    </div>
);

export const FloatingPngExporter: React.FC<FloatingPngExporterProps> = ({
    children,
    pngExportOptions,
    setPngExportOptions,
    onExportPng,
    canExport,
    placement = 'right',
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const triggerRef = useRef<HTMLElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useLayoutEffect(() => {
        if (!isOpen || !triggerRef.current) return;

        const triggerRect = triggerRef.current.getBoundingClientRect();
        
        const panelWidth = 224; // w-56 is 14rem = 224px
        const panelHeight = 220; // Estimated from content
        const gap = 8;
        const margin = 10;
        const { innerWidth: viewportWidth, innerHeight: viewportHeight } = window;

        // --- Vertical Positioning ---
        let finalY = triggerRect.top;
        if (finalY + panelHeight > viewportHeight - margin) {
            finalY = viewportHeight - panelHeight - margin;
        }
        finalY = Math.max(margin, finalY);

        // --- Horizontal Positioning ---
        const positions = {
            left: triggerRect.left - panelWidth - gap,
            right: triggerRect.right + gap,
        };

        const preferredX = positions[placement];
        const fallbackX = placement === 'left' ? positions.right : positions.left;

        let finalX;

        const preferredFits = preferredX >= margin && (preferredX + panelWidth) <= (viewportWidth - margin);
        const fallbackFits = fallbackX >= margin && (fallbackX + panelWidth) <= (viewportWidth - margin);
        
        if (preferredFits) {
            finalX = preferredX;
        } else if (fallbackFits) {
            finalX = fallbackX;
        } else {
            finalX = Math.max(margin, Math.min(preferredX, viewportWidth - panelWidth - margin));
        }
        
        setPosition({ x: finalX, y: finalY });
    }, [isOpen, placement]);

    const toggleExporter = () => {
        if (canExport) {
            setIsOpen(prev => !prev);
        }
    };

    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (
                panelRef.current && !panelRef.current.contains(event.target as Node) &&
                triggerRef.current && !triggerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside, true);
        return () => document.removeEventListener('mousedown', handleClickOutside, true);
    }, [isOpen]);

    const exporterElement = (
        <Transition
            show={isOpen}
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
        >
            <div
                ref={panelRef}
                className="fixed z-50 w-56 bg-[var(--ui-popover-bg)] backdrop-blur-lg rounded-xl shadow-lg border border-[var(--ui-panel-border)] p-4"
                style={{ left: position.x, top: position.y }}
            >
                <div className="flex flex-col gap-4">
                    <h3 className="text-sm font-bold text-center text-[var(--text-primary)]">PNG 导出选项</h3>
                    <div className="grid grid-cols-2 items-center gap-2">
                        <label htmlFor="png-scale" className="text-sm font-medium text-[var(--text-primary)]">比例</label>
                        <div className="flex items-center bg-black/20 rounded-md h-8 px-2">
                            <input
                                id="png-scale"
                                type="number"
                                min="0.1"
                                max="10"
                                step="0.1"
                                value={pngExportOptions.scale}
                                onChange={e => setPngExportOptions(prev => ({ ...prev, scale: Math.max(0.1, parseFloat(e.target.value)) || 1 }))}
                                className="w-full bg-transparent text-sm text-center outline-none text-[var(--text-primary)] hide-spinners"
                            />
                            <span className="text-sm text-[var(--text-secondary)]">x</span>
                        </div>
                    </div>
                    <SwitchControl label="透明背景" enabled={pngExportOptions.transparentBg} setEnabled={val => setPngExportOptions(prev => ({ ...prev, transparentBg: val }))} />
                    <SwitchControl label="高质量压缩" enabled={pngExportOptions.highQuality} setEnabled={val => setPngExportOptions(prev => ({ ...prev, highQuality: val }))} />
                    <button
                        onClick={async () => {
                            await onExportPng();
                            setIsOpen(false);
                        }}
                        className="w-full flex items-center justify-center gap-2 p-2 rounded-md text-sm bg-[var(--accent-solid-bg)] text-[var(--text-on-accent-solid)] hover:opacity-90 transition-opacity"
                    >
                        导出
                    </button>
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