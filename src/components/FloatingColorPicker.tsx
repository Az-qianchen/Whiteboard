

import React, { Fragment, useState, useRef, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Transition } from '@headlessui/react';
import { ColorPicker } from './ColorPicker';

interface FloatingColorPickerProps {
    color: string;
    onChange: (color: string) => void;
    onInteractionStart?: () => void;
    onInteractionEnd?: () => void;
    placement?: 'left' | 'right';
    children: (props: { ref: React.RefObject<any>, onClick: () => void }) => React.ReactNode;
}

export const FloatingColorPicker: React.FC<FloatingColorPickerProps> = ({
    color,
    onChange,
    onInteractionStart,
    onInteractionEnd,
    placement = 'left',
    children
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
        
        const pickerWidth = 256; // w-64 from ColorPicker
        const pickerHeight = 230; // Estimated height from ColorPicker layout
        const gap = 12; // A small gap between trigger and panel
        const margin = 10; // Minimum distance from viewport edges
        const { innerWidth: viewportWidth, innerHeight: viewportHeight } = window;

        // --- Vertical Positioning: Always try to align top, but push up if it overflows ---
        let finalY = triggerRect.top;
        if (finalY + pickerHeight > viewportHeight - margin) {
            finalY = viewportHeight - pickerHeight - margin;
        }
        finalY = Math.max(margin, finalY);

        // --- Horizontal Positioning: Try preferred side, then fallback, then clamp ---
        const positions = {
            left: triggerRect.left - pickerWidth - gap,
            right: triggerRect.right + gap,
        };

        const preferredX = positions[placement];
        const fallbackX = placement === 'left' ? positions.right : positions.left;

        let finalX;

        // 1. Check if the preferred placement fits within the viewport.
        const preferredFits = preferredX >= margin && (preferredX + pickerWidth) <= (viewportWidth - margin);

        // 2. If not, check if the fallback placement fits.
        const fallbackFits = fallbackX >= margin && (fallbackX + pickerWidth) <= (viewportWidth - margin);
        
        if (preferredFits) {
            finalX = preferredX;
        } else if (fallbackFits) {
            finalX = fallbackX;
        } else {
            // 3. If neither fit (e.g., on a narrow screen), clamp the preferred position
            // to be as close as possible while still being fully visible.
            finalX = Math.max(margin, Math.min(preferredX, viewportWidth - pickerWidth - margin));
        }
        
        setPosition({ x: finalX, y: finalY });

    }, [isOpen, placement]);
    
    const togglePicker = () => setIsOpen(prev => !prev);
    
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
        // Use mousedown in capture phase to ensure it runs before other handlers
        // that might stop propagation, making the "click outside" behavior more reliable.
        document.addEventListener('mousedown', handleClickOutside, true);
        return () => document.removeEventListener('mousedown', handleClickOutside, true);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.stopPropagation();
                setIsOpen(false);
            }
        };
        document.addEventListener('keydown', handleKeyDown, true);
        return () => document.removeEventListener('keydown', handleKeyDown, true);
    }, [isOpen]);

    const pickerElement = (
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
                className="fixed z-50"
                style={{ left: position.x, top: position.y }}
            >
                <ColorPicker color={color} onChange={onChange} onInteractionStart={onInteractionStart} onInteractionEnd={onInteractionEnd} />
            </div>
        </Transition>
    );

    return (
        <>
            {children({ ref: triggerRef, onClick: togglePicker })}
            {isMounted ? createPortal(pickerElement, document.body) : null}
        </>
    );
};
