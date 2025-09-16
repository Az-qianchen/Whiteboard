/**
 * 本文件定义了图片裁剪工具栏组件。
 * 当用户进入裁剪模式时，此工具栏会显示，提供裁剪调节和抠图选项。
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PanelButton from '@/components/PanelButton';
import { ICONS } from '@/constants';
import { useAppContext } from '@/context/AppContext';
import { SwitchControl, Slider } from './side-toolbar';

type CropTool = 'crop' | 'removeBackground';

interface CropToolbarProps {
  activeTool: CropTool | null;
  onSelectTool: (tool: CropTool) => void;
  onBeginRemoveBg: (opts: { threshold: number; contiguous: boolean }) => void;
  onApplyRemoveBg: () => void;
  onCancelRemoveBg: () => void;
}

/**
 * 裁剪模式下显示的工具栏组件，提供裁剪调节和抠图操作。
 */
export const CropToolbar: React.FC<CropToolbarProps> = ({
  activeTool,
  onSelectTool,
  onBeginRemoveBg,
  onApplyRemoveBg,
  onCancelRemoveBg,
}) => {
  const { confirmCrop, cancelCrop, isTimelineCollapsed } = useAppContext();
  const { t } = useTranslation();
  const [threshold, setThreshold] = useState(10);
  const [contiguous, setContiguous] = useState(true);

  const selectedTool: CropTool = useMemo(() => activeTool ?? 'crop', [activeTool]);

  useEffect(() => {
    if (selectedTool === 'removeBackground') {
      onBeginRemoveBg({ threshold, contiguous });
    }
  }, [selectedTool, threshold, contiguous, onBeginRemoveBg]);

  useEffect(() => () => {
    onCancelRemoveBg();
  }, [onCancelRemoveBg]);

  const handleSelectTool = (tool: CropTool) => {
    if (tool === selectedTool) return;
    if (tool === 'crop') {
      onCancelRemoveBg();
    }
    onSelectTool(tool);
  };

  const handleApplyRemove = () => {
    onApplyRemoveBg();
    if (selectedTool === 'removeBackground') {
      onBeginRemoveBg({ threshold, contiguous });
    }
  };

  const handleResetRemove = () => {
    onCancelRemoveBg();
    if (selectedTool === 'removeBackground') {
      onBeginRemoveBg({ threshold, contiguous });
    }
  };

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 z-30 flex items-center gap-4 bg-[var(--ui-panel-bg)] backdrop-blur-lg shadow-xl border border-[var(--ui-panel-border)] rounded-xl p-3 text-[var(--text-primary)] transition-all duration-300 ease-in-out"
      style={{ bottom: isTimelineCollapsed ? '1rem' : 'calc(12rem + 1rem)' }}
    >
      <div className="flex items-center gap-3">
        <div className="flex bg-[var(--ui-element-bg)] rounded-lg p-1">
          <button
            type="button"
            onClick={() => handleSelectTool('crop')}
            className={`px-3 h-8 text-sm rounded-md transition-colors ${
              selectedTool === 'crop'
                ? 'bg-[var(--accent-bg)] text-[var(--accent-primary)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]'
            }`}
          >
            {t('cropToolCrop')}
          </button>
          <button
            type="button"
            onClick={() => handleSelectTool('removeBackground')}
            className={`px-3 h-8 text-sm rounded-md transition-colors ${
              selectedTool === 'removeBackground'
                ? 'bg-[var(--accent-bg)] text-[var(--accent-primary)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]'
            }`}
          >
            {t('cropToolRemoveBg')}
          </button>
        </div>

        {selectedTool === 'removeBackground' && (
          <div className="flex items-center gap-3">
            <SwitchControl label={t('contiguous')} enabled={contiguous} setEnabled={setContiguous} />
            <div className="w-44">
              <Slider
                label={t('threshold')}
                value={threshold}
                setValue={setThreshold}
                min={0}
                max={255}
                step={1}
                onInteractionStart={() => {}}
                onInteractionEnd={() => {}}
              />
              <p className="mt-1 text-[0.65rem] text-center text-[var(--text-secondary)]">
                {t('clickImageToSelectArea')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleApplyRemove}
                className="h-8 px-3 rounded-md bg-[var(--accent-bg)] text-[var(--accent-primary)] text-sm"
              >
                {t('remove')}
              </button>
              <button
                type="button"
                onClick={handleResetRemove}
                className="h-8 px-3 rounded-md bg-[var(--ui-element-bg-hover)] text-[var(--text-primary)] text-sm"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <PanelButton
          type="button"
          title={t('cancelCrop')}
          onClick={() => {
            handleSelectTool('crop');
            cancelCrop();
          }}
          className="!w-auto px-3 gap-1 text-[var(--danger-text)] hover:bg-[var(--danger-bg)]"
        >
          {React.cloneElement(ICONS.X, { className: 'h-5 w-5' })}
          <span>{t('cancel')}</span>
        </PanelButton>
        <div className="h-6 w-px bg-[var(--ui-separator)]" />
        <PanelButton
          type="button"
          title={t('confirmCrop')}
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
