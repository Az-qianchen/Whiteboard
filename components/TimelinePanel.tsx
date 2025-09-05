/**
 * 本文件定义了应用底部的时间线面板。
 * 它提供了动画播放控制和关键帧编辑的界面。
 */
import React from 'react';
import { useAppContext } from '../context/AppContext';
import { ICONS } from '../constants';

/**
 * 时间线面板组件
 * @description 显示动画控制和时间轴的UI。
 */
export const TimelinePanel: React.FC = () => {
    const { isTimelineCollapsed } = useAppContext();

    return (
        <div 
            className={`flex-shrink-0 bg-[var(--ui-panel-bg)] border-t border-[var(--ui-panel-border)] transition-all duration-300 ease-in-out overflow-hidden z-20 ${
                isTimelineCollapsed ? 'h-0' : 'h-48'
            }`}
        >
            {/* Content */}
            <div className="p-4 h-full flex flex-col">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <button title="快退" className="p-2 rounded-lg flex items-center justify-center w-10 h-10 text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]">
                            {ICONS.REWIND}
                        </button>
                        <button title="播放" className="p-2 rounded-lg flex items-center justify-center w-10 h-10 bg-[var(--accent-bg)] text-[var(--accent-primary)]">
                            {ICONS.PLAY}
                        </button>
                        <button title="暂停" className="p-2 rounded-lg flex items-center justify-center w-10 h-10 text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]">
                            {ICONS.PAUSE}
                        </button>
                    </div>
                    <div className="flex-grow flex items-center gap-2">
                        <span className="text-sm font-mono text-[var(--text-secondary)]">00:00</span>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            defaultValue="0"
                            className="w-full themed-slider"
                            aria-label="时间线滑块"
                        />
                        <span className="text-sm font-mono text-[var(--text-secondary)]">05:00</span>
                    </div>
                </div>
                <div className="mt-2 flex-grow bg-black/10 rounded-md flex items-center justify-center text-[var(--text-secondary)] text-sm">
                    关键帧轨道将显示在此处
                </div>
            </div>
        </div>
    );
};
