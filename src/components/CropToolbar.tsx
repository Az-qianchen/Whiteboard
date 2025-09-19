/**
 * 本文件定义了图片裁剪工具栏组件。
 * 当用户进入裁剪模式时，此工具栏会显示，提供裁剪/抠图模式切换与操作选项。
 */
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import PanelButton from '@/components/PanelButton';
import { PANEL_CLASSES } from '@/components/panelStyles';
import { ICONS, getTimelinePanelBottomOffset } from '@/constants';

interface CropToolbarProps {
  isTimelineCollapsed: boolean;
  cropTool: 'crop' | 'magic-wand';
  setCropTool: (tool: 'crop' | 'magic-wand') => void;
  cropMagicWandOptions: { threshold: number; contiguous: boolean };
  setCropMagicWandOptions: (opts: Partial<{ threshold: number; contiguous: boolean }>) => void;
  cropSelectionContours: Array<{ d: string; inner: boolean }> | null;
  cropPendingCutoutSrc: string | null;
  cropSelectionInverted: boolean;
  applyMagicWandSelection: () => void;
  cancelMagicWandSelection: () => void;
  toggleCropSelectionInverted: () => void;
  cutMagicWandSelection: () => void;
  trimTransparentEdges: () => void;
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
  cropPendingCutoutSrc,
  cropSelectionInverted,
  applyMagicWandSelection,
  cancelMagicWandSelection,
  toggleCropSelectionInverted,
  cutMagicWandSelection,
  trimTransparentEdges,
  confirmCrop,
  cancelCrop,
}) => {
  const { t } = useTranslation();

  const hasSelection = useMemo(
    () => (cropSelectionContours?.length ?? 0) > 0,
    [cropSelectionContours]
  );

  const canCutSelection = useMemo(
    () => hasSelection && !!cropPendingCutoutSrc,
    [hasSelection, cropPendingCutoutSrc]
  );

  const timelineBottomOffset = useMemo(
    () => getTimelinePanelBottomOffset(),
    [isTimelineCollapsed]
  );

  const handleThresholdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const parsedValue = Number(event.target.value);

    if (Number.isNaN(parsedValue)) {
      return;
    }

    const clampedValue = Math.min(120, Math.max(1, parsedValue));
    setCropMagicWandOptions({ threshold: clampedValue });
  };

  const handleContiguousToggle = () => {
    setCropMagicWandOptions({ contiguous: !cropMagicWandOptions.contiguous });
  };

  const segmentedButtonBase =
    'flex items-center gap-2 h-9 px-3 rounded-md text-sm font-medium transition-colors';
  const textButtonBase =
    'flex items-center gap-2 h-9 px-3 rounded-md text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed';

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 z-30 flex flex-wrap items-start gap-4 bg-[var(--ui-panel-bg)] backdrop-blur-lg shadow-xl border border-[var(--ui-panel-border)] rounded-xl p-3 text-[var(--text-primary)]"
      style={{ bottom: timelineBottomOffset }}
    >
      <div className="flex flex-col gap-2">
        <div className={PANEL_CLASSES.segmentGroup}>
          <PanelButton
            type="button"
            variant="unstyled"
            className={`${segmentedButtonBase} ${
              cropTool === 'crop'
                ? 'bg-[var(--accent-bg)] text-[var(--accent-primary)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]'
            }`}
            onClick={() => setCropTool('crop')}
            aria-pressed={cropTool === 'crop'}
            title={t('cropAdjust')}
          >
            {ICONS.FRAME}
            <span>{t('cropAdjust')}</span>
          </PanelButton>
          <PanelButton
            type="button"
            variant="unstyled"
            className={`${segmentedButtonBase} ${
              cropTool === 'magic-wand'
                ? 'bg-[var(--accent-bg)] text-[var(--accent-primary)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]'
            }`}
            onClick={() => setCropTool('magic-wand')}
            aria-pressed={cropTool === 'magic-wand'}
            title={t('cropMagicWand')}
          >
            {ICONS.TRACE_IMAGE}
            <span>{t('cropMagicWand')}</span>
          </PanelButton>
        </div>
      </div>

      {cropTool === 'magic-wand' && (
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]" htmlFor="magic-wand-threshold">
            {t('threshold')}
            <div className={`${PANEL_CLASSES.inputWrapper} w-16`}>
              <input
                id="magic-wand-threshold"
                type="number"
                min={1}
                max={120}
                step={1}
                value={cropMagicWandOptions.threshold}
                onChange={handleThresholdChange}
                inputMode="numeric"
                className={`${PANEL_CLASSES.input} hide-spinners text-right`}
              />
            </div>
          </label>

          <PanelButton
            type="button"
            variant="unstyled"
            onClick={handleContiguousToggle}
            className={`${segmentedButtonBase} ${
              cropMagicWandOptions.contiguous
                ? 'bg-[var(--accent-bg)] text-[var(--accent-primary)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]'
            }`}
            aria-pressed={cropMagicWandOptions.contiguous}
            title={t('contiguous')}
          >
            <span>{t('contiguous')}</span>
          </PanelButton>
        </div>
      )}

      {cropTool === 'magic-wand' && (
        <div className="flex flex-wrap items-center gap-2">
          <PanelButton
            type="button"
            variant="unstyled"
            onClick={applyMagicWandSelection}
            disabled={!hasSelection}
            className={`${textButtonBase} bg-[var(--accent-solid-bg)] text-[var(--text-on-accent-solid)] hover:opacity-90`}
          >
            {ICONS.CHECK}
            <span>{t('applySelection')}</span>
          </PanelButton>
          <PanelButton
            type="button"
            variant="unstyled"
            onClick={toggleCropSelectionInverted}
            disabled={!hasSelection}
            aria-pressed={cropSelectionInverted}
            className={`${textButtonBase} ${
              cropSelectionInverted
                ? 'bg-[var(--accent-bg)] text-[var(--accent-primary)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]'
            }`}
          >
            {ICONS.INVERT_SELECTION}
            <span>{t('invertSelection')}</span>
          </PanelButton>
          <PanelButton
            type="button"
            variant="unstyled"
            onClick={cutMagicWandSelection}
            disabled={!canCutSelection}
            className={`${textButtonBase} text-[var(--accent-primary)] hover:bg-[var(--ui-element-bg-hover)]`}
          >
            {ICONS.CUT}
            <span>{t('cutSelection')}</span>
          </PanelButton>
          <PanelButton
            type="button"
            variant="unstyled"
            onClick={cancelMagicWandSelection}
            disabled={!hasSelection}
            className={`${textButtonBase} bg-[var(--danger-bg)] text-[var(--danger-text)] hover:opacity-90`}
          >
            {ICONS.X}
            <span>{t('clearSelection')}</span>
          </PanelButton>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <PanelButton
          type="button"
          title={t('trimTransparent')}
          onClick={trimTransparentEdges}
          variant="unstyled"
          className={`${textButtonBase} text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]`}
        >
          {ICONS.CROP_TRIM}
          <span>{t('trimTransparent')}</span>
        </PanelButton>
        <PanelButton
          type="button"
          title={t('cancel')}
          onClick={cancelCrop}
          variant="unstyled"
          className={`${textButtonBase} text-[var(--danger-text)] hover:bg-[var(--danger-bg)]`}
        >
          {ICONS.X}
          <span>{t('cancel')}</span>
        </PanelButton>
        <PanelButton
          type="button"
          title={t('confirm')}
          onClick={confirmCrop}
          variant="unstyled"
          className={`${textButtonBase} bg-[var(--accent-bg)] text-[var(--accent-primary)] hover:opacity-90`}
        >
          {ICONS.CHECK}
          <span>{t('confirm')}</span>
        </PanelButton>
      </div>
    </div>
  );
};
