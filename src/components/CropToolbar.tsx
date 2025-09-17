/**
 * 本文件定义了图片裁剪工具栏组件。
 * 当用户进入裁剪模式时，此工具栏会显示，提供确认或取消裁剪的选项。
 */
import React from 'react';
import PanelButton from '@/components/PanelButton';
import { ICONS } from '@/constants';
import { useAppContext } from '@/context/AppContext';
import { getTimelineOverlayBottomOffset } from '@/components/layout/timelinePositioning';

/**
 * 裁剪模式下显示的工具栏组件，提供确认与取消裁剪操作。
 */
export const CropToolbar: React.FC = () => {
  const { confirmCrop, cancelCrop, isTimelineCollapsed } = useAppContext();

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-[var(--ui-panel-bg)] backdrop-blur-lg shadow-xl border border-[var(--ui-panel-border)] rounded-xl p-2 text-[var(--text-primary)] transition-all duration-300 ease-in-out"
      style={{ bottom: getTimelineOverlayBottomOffset(isTimelineCollapsed, '1rem') }}
    >
      <PanelButton
        type="button"
        title="取消裁剪"
        onClick={cancelCrop}
        className="!w-auto px-3 gap-1 text-[var(--danger-text)] hover:bg-[var(--danger-bg)]"
      >
        {React.cloneElement(ICONS.X, { className: 'h-5 w-5' })}
        <span>取消</span>
      </PanelButton>
      <div className="h-6 w-px bg-[var(--ui-separator)] mx-1" />
      <PanelButton
        type="button"
        title="确认裁剪"
        onClick={confirmCrop}
        className="!w-auto px-3 gap-1 bg-[var(--accent-bg)] text-[var(--accent-primary)] hover:bg-[var(--accent-bg)] hover:opacity-90"
      >
        {React.cloneElement(ICONS.CHECK, { className: 'h-5 w-5' })}
        <span>确认</span>
      </PanelButton>
    </div>
  );
};
