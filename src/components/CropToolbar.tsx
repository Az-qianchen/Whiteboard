/**
 * 本文件定义了图片裁剪工具栏组件。
 * 当用户进入裁剪模式时，此工具栏会显示，提供裁剪调节和抠图选项。
 */
import React, { useEffect, useMemo, useState, useId } from 'react';
import { Switch } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import PanelButton from '@/components/PanelButton';
import { ICONS } from '@/constants';
import { useAppContext } from '@/context/AppContext';

type CropTool = 'crop' | 'removeBackground';

interface CropToolbarProps {
  activeTool: CropTool | null;
  onSelectTool: (tool: CropTool) => void;
  onBeginRemoveBg: (opts: { threshold: number; contiguous: boolean }) => void;
  onApplyRemoveBg: () => void;
  onCancelRemoveBg: () => void;
  imageSrc?: string;
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
  imageSrc,
}) => {
  const { confirmCrop, cancelCrop, isTimelineCollapsed } = useAppContext();
  const { t } = useTranslation();
  const [threshold, setThreshold] = useState(10);
  const [contiguous, setContiguous] = useState(true);
  const thresholdId = useId();

  const selectedTool: CropTool = useMemo(() => activeTool ?? 'crop', [activeTool]);

  useEffect(() => {
    if (selectedTool === 'removeBackground') {
      onBeginRemoveBg({ threshold, contiguous });
    }
  }, [selectedTool, threshold, contiguous, onBeginRemoveBg, imageSrc]);

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

  const toolButtonClass = 'px-3 h-9 text-sm font-medium rounded-md transition-colors';
  const removalActionButtonClass = 'flex items-center gap-2 h-9 px-3 rounded-md text-sm font-medium transition-colors';

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 z-30 px-2"
      style={{ bottom: isTimelineCollapsed ? '1rem' : 'calc(12rem + 1rem)' }}
    >
      <div
        className="inline-flex w-fit max-w-[min(920px,calc(100vw-2rem))] flex-wrap items-center gap-3 sm:gap-4 bg-[var(--ui-panel-bg)] backdrop-blur-lg shadow-xl border border-[var(--ui-panel-border)] rounded-xl px-3 py-2 text-[var(--text-primary)] transition-all duration-300 ease-in-out"
      >
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <div className="flex bg-[var(--ui-element-bg)] rounded-lg p-1">
            <button
              type="button"
              aria-pressed={selectedTool === 'crop'}
              onClick={() => handleSelectTool('crop')}
              className={`${toolButtonClass} ${
                selectedTool === 'crop'
                  ? 'bg-[var(--accent-bg)] text-[var(--accent-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]'
              }`}
            >
              {t('cropToolCrop')}
            </button>
            <button
              type="button"
              aria-pressed={selectedTool === 'removeBackground'}
              onClick={() => handleSelectTool('removeBackground')}
              className={`${toolButtonClass} ${
                selectedTool === 'removeBackground'
                  ? 'bg-[var(--accent-bg)] text-[var(--accent-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]'
              }`}
            >
              {t('cropToolRemoveBg')}
            </button>
          </div>

          {selectedTool === 'removeBackground' && (
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 sm:border-l sm:border-[var(--ui-separator)] sm:pl-4">
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <Switch.Group as="div" className="flex items-center gap-2">
                  <Switch.Label className="text-sm font-medium text-[var(--text-primary)] whitespace-nowrap">
                    {t('contiguous')}
                  </Switch.Label>
                  <Switch
                    checked={contiguous}
                    onChange={setContiguous}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2 focus:ring-offset-[var(--ui-panel-bg)] ${
                      contiguous
                        ? 'bg-[var(--accent-bg)] border-[var(--accent-primary)]'
                        : 'bg-black/30 border-transparent'
                    }`}
                  >
                    <span className="sr-only">{t('contiguous')}</span>
                    <span
                      className={`${
                        contiguous ? 'translate-x-6' : 'translate-x-1'
                      } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                    />
                  </Switch>
                </Switch.Group>

                <label
                  htmlFor={thresholdId}
                  className="flex flex-col gap-2 text-sm font-medium text-[var(--text-primary)] sm:flex-row sm:items-center sm:gap-3"
                >
                  <span className="whitespace-nowrap">{t('threshold')}</span>
                  <input
                    id={thresholdId}
                    type="range"
                    min={0}
                    max={255}
                    step={1}
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className="themed-slider min-w-[7rem] flex-1 sm:min-w-[9rem] sm:flex-none sm:w-48"
                  />
                </label>
              </div>

              <PanelButton
                type="button"
                variant="unstyled"
                onClick={handleApplyRemove}
                className={`${removalActionButtonClass} mt-2 flex-shrink-0 bg-[var(--accent-bg)] text-[var(--accent-primary)] hover:bg-[var(--accent-bg)] hover:opacity-90 sm:mt-0`}
              >
                {React.cloneElement(ICONS.REMOVE_BG, { className: 'h-4 w-4' })}
                <span>{t('remove')}</span>
              </PanelButton>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
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
    </div>
  );
};
