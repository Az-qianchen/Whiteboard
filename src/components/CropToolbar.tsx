/**
 * 本文件定义了图片裁剪工具栏组件。
 * 当用户进入裁剪模式时，此工具栏会显示，提供裁剪/抠图模式切换与操作选项。
 */
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import PanelButton from '@/components/PanelButton';
import { ICONS, getTimelinePanelBottomOffset } from '@/constants';

interface CropToolbarProps {
  isTimelineCollapsed: boolean;
  cropTool: 'crop' | 'magic-wand';
  setCropTool: (tool: 'crop' | 'magic-wand') => void;
  cropMagicWandOptions: { threshold: number; contiguous: boolean };
  setCropMagicWandOptions: (opts: Partial<{ threshold: number; contiguous: boolean }>) => void;
  cropSelectionContours: Array<{ d: string; inner: boolean }> | null;
  applyMagicWandSelection: () => void;
  cancelMagicWandSelection: () => void;
  confirmCrop: () => void;
  cancelCrop: () => void;
}

/**
 * 裁剪模式下显示的工具栏组件，提供裁剪、抠图及确认/取消裁剪等操作。
 */
export const CropToolbar: React.FC<CropToolbarProps> = ({
  isTimelineCollapsed,
  cropTool,
  setCropTool,
  cropMagicWandOptions,
  setCropMagicWandOptions,
  cropSelectionContours,
  applyMagicWandSelection,
  cancelMagicWandSelection,
  confirmCrop,
  cancelCrop,
}) => {
  const { t } = useTranslation();

  const hasSelection = useMemo(
    () => (cropSelectionContours?.length ?? 0) > 0,
    [cropSelectionContours]
  );

  const timelineBottomOffset = useMemo(
    () => getTimelinePanelBottomOffset(),
    [isTimelineCollapsed]
  );

  const handleThresholdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCropMagicWandOptions({ threshold: Number(event.target.value) });
  };

  const handleContiguousToggle = () => {
    setCropMagicWandOptions({ contiguous: !cropMagicWandOptions.contiguous });
  };

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 z-30 flex flex-wrap items-start gap-4 bg-[var(--ui-panel-bg)] backdrop-blur-lg shadow-xl border border-[var(--ui-panel-border)] rounded-xl p-3 text-[var(--text-primary)]"
      style={{ bottom: timelineBottomOffset }}
    >
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-[var(--text-secondary)]">{t('cropMode')}</span>
        <div className="flex items-center gap-1 rounded-lg bg-[var(--ui-element-bg)] p-1">
          <button
            type="button"
            className={`flex items-center gap-1 rounded-md px-3 py-1 text-sm font-medium transition-colors ${
              cropTool === 'crop'
                ? 'bg-[var(--accent-bg)] text-[var(--accent-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            onClick={() => setCropTool('crop')}
            aria-pressed={cropTool === 'crop'}
            title={t('cropAdjust')}
          >
            {React.cloneElement(ICONS.FRAME, { className: 'h-4 w-4' })}
            <span>{t('cropAdjust')}</span>
          </button>
          <button
            type="button"
            className={`flex items-center gap-1 rounded-md px-3 py-1 text-sm font-medium transition-colors ${
              cropTool === 'magic-wand'
                ? 'bg-[var(--accent-bg)] text-[var(--accent-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            onClick={() => setCropTool('magic-wand')}
            aria-pressed={cropTool === 'magic-wand'}
            title={t('cropMagicWand')}
          >
            {React.cloneElement(ICONS.TRACE_IMAGE, { className: 'h-4 w-4' })}
            <span>{t('cropMagicWand')}</span>
          </button>
        </div>
      </div>

      {cropTool === 'magic-wand' && (
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]" htmlFor="magic-wand-threshold">
            {t('threshold')}
            <input
              id="magic-wand-threshold"
              type="range"
              min={1}
              max={120}
              step={1}
              value={cropMagicWandOptions.threshold}
              onChange={handleThresholdChange}
              className="themed-slider w-36"
            />
            <span className="w-10 text-right font-medium text-[var(--text-primary)]">
              {cropMagicWandOptions.threshold}
            </span>
          </label>

          <PanelButton
            type="button"
            onClick={handleContiguousToggle}
            className={`!w-auto px-3 gap-2 text-sm font-medium transition-colors ${
              cropMagicWandOptions.contiguous
                ? '!bg-[var(--accent-bg)] text-[var(--accent-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            aria-pressed={cropMagicWandOptions.contiguous}
            title={t('contiguous')}
          >
            <span>{t('contiguous')}</span>
          </PanelButton>
        </div>
      )}

      {cropTool === 'magic-wand' && (
        <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]">
          <span>{t('clickImageToSelectArea')}</span>
          <div className="flex items-center gap-2">
            <PanelButton
              type="button"
              onClick={applyMagicWandSelection}
              disabled={!hasSelection}
              className="!w-auto px-3 gap-1 bg-[var(--accent-bg)] text-[var(--accent-primary)] hover:bg-[var(--accent-bg)] hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {React.cloneElement(ICONS.CHECK, { className: 'h-4 w-4' })}
              <span>{t('applySelection')}</span>
            </PanelButton>
            <PanelButton
              type="button"
              onClick={cancelMagicWandSelection}
              disabled={!hasSelection}
              className="!w-auto px-3 gap-1 text-[var(--danger-text)] hover:bg-[var(--danger-bg)] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {React.cloneElement(ICONS.X, { className: 'h-4 w-4' })}
              <span>{t('clearSelection')}</span>
            </PanelButton>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <PanelButton
          type="button"
          title={t('cancel')}
          onClick={cancelCrop}
          className="!w-auto px-3 gap-1 text-[var(--danger-text)] hover:bg-[var(--danger-bg)]"
        >
          {React.cloneElement(ICONS.X, { className: 'h-5 w-5' })}
          <span>{t('cancel')}</span>
        </PanelButton>
        <PanelButton
          type="button"
          title={t('confirm')}
          onClick={confirmCrop}
          className="!w-auto px-3 gap-1 bg-[var(--accent-bg)] text-[var(--accent-primary)] hover:bg-[var(--accent-bg)] hover:opacity-90"
        >
          {React.cloneElement(ICONS.CHECK, { className: 'h-5 w-5' })}
          <span>{t('confirm')}</span>
        </PanelButton>
      </div>
    </div>
  );
};
