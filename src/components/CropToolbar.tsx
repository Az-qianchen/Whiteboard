/**
 * 本文件定义了图片裁剪工具栏组件。
 * 当用户进入裁剪模式时，此工具栏会显示，提供裁剪/抠图模式切换以及确认或取消裁剪的选项。
 */
import React, { useEffect, useId, useState } from 'react';
import PanelButton from '@/components/PanelButton';
import { ICONS } from '@/constants';
import { useAppContext } from '@/context/AppContext';
import { SwitchControl } from '@/components/side-toolbar';
import { PANEL_CLASSES } from '@/components/panelStyles';
import { useTranslation } from 'react-i18next';
import type { CroppingTool } from '@/types';

const RemoveBgControls: React.FC<{
  onBegin: (opts: { threshold: number; contiguous: boolean }) => void;
  onApply: () => void;
  onCancel: () => void;
}> = ({ onBegin, onApply, onCancel }) => {
  const { t } = useTranslation();
  const [threshold, setThreshold] = useState(10);
  const [contiguous, setContiguous] = useState(true);
  const thresholdInputId = useId();

  useEffect(() => {
    onBegin({ threshold, contiguous });
  }, [onBegin, threshold, contiguous]);

  useEffect(() => () => { onCancel(); }, [onCancel]);

  const handleApply = () => {
    onApply();
    onBegin({ threshold, contiguous });
  };

  const handleReset = () => {
    onCancel();
    onBegin({ threshold, contiguous });
  };

  const handleThresholdChange = (value: string) => {
    if (value === '') {
      setThreshold(0);
      return;
    }

    const numeric = Number(value);
    if (Number.isNaN(numeric)) return;
    const clamped = Math.min(255, Math.max(0, Math.round(numeric)));
    setThreshold(clamped);
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className={`${PANEL_CLASSES.controlsRow} gap-4`}> 
        <SwitchControl label={t('contiguous')} enabled={contiguous} setEnabled={setContiguous} />
        <div className={`${PANEL_CLASSES.control} text-sm`}>
          <label htmlFor={thresholdInputId} className={`${PANEL_CLASSES.label} text-[var(--text-primary)]`}>
            {t('threshold')}
          </label>
          <div className={PANEL_CLASSES.inputWrapper}>
            <input
              id={thresholdInputId}
              type="number"
              min={0}
              max={255}
              step={1}
              value={threshold}
              onChange={(event) => handleThresholdChange(event.target.value)}
              className={`${PANEL_CLASSES.input} text-sm`}
            />
          </div>
        </div>
      </div>
      <p className="text-xs text-[var(--text-secondary)] max-w-[18rem] flex-1 min-w-[12rem]">
        {t('cropToolbar.instructions')}
      </p>
      <div className="flex items-center gap-2 ml-auto">
        <button
          type="button"
          onClick={handleApply}
          className="h-8 rounded-md bg-[var(--accent-bg)] px-3 text-sm text-[var(--accent-primary)]"
        >
          {t('cropToolbar.applyMatting')}
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="h-8 rounded-md bg-[var(--ui-element-bg-hover)] px-3 text-sm text-[var(--text-primary)]"
        >
          {t('cropToolbar.resetMatting')}
        </button>
      </div>
    </div>
  );
};

/**
 * 裁剪模式下显示的工具栏组件，提供裁剪与抠图模式切换以及确认与取消操作。
 */
export const CropToolbar: React.FC = () => {
  const {
    confirmCrop,
    cancelCrop,
    isTimelineCollapsed,
    croppingTool,
    setCroppingTool,
    beginRemoveBackground,
    applyRemoveBackground,
    cancelRemoveBackground,
  } = useAppContext();
  const { t } = useTranslation();

  const handleToolChange = (tool: CroppingTool) => {
    if (tool === croppingTool) return;
    if (tool === 'crop') {
      cancelRemoveBackground();
    }
    setCroppingTool(tool);
  };

  useEffect(() => () => { cancelRemoveBackground(); }, [cancelRemoveBackground]);

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 z-30 flex flex-wrap items-center gap-3 bg-[var(--ui-panel-bg)] backdrop-blur-lg shadow-xl border border-[var(--ui-panel-border)] rounded-xl p-3 text-[var(--text-primary)] transition-all duration-300 ease-in-out"
      style={{ bottom: isTimelineCollapsed ? '1rem' : 'calc(12rem + 1rem)' }}
    >
      <div className="flex items-center gap-2">
        <PanelButton
          type="button"
          title={t('cropToolbar.cropMode')}
          onClick={() => handleToolChange('crop')}
          variant="unstyled"
          className={`flex items-center justify-center h-[34px] w-[34px] rounded-lg transition-colors ${
            croppingTool === 'crop'
              ? 'bg-[var(--accent-bg)] text-[var(--accent-primary)]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]'
          }`}
        >
          {React.cloneElement(ICONS.CROP, { className: 'h-5 w-5' })}
        </PanelButton>
        <PanelButton
          type="button"
          title={t('cropToolbar.mattingMode')}
          onClick={() => handleToolChange('magic-wand')}
          variant="unstyled"
          className={`flex items-center justify-center h-[34px] w-[34px] rounded-lg transition-colors ${
            croppingTool === 'magic-wand'
              ? 'bg-[var(--accent-bg)] text-[var(--accent-primary)]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]'
          }`}
        >
          {React.cloneElement(ICONS.REMOVE_BG, { className: 'h-5 w-5' })}
        </PanelButton>
      </div>

      {croppingTool === 'magic-wand' && (
        <RemoveBgControls
          onBegin={beginRemoveBackground}
          onApply={applyRemoveBackground}
          onCancel={cancelRemoveBackground}
        />
      )}

      <div className="flex items-center gap-2 md:ml-auto">
        <PanelButton
          type="button"
          title={t('cancel')}
          onClick={() => {
            cancelRemoveBackground();
            cancelCrop();
          }}
          className="!w-auto px-3 gap-1 text-[var(--danger-text)] hover:bg-[var(--danger-bg)]"
        >
          {React.cloneElement(ICONS.X, { className: 'h-5 w-5' })}
          <span>{t('cancel')}</span>
        </PanelButton>
        <PanelButton
          type="button"
          title={t('confirm')}
          onClick={() => {
            cancelRemoveBackground();
            confirmCrop();
          }}
          className="!w-auto px-3 gap-1 bg-[var(--accent-bg)] text-[var(--accent-primary)] hover:bg-[var(--accent-bg)] hover:opacity-90"
        >
          {React.cloneElement(ICONS.CHECK, { className: 'h-5 w-5' })}
          <span>{t('confirm')}</span>
        </PanelButton>
      </div>
    </div>
  );
};
