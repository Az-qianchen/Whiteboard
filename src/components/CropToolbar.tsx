/**
 * 本文件定义了图片裁剪工具栏组件。
 * 当用户进入裁剪模式时，此工具栏会显示，提供确认或取消裁剪的选项。
 */
import React from 'react';
import { ICONS, ICON_SIZE } from '@/constants';
import { useAppContext } from '../context/AppContext';

export const CropToolbar: React.FC = () => {
  const { confirmCrop, cancelCrop, isTimelineCollapsed } = useAppContext();

  return (
    <div 
      className="absolute left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-[var(--ui-panel-bg)] backdrop-blur-lg shadow-xl border border-[var(--ui-panel-border)] rounded-xl p-2 text-[var(--text-primary)] transition-all duration-300 ease-in-out"
      style={{ bottom: isTimelineCollapsed ? '1rem' : 'calc(12rem + 1rem)' }}
    >
      <button
        type="button"
        title="取消裁剪"
        onClick={cancelCrop}
        className="p-2 rounded-lg flex items-center justify-center w-[68px] h-[34px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-opacity-75 text-[var(--danger-text)] hover:bg-[var(--danger-bg)]"
      >
        {React.cloneElement(ICONS.X, { className: `${ICON_SIZE} mr-1` })}
        取消
      </button>
      <div className="h-6 w-px bg-[var(--ui-separator)] mx-1" />
      <button
        type="button"
        title="确认裁剪"
        onClick={confirmCrop}
        className="p-2 rounded-lg flex items-center justify-center w-[68px] h-[34px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-opacity-75 bg-[var(--accent-bg)] text-[var(--accent-primary)]"
      >
        {React.cloneElement(ICONS.CHECK, { className: `${ICON_SIZE} mr-1` })}
        确认
      </button>
    </div>
  );
};