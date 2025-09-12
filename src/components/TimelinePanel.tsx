/**
 * 本文件定义了应用底部的时间线面板。
 * 它提供了动画播放控制和关键帧编辑的界面。
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { ICONS } from '../constants';
import { Transition } from '@headlessui/react';
import { pathsToSvgString } from '../lib/export';
import PanelButton from '@/components/PanelButton';
import type { Frame } from '../types';

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
        <Transition
            show={!isTimelineCollapsed}
            as="div"
            className="w-full flex-shrink-0 bg-[var(--ui-panel-bg)] border-t border-[var(--ui-panel-border)] overflow-hidden z-20"
            enter="transition-[max-height,opacity] duration-300 ease-in-out"
            enterFrom="opacity-0 max-h-0"
            enterTo="opacity-100 max-h-48"
            leave="transition-[max-height,opacity] duration-300 ease-in-out"
            leaveFrom="opacity-100 max-h-48"
            leaveTo="opacity-0 max-h-0"
        >
            <div className="p-3 h-48 w-full flex flex-col gap-3">
                <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                          <PanelButton onClick={handleRewind} title="回到开头" className="text-[var(--text-secondary)]">
                              {ICONS.REWIND}
                          </PanelButton>
                          <PanelButton
                              onClick={handlePlayPause}
                              title={isPlaying ? '暂停' : '播放'}
                              className={isPlaying ? 'bg-[var(--accent-bg)] text-[var(--accent-primary)]' : 'text-[var(--text-secondary)]'}
                          >
                              {isPlaying ? ICONS.PAUSE : ICONS.PLAY}
                          </PanelButton>
                      </div>
                    <div className="flex items-center gap-2">
                         <label htmlFor="fps-input" className="text-sm font-medium text-[var(--text-secondary)]">FPS</label>
                         <div className="flex items-center bg-black/20 rounded-md h-8 px-2 w-20">
                           <input
                             id="fps-input" type="number" min="1" max="60" step="1"
                             value={fps} onChange={(e) => setFps(Math.max(1, parseInt(e.target.value) || 1))}
                             className="w-full bg-transparent text-sm text-center outline-none text-[var(--text-primary)] hide-spinners"
                           />
                         </div>
                    </div>
                      <div className="flex items-center gap-2">
                          <PanelButton
                              onClick={() => setIsOnionSkinEnabled(p => !p)}
                              title="洋葱皮"
                              className={isOnionSkinEnabled ? 'bg-[var(--accent-bg)] text-[var(--accent-primary)]' : 'text-[var(--text-secondary)]'}
                          >
                              {ICONS.ONION_SKIN}
                          </PanelButton>
                          <div className={`flex items-center gap-4 transition-opacity ${isOnionSkinEnabled ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                            <div className="flex items-center gap-2">
                                <label htmlFor="onion-opacity-input" className="text-sm font-medium text-[var(--text-secondary)]">透明度</label>
                                <div className="flex items-center bg-black/20 rounded-md h-8 px-2 w-20">
                                <input
                                    id="onion-opacity-input" type="number" min="0" max="100" step="1"
                                    value={Math.round(onionSkinOpacity * 100)}
                                    onChange={(e) => setOnionSkinOpacity(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) / 100)}
                                    className="w-full bg-transparent text-sm text-center outline-none text-[var(--text-primary)] hide-spinners"
                                />
                                 <span className="text-sm text-[var(--text-secondary)]">%</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <label htmlFor="prev-frames-input" className="text-sm font-medium text-[var(--text-secondary)]">之前</label>
                                <div className="flex items-center bg-black/20 rounded-md h-8 px-2 w-16">
                                <input
                                    id="prev-frames-input" type="number" min="0" max="10" step="1"
                                    value={onionSkinPrevFrames} onChange={(e) => setOnionSkinPrevFrames(Math.max(0, parseInt(e.target.value) || 0))}
                                    className="w-full bg-transparent text-sm text-center outline-none text-[var(--text-primary)] hide-spinners"
                                />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <label htmlFor="next-frames-input" className="text-sm font-medium text-[var(--text-secondary)]">之后</label>
                                <div className="flex items-center bg-black/20 rounded-md h-8 px-2 w-16">
                                <input
                                    id="next-frames-input" type="number" min="0" max="10" step="1"
                                    value={onionSkinNextFrames} onChange={(e) => setOnionSkinNextFrames(Math.max(0, parseInt(e.target.value) || 0))}
                                    className="w-full bg-transparent text-sm text-center outline-none text-[var(--text-primary)] hide-spinners"
                                />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex-grow grid grid-cols-[auto_1fr] items-center gap-2 min-h-0 min-w-0">
                      <div className="flex flex-col gap-2 h-full">
                          <PanelButton onClick={addFrame} title="添加新帧" className="flex-1 !h-auto">
                              {ICONS.PLUS}
                          </PanelButton>
                          <PanelButton onClick={() => copyFrame(currentFrameIndex)} title="复制当前帧" className="flex-1 !h-auto">
                              {ICONS.COPY}
                          </PanelButton>
                      </div>
                    <div className="h-full rounded-lg p-2 overflow-x-auto overflow-y-hidden min-w-0 timeline-frames-container" onDrop={handleDrop} onDragOver={e => e.preventDefault()}>
                        <div className="flex items-center gap-2 h-full">
                            {frames.map((frame, index) => (
                                <div 
                                    key={index}
                                    className="relative group flex-shrink-0 w-24 h-full"
                                    draggable={!isPlaying}
                                    onDragStart={(e) => handleDragStart(e, index)}
                                    onDragOver={(e) => handleDragOver(e, index)}
                                    onDragLeave={handleDragLeave}
                                    onDragEnd={handleDragEnd}
                                    style={{ opacity: draggedIndex === index ? 0.5 : 1 }}
                                >
                                    <button
                                        onClick={() => handleFrameClick(index)}
                                        className={`w-full h-full rounded-md transition-all duration-150 ${currentFrameIndex === index ? 'ring-2 ring-offset-2 ring-offset-[var(--ui-panel-bg)] ring-[var(--accent-primary)]' : 'ring-1 ring-white/10'}`}
                                        disabled={isPlaying}
                                    >
                                        <FrameThumbnail frame={frame} />
                                        <div className="absolute bottom-1 left-1 px-1.5 py-0.5 text-xs font-mono bg-black/50 rounded-sm text-white">{index + 1}</div>
                                    </button>
                                    {frames.length > 1 && (
                                      <button onClick={() => deleteFrame(index)} className="absolute -top-1 -right-1 h-5 w-5 p-1 bg-red-600 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity" title="删除帧">
                                          {ICONS.TRASH}
                                      </button>
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
    );
};
