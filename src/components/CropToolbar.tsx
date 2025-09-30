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
  cropMagicWandOptions: { threshold: number; contiguous: boolean; featherRadius: number };
  setCropMagicWandOptions: (opts: Partial<{ threshold: number; contiguous: boolean; featherRadius: number }>) => void;
  cropSelectionMode: 'magic-wand' | 'freehand' | 'polygon' | 'brush';
  setCropSelectionMode: (mode: 'magic-wand' | 'freehand' | 'polygon' | 'brush') => void;
  cropBrushSize: number;
  setCropBrushSize: (size: number) => void;
  cropSelectionOperation: 'add' | 'subtract' | 'replace';
  setCropSelectionOperation: (op: 'add' | 'subtract' | 'replace') => void;
  cropSelectionContours: Array<{ d: string; inner: boolean }> | null;
  invertMagicWandSelection: () => void;
  applyMagicWandSelection: () => void;
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
  cropSelectionMode,
  setCropSelectionMode,
  cropBrushSize,
  setCropBrushSize,
  cropSelectionOperation,
  setCropSelectionOperation,
  cropSelectionContours,
  invertMagicWandSelection,
  applyMagicWandSelection,
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

  const handleFeatherRadiusChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const parsedValue = Number(event.target.value);

    if (Number.isNaN(parsedValue)) {
      return;
    }

    const clampedValue = Math.min(100, Math.max(0, parsedValue));
    setCropMagicWandOptions({ featherRadius: clampedValue });
  };

  const brushSizeMin = 4;
  const brushSizeMax = 200;
  const clampBrushSize = (value: number) => Math.min(brushSizeMax, Math.max(brushSizeMin, Math.round(value)));
  const handleBrushSizeChange = (value: number) => {
    if (Number.isNaN(value)) {
      return;
    }
    setCropBrushSize(clampBrushSize(value));
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
            title={t('cropCutout')}
          >
            {ICONS.TRACE_IMAGE}
            <span>{t('cropCutout')}</span>
          </PanelButton>
        </div>
      </div>
      
      {cropTool === 'magic-wand' && (
        <div className="flex w-full flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className={PANEL_CLASSES.segmentGroup}>
              <PanelButton
              type="button"
              variant="unstyled"
              className={`${segmentedButtonBase} ${
                cropSelectionMode === 'magic-wand'
                  ? 'bg-[var(--accent-bg)] text-[var(--accent-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]'
              }`}
              onClick={() => setCropSelectionMode('magic-wand')}
              aria-pressed={cropSelectionMode === 'magic-wand'}
              title={t('cropMagicWand')}
            >
              {ICONS.TRACE_IMAGE}
              <span>{t('cropMagicWand')}</span>
            </PanelButton>
            <PanelButton
              type="button"
              variant="unstyled"
              className={`${segmentedButtonBase} ${
                cropSelectionMode === 'brush'
                  ? 'bg-[var(--accent-bg)] text-[var(--accent-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]'
              }`}
              onClick={() => setCropSelectionMode('brush')}
              aria-pressed={cropSelectionMode === 'brush'}
              title={t('cropMagicWandBrush')}
            >
              {ICONS.BRUSH}
              <span>{t('cropMagicWandBrush')}</span>
            </PanelButton>
            <PanelButton
              type="button"
              variant="unstyled"
              className={`${segmentedButtonBase} ${
                cropSelectionMode === 'freehand'
                  ? 'bg-[var(--accent-bg)] text-[var(--accent-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]'
              }`}
              onClick={() => setCropSelectionMode('freehand')}
              aria-pressed={cropSelectionMode === 'freehand'}
              title={t('cropMagicWandFreehand')}
            >
              {ICONS.LASSO}
              <span>{t('cropMagicWandFreehand')}</span>
            </PanelButton>
            <PanelButton
              type="button"
              variant="unstyled"
              className={`${segmentedButtonBase} ${
                cropSelectionMode === 'polygon'
                  ? 'bg-[var(--accent-bg)] text-[var(--accent-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]'
              }`}
              onClick={() => setCropSelectionMode('polygon')}
              aria-pressed={cropSelectionMode === 'polygon'}
              title={t('cropMagicWandPolygon')}
            >
              {ICONS.POLYGON}
              <span>{t('cropMagicWandPolygon')}</span>
            </PanelButton>
          </div>

          {cropSelectionMode === 'brush' && (
            <div className="flex items-center gap-2">
              <label
                className="text-sm text-[var(--text-secondary)]"
                htmlFor="magic-wand-brush-size"
              >
                {t('cropMagicWandBrushSize')}
              </label>
              <div className={`${PANEL_CLASSES.inputWrapper} w-20`}>
                <input
                  id="magic-wand-brush-size"
                  type="number"
                  min={brushSizeMin}
                  max={brushSizeMax}
                  value={cropBrushSize}
                  onChange={(event) => handleBrushSizeChange(Number(event.target.value))}
                  inputMode="numeric"
                  aria-label={t('cropMagicWandBrushSize')}
                  className={`${PANEL_CLASSES.input} hide-spinners`}
                />
                <span className={PANEL_CLASSES.inputSuffix}>px</span>
              </div>
            </div>
          )}

          <div className={PANEL_CLASSES.segmentGroup}>
            <PanelButton
              type="button"
              variant="unstyled"
              className={`${segmentedButtonBase} ${
                cropSelectionOperation === 'add'
                  ? 'bg-[var(--accent-bg)] text-[var(--accent-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]'
              }`}
              onClick={() => setCropSelectionOperation('add')}
              aria-pressed={cropSelectionOperation === 'add'}
              title={t('cropSelectionAdd')}
            >
              <span className="font-semibold">＋</span>
              <span>{t('cropSelectionAdd')}</span>
            </PanelButton>
            <PanelButton
              type="button"
              variant="unstyled"
              className={`${segmentedButtonBase} ${
                cropSelectionOperation === 'replace'
                  ? 'bg-[var(--accent-bg)] text-[var(--accent-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]'
              }`}
              onClick={() => setCropSelectionOperation('replace')}
              aria-pressed={cropSelectionOperation === 'replace'}
              title={t('cropSelectionReset')}
            >
              <span className="font-semibold">⟳</span>
              <span>{t('cropSelectionReset')}</span>
            </PanelButton>
            <PanelButton
              type="button"
              variant="unstyled"
              className={`${segmentedButtonBase} ${
                cropSelectionOperation === 'subtract'
                  ? 'bg-[var(--accent-bg)] text-[var(--accent-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]'
              }`}
              onClick={() => setCropSelectionOperation('subtract')}
              aria-pressed={cropSelectionOperation === 'subtract'}
              title={t('cropSelectionSubtract')}
            >
              <span className="font-semibold">－</span>
              <span>{t('cropSelectionSubtract')}</span>
            </PanelButton>
          </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label
              className="flex items-center gap-2 text-sm text-[var(--text-secondary)]"
              htmlFor="magic-wand-feather-radius"
            >
              {t('featherRadius')}
              <div className={`${PANEL_CLASSES.inputWrapper} w-16`}>
                <input
                  id="magic-wand-feather-radius"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={cropMagicWandOptions.featherRadius}
                  onChange={handleFeatherRadiusChange}
                  inputMode="numeric"
                  className={`${PANEL_CLASSES.input} hide-spinners text-right`}
                />
              </div>
            </label>

            {cropSelectionMode === 'magic-wand' && (
              <>
                <label
                  className="flex items-center gap-2 text-sm text-[var(--text-secondary)]"
                  htmlFor="magic-wand-threshold"
                >
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
              </>
            )}
          </div>
        </div>
      )}

      {cropTool === 'magic-wand' && (
        <div className="flex flex-wrap items-center gap-2">
          <PanelButton
            type="button"
            variant="unstyled"
            onClick={applyMagicWandSelection}
            disabled={!hasSelection}
            className={`${textButtonBase} bg-[var(--accent-bg)] text-[var(--accent-primary)] hover:opacity-90`}
          >
            {ICONS.CHECK}
            <span>{t('subtractSelection')}</span>
          </PanelButton>
          <PanelButton
            type="button"
            variant="unstyled"
            onClick={cutMagicWandSelection}
            disabled={!hasSelection}
            className={`${textButtonBase} bg-[var(--accent-bg)] text-[var(--accent-primary)] hover:opacity-90`}
          >
            {ICONS.CUT}
            <span>{t('cutSelection')}</span>
          </PanelButton>
          <PanelButton
            type="button"
            variant="unstyled"
            onClick={invertMagicWandSelection}
            className={`${textButtonBase} bg-[var(--accent-bg)] text-[var(--accent-primary)] hover:opacity-90`}
            title={t('cropSelectionInvert')}
          >
            <span className="font-semibold">⇆</span>
            <span>{t('cropSelectionInvert')}</span>
          </PanelButton>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        {cropTool === 'crop' && (
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
        )}
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
