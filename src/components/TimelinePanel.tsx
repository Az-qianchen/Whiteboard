/**
 * 本文件定义了应用底部的时间线面板。
 * 它提供了动画播放控制和关键帧编辑的界面。
 */
import React, { useState, useEffect, useMemo, useRef, useCallback, useLayoutEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { ICONS } from '../constants';
import { Transition } from '@headlessui/react';
import { pathsToSvgString } from '../lib/export';
import PanelButton from '@/components/PanelButton';
import { PANEL_CLASSES } from './panelStyles';
import type { Frame } from '../types';

const timelineButtonBaseClasses = 'flex items-center justify-center h-8 w-8 rounded-md transition-colors';
const timelineButtonInactiveClasses = 'text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]';
const timelineButtonActiveClasses = 'bg-[var(--accent-bg)] text-[var(--accent-primary)]';

const getTimelineButtonClasses = (isActive = false) =>
    `${timelineButtonBaseClasses} ${isActive ? timelineButtonActiveClasses : timelineButtonInactiveClasses}`;

/**
 * 渲染单个帧缩略图的组件。
 */
const FrameThumbnail: React.FC<{ frame: Frame }> = React.memo(({ frame }) => {
    const [svgString, setSvgString] = useState<string | null>(null);

    // Build a lightweight signature that changes only when visual content likely changed
    const signature = useMemo(() => {
        try {
            return JSON.stringify(
                frame.paths.map((p: any) => ({
                    id: p.id,
                    tool: p.tool,
                    x: p.x, y: p.y, width: p.width, height: p.height, rotation: p.rotation,
                    opacity: p.opacity,
                    points: Array.isArray(p.points) ? p.points.length : undefined,
                    anchors: Array.isArray(p.anchors) ? p.anchors.length : undefined,
                }))
            );
        } catch {
            return String(frame.paths.length);
        }
    }, [frame.paths]);

    useEffect(() => {
        let isCancelled = false;
        const generateSvg = async () => {
            const str = await pathsToSvgString(frame.paths, { padding: 5 });
            if (!isCancelled && str !== svgString) {
                setSvgString(str);
            }
        };
        generateSvg();
        return () => { isCancelled = true; };
        // Depend on signature, not the entire frame object to avoid remount loops
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [signature]);

    const dataUrl = useMemo(() => {
        if (!svgString) return '';
        return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgString)))}`;
    }, [svgString]);

    return (
        <div className="w-full h-full bg-[var(--ui-element-bg-inactive)] rounded-md p-1 flex items-center justify-center pointer-events-none overflow-hidden">
            {dataUrl && <img src={dataUrl} alt="Frame preview" className="max-w-full max-h-full object-contain" />}
        </div>
    );
});

/**
 * 时间线面板组件
 */
export const TimelinePanel: React.FC = () => {
    const {
        isTimelineCollapsed, frames, currentFrameIndex, setCurrentFrameIndex,
        fps, setFps, isPlaying, setIsPlaying, addFrame, copyFrame, deleteFrame, reorderFrames,
        isOnionSkinEnabled, setIsOnionSkinEnabled,
        onionSkinPrevFrames, setOnionSkinPrevFrames,
        onionSkinNextFrames, setOnionSkinNextFrames,
        onionSkinOpacity, setOnionSkinOpacity,
    } = useAppContext();

    const panelRef = useRef<HTMLDivElement | null>(null);
    const lastKnownHeightRef = useRef(0);

    const setTimelinePanelHeight = useCallback((value: number) => {
        if (typeof document === 'undefined') return;
        const sanitizedValue = Number.isFinite(value) ? Math.max(0, value) : 0;
        document.documentElement.style.setProperty('--timeline-panel-height', `${sanitizedValue}px`);
    }, []);

    useLayoutEffect(() => {
        if (typeof document === 'undefined') return;

        const element = panelRef.current;
        if (!element) {
            if (isTimelineCollapsed) {
                setTimelinePanelHeight(0);
            }
            return;
        }

        if (isTimelineCollapsed) {
            const measuredHeight = element.scrollHeight || element.getBoundingClientRect().height || lastKnownHeightRef.current;
            setTimelinePanelHeight(measuredHeight > 0 ? measuredHeight : 0);
            return;
        }

        const measuredHeight = element.scrollHeight || element.getBoundingClientRect().height;
        const nextHeight = measuredHeight || lastKnownHeightRef.current;

        if (nextHeight > 0) {
            lastKnownHeightRef.current = nextHeight;
            setTimelinePanelHeight(nextHeight);
        }
    }, [isTimelineCollapsed, setTimelinePanelHeight]);

    useEffect(() => {
        const element = panelRef.current;
        if (!element) return undefined;

        const handleUpdate = () => {
            const height = element.getBoundingClientRect().height;

            if (height > 0) {
                if (!isTimelineCollapsed) {
                    lastKnownHeightRef.current = height;
                }
                setTimelinePanelHeight(height);
                return;
            }

            if (isTimelineCollapsed) {
                setTimelinePanelHeight(0);
            }
        };

        if (typeof ResizeObserver !== 'undefined') {
            const observer = new ResizeObserver(handleUpdate);
            observer.observe(element);
            if (!isTimelineCollapsed) {
                handleUpdate();
            }
            return () => observer.disconnect();
        }

        if (typeof window !== 'undefined') {
            window.addEventListener('resize', handleUpdate);
            if (!isTimelineCollapsed) {
                handleUpdate();
            }
            return () => window.removeEventListener('resize', handleUpdate);
        }

        if (!isTimelineCollapsed) {
            handleUpdate();
        }

        return undefined;
    }, [isTimelineCollapsed, setTimelinePanelHeight]);

    useEffect(() => () => {
        if (typeof document !== 'undefined') {
            document.documentElement.style.removeProperty('--timeline-panel-height');
        }
    }, []);

    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dropIndicator, setDropIndicator] = useState<{ index: number; side: 'left' | 'right' } | null>(null);

    const handlePlayPause = () => setIsPlaying(p => !p);
    const handleRewind = () => { setIsPlaying(false); setCurrentFrameIndex(0); };
    const handleFrameClick = (index: number) => { if (!isPlaying) setCurrentFrameIndex(index); };

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        // Hide the default drag ghost image
        const img = new Image();
        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        e.dataTransfer.setDragImage(img, 0, 0);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const midX = rect.left + rect.width / 2;
        const side = e.clientX < midX ? 'left' : 'right';
        setDropIndicator({ index, side });
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (draggedIndex === null || dropIndicator === null) return;
        
        let dropIndex = dropIndicator.index;
        if (dropIndicator.side === 'right') {
            dropIndex += 1;
        }

        // Adjust index if dragging downwards
        if (draggedIndex < dropIndex) {
            dropIndex -= 1;
        }

        if (draggedIndex !== dropIndex) {
            reorderFrames(draggedIndex, dropIndex);
        }
        setDraggedIndex(null);
        setDropIndicator(null);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
        setDropIndicator(null);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        // Only clear indicator if moving outside the current item, not just to a child
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDropIndicator(null);
        }
    };

    return (
        <div ref={panelRef} className="w-full max-w-full flex-shrink-0 z-20">
            <Transition
                show={!isTimelineCollapsed}
                as="div"
                className="w-full max-w-full flex-shrink-0 bg-[var(--ui-panel-bg)] border-t border-[var(--ui-panel-border)] overflow-hidden z-20"
                enter="transition-[max-height,opacity] duration-300 ease-in-out"
                enterFrom="opacity-0 max-h-0"
                enterTo="opacity-100 max-h-40"
                leave="transition-[max-height,opacity] duration-300 ease-in-out"
                leaveFrom="opacity-100 max-h-40"
                leaveTo="opacity-0 max-h-0"
            >
                <div className="px-2.5 pt-2 pb-1.5 w-full max-w-full flex flex-col">
                <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                          <PanelButton
                              onClick={handleRewind}
                              title="回到开头"
                              variant="unstyled"
                              className={getTimelineButtonClasses()}
                          >
                              {ICONS.REWIND}
                          </PanelButton>
                          <PanelButton
                              onClick={handlePlayPause}
                              title={isPlaying ? '暂停' : '播放'}
                              variant="unstyled"
                              className={getTimelineButtonClasses(isPlaying)}
                          >
                              {isPlaying ? ICONS.PAUSE : ICONS.PLAY}
                          </PanelButton>
                      </div>
                    <div className="flex items-center gap-1.5">
                         <label htmlFor="fps-input" className="text-sm font-medium text-[var(--text-secondary)]">FPS</label>
                         <div className="flex items-center bg-black/20 rounded-md h-[28px] px-1.5 w-14">
                           <input
                             id="fps-input" type="number" min="1" max="60" step="1"
                             value={fps} onChange={(e) => setFps(Math.max(1, parseInt(e.target.value) || 1))}
                             className="w-full bg-transparent text-xs text-center outline-none text-[var(--text-primary)] hide-spinners"
                           />
                         </div>
                    </div>
                      <div className="flex items-center gap-1.5">
                          <PanelButton
                              onClick={() => setIsOnionSkinEnabled(p => !p)}
                              title="洋葱皮"
                              variant="unstyled"
                              className={getTimelineButtonClasses(isOnionSkinEnabled)}
                          >
                              {ICONS.ONION_SKIN}
                          </PanelButton>
                          <div className={`flex items-center gap-2 transition-opacity ${isOnionSkinEnabled ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                            <div className="flex items-center gap-1.5">
                                <label htmlFor="onion-opacity-input" className="text-sm font-medium text-[var(--text-secondary)]">透明度</label>
                                <div className="flex items-center bg-black/20 rounded-md h-[28px] px-1.5 w-16">
                                <input
                                    id="onion-opacity-input" type="number" min="0" max="100" step="1"
                                    value={Math.round(onionSkinOpacity * 100)}
                                    onChange={(e) => setOnionSkinOpacity(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) / 100)}
                                    className="w-full bg-transparent text-xs text-center outline-none text-[var(--text-primary)] hide-spinners"
                                />
                                 <span className="text-xs text-[var(--text-secondary)]">%</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <label htmlFor="prev-frames-input" className="text-sm font-medium text-[var(--text-secondary)]">之前</label>
                                <div className="flex items-center bg-black/20 rounded-md h-[28px] px-1.5 w-14">
                                <input
                                    id="prev-frames-input" type="number" min="0" max="10" step="1"
                                    value={onionSkinPrevFrames} onChange={(e) => setOnionSkinPrevFrames(Math.max(0, parseInt(e.target.value) || 0))}
                                    className="w-full bg-transparent text-xs text-center outline-none text-[var(--text-primary)] hide-spinners"
                                />
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <label htmlFor="next-frames-input" className="text-sm font-medium text-[var(--text-secondary)]">之后</label>
                                <div className="flex items-center bg-black/20 rounded-md h-[28px] px-1.5 w-14">
                                <input
                                    id="next-frames-input" type="number" min="0" max="10" step="1"
                                    value={onionSkinNextFrames} onChange={(e) => setOnionSkinNextFrames(Math.max(0, parseInt(e.target.value) || 0))}
                                    className="w-full bg-transparent text-xs text-center outline-none text-[var(--text-primary)] hide-spinners"
                                />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="mt-1 grid grid-cols-[auto_1fr] items-stretch gap-1.5 min-h-0 min-w-0">
                      <div className="flex h-full flex-col gap-1.5 py-1">
                          <PanelButton
                              onClick={addFrame}
                              title="添加新帧"
                              variant="unstyled"
                              className={getTimelineButtonClasses()}
                          >
                              {ICONS.PLUS}
                          </PanelButton>
                          <PanelButton
                              onClick={() => copyFrame(currentFrameIndex)}
                              title="复制当前帧"
                              variant="unstyled"
                              className={`${getTimelineButtonClasses()} mt-auto`}
                          >
                              {ICONS.COPY}
                          </PanelButton>
                      </div>
                    <div className="w-full rounded-lg px-1.5 py-1 overflow-x-auto overflow-y-hidden min-w-0 timeline-frames-container" onDrop={handleDrop} onDragOver={e => e.preventDefault()}>
                        <div className="flex items-center gap-1.5">
                            {frames.map((frame, index) => (
                                <div
                                    key={index}
                                    className="relative group flex-shrink-0 w-[4.5rem] h-[4.5rem]"
                                    draggable={!isPlaying}
                                    onDragStart={(e) => handleDragStart(e, index)}
                                    onDragOver={(e) => handleDragOver(e, index)}
                                    onDragLeave={handleDragLeave}
                                    onDragEnd={handleDragEnd}
                                    style={{ opacity: draggedIndex === index ? 0.5 : 1 }}
                                >
                                    <PanelButton
                                        variant="unstyled"
                                        onClick={() => handleFrameClick(index)}
                                        className={`w-full h-full rounded-md transition-all duration-150 flex items-center justify-center ${currentFrameIndex === index ? 'ring-2 ring-offset-2 ring-offset-[var(--ui-panel-bg)] ring-[var(--accent-primary)]' : 'ring-1 ring-white/10'}`}
                                        disabled={isPlaying}
                                    >
                                        <FrameThumbnail frame={frame} />
                                        <div className="absolute bottom-1 left-1 px-1.5 py-0.5 text-xs font-mono bg-black/50 rounded-sm text-white">{index + 1}</div>
                                    </PanelButton>
                                    {frames.length > 1 && (
                                      <PanelButton
                                        variant="unstyled"
                                        onClick={() => deleteFrame(index)}
                                        className="absolute -top-1 -right-1 h-5 w-5 p-1 bg-red-600 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="删除帧"
                                      >
                                          {ICONS.TRASH}
                                      </PanelButton>
                                    )}
                                    {dropIndicator && dropIndicator.index === index && (
                                        <div className="absolute top-0 bottom-0 w-1 bg-[var(--accent-primary)] rounded-full pointer-events-none"
                                            style={{ [dropIndicator.side]: '-2px' }} 
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            </Transition>
        </div>
    );
};
