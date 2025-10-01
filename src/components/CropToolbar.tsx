/**
 * 本文件定义了图片裁剪工具栏组件。
 * 当用户进入裁剪模式时，此工具栏会显示，提供裁剪/抠图模式切换与操作选项。
 */
import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import PanelButton from '@/components/PanelButton';
import { PANEL_CLASSES } from '@/components/panelStyles';
import { ICONS, getTimelinePanelBottomOffset } from '@/constants';
import type { ImageHsvPreviewController } from '@/hooks/useImageHsvPreview';
import type { HsvAdjustment } from '@/lib/image';

interface CropToolbarProps {
  isTimelineCollapsed: boolean;
  cropTool: 'crop' | 'magic-wand' | 'adjust';
  setCropTool: (tool: 'crop' | 'magic-wand' | 'adjust') => void;
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
  imageHsvPreview: Pick<ImageHsvPreviewController, 'beginPreview' | 'updatePreview' | 'commitPreview' | 'cancelPreview'>;
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
  imageHsvPreview,
}) => {
  const { t } = useTranslation();
  const { beginPreview, updatePreview, commitPreview, cancelPreview } = imageHsvPreview;
  const isAdjustTool = cropTool === 'adjust';
  const [h, setH] = useState(0);
  const [s, setS] = useState(0);
  const [v, setV] = useState(0);
  const latestAdjustmentRef = useRef<HsvAdjustment>({ h: 0, s: 0, v: 0 });
  const previewReadyRef = useRef<Promise<boolean> | null>(null);

  useEffect(() => {
    latestAdjustmentRef.current = { h, s, v };
  }, [h, s, v]);

  const ensurePreview = useCallback(() => {
    if (!previewReadyRef.current) {
      previewReadyRef.current = beginPreview().catch(error => {
        console.error('Failed to begin HSV preview', error);
        previewReadyRef.current = null;
        return false;
      });
    }
    return previewReadyRef.current;
  }, [beginPreview]);

  const resetAdjustments = useCallback(() => {
    previewReadyRef.current = null;
    latestAdjustmentRef.current = { h: 0, s: 0, v: 0 };
    setH(0);
    setS(0);
    setV(0);
  }, []);

  const createSliderHandler = useCallback(
    (applyFraction: (fraction: number, current: { h: number; s: number; v: number }) => { h: number; s: number; v: number }) =>
      (e: React.PointerEvent<HTMLDivElement>) => {
        if (e.button !== 0) return;
        const slider = e.currentTarget;
        slider.setPointerCapture(e.pointerId);
        const rect = slider.getBoundingClientRect();
        const beginPromise = ensurePreview();

        const updateFromEvent = (clientX: number) => {
          const clamped = Math.max(0, Math.min(clientX - rect.left, rect.width));
          const fraction = rect.width === 0 ? 0 : clamped / rect.width;
          const current = {
            h: typeof latestAdjustmentRef.current.h === 'number' ? latestAdjustmentRef.current.h : h,
            s: typeof latestAdjustmentRef.current.s === 'number' ? latestAdjustmentRef.current.s : s,
            v: typeof latestAdjustmentRef.current.v === 'number' ? latestAdjustmentRef.current.v : v,
          };
          const next = applyFraction(fraction, current);
          setH(next.h);
          setS(next.s);
          setV(next.v);
          latestAdjustmentRef.current = next;

          void (async () => {
            const ready = await beginPromise;
            if (!ready) {
              if (previewReadyRef.current === beginPromise) {
                previewReadyRef.current = null;
              }
              return;
            }
            try {
              await updatePreview(next);
            } catch (error) {
              console.error('Failed to update HSV preview', error);
            }
          })();
        };

        updateFromEvent(e.nativeEvent.clientX);

        const handleMove = (event: PointerEvent) => updateFromEvent(event.clientX);
        const handleUp = () => {
          if (slider.hasPointerCapture?.(e.pointerId)) {
            slider.releasePointerCapture(e.pointerId);
          }
          document.removeEventListener('pointermove', handleMove);
          document.removeEventListener('pointerup', handleUp);
          document.removeEventListener('pointercancel', handleUp);
        };

        document.addEventListener('pointermove', handleMove);
        document.addEventListener('pointerup', handleUp);
        document.addEventListener('pointercancel', handleUp);
      },
    [ensurePreview, h, s, v, updatePreview],
  );

  const handleConfirm = useCallback(async () => {
    const pending = previewReadyRef.current;
    if (pending) {
      try {
        const ready = await pending;
        if (ready) {
          const finalAdjustment = latestAdjustmentRef.current;
          await commitPreview({
            h: typeof finalAdjustment.h === 'number' ? finalAdjustment.h : 0,
            s: typeof finalAdjustment.s === 'number' ? finalAdjustment.s : 0,
            v: typeof finalAdjustment.v === 'number' ? finalAdjustment.v : 0,
          });
        }
      } catch (error) {
        console.error('Failed to commit HSV preview', error);
      }
    }
    resetAdjustments();
    confirmCrop();
  }, [commitPreview, confirmCrop, resetAdjustments]);

  const handleCancel = useCallback(async () => {
    try {
      await cancelPreview();
    } catch (error) {
      console.error('Failed to cancel HSV preview', error);
    }
    resetAdjustments();
    cancelCrop();
  }, [cancelPreview, cancelCrop, resetAdjustments]);

  useEffect(() => {
    if (!isAdjustTool) {
      resetAdjustments();
      void cancelPreview().catch(error => {
        console.error('Failed to cancel HSV preview', error);
      });
    }
  }, [isAdjustTool, cancelPreview, resetAdjustments]);

  useEffect(() => () => {
    previewReadyRef.current = null;
    void cancelPreview();
  }, [cancelPreview]);

  const hsvTitle = t('sideToolbar.imageHsv.title');
  const hueLabel = t('sideToolbar.imageHsv.hue');
  const saturationLabel = t('sideToolbar.imageHsv.saturation');
  const valueLabel = t('sideToolbar.imageHsv.value');

  const hPos = ((h + 180) / 360) * 100;
  const sPos = ((s + 100) / 200) * 100;
  const vPos = ((v + 100) / 200) * 100;
  const baseHue = (h + 360) % 360;
  const baseS = Math.min(Math.max(0, 100 + s), 200) / 2;
  const baseV = Math.min(Math.max(0, 100 + v), 200) / 2;
  const hueBg = 'linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))';
  const satBg = `linear-gradient(to right, hsl(${baseHue},0%,${baseV}%), hsl(${baseHue},100%,${baseV}%))`;
  const valBg = `linear-gradient(to right, hsl(${baseHue},${baseS}%,0%), hsl(${baseHue},${baseS}%,50%), hsl(${baseHue},${baseS}%,100%))`;

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
          <PanelButton
            type="button"
            variant="unstyled"
            className={`${segmentedButtonBase} ${
              cropTool === 'adjust'
                ? 'bg-[var(--accent-bg)] text-[var(--accent-primary)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]'
            }`}
            onClick={() => setCropTool('adjust')}
            aria-pressed={cropTool === 'adjust'}
            title={hsvTitle}
          >
            {ICONS.HSV}
            <span>{hsvTitle}</span>
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
            {cropSelectionMode === 'brush' && (
              <label
                className="flex items-center gap-2 text-sm text-[var(--text-secondary)]"
                htmlFor="magic-wand-brush-size"
              >
                {t('cropMagicWandBrushSize')}
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
              </label>
            )}

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

      {isAdjustTool && (
        <div className="w-full rounded-xl border border-[var(--ui-panel-border)] bg-[var(--ui-element-bg)] p-3 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            {ICONS.HSV}
            <span>{hsvTitle}</span>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">{hueLabel}</label>
              <div
                className="relative h-4 cursor-pointer"
                onPointerDown={createSliderHandler((fraction, current) => ({
                  h: Math.round(fraction * 360) - 180,
                  s: current.s,
                  v: current.v,
                }))}
              >
                <div className="absolute top-1/2 h-2 w-full -translate-y-1/2 rounded-lg" style={{ background: hueBg }} />
                <div
                  className="absolute top-1/2 h-4 w-4 -translate-y-1/2 -translate-x-1/2 rounded-full bg-white shadow-md ring-1 ring-white/20"
                  style={{ left: `${hPos}%` }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">{saturationLabel}</label>
              <div
                className="relative h-4 cursor-pointer"
                onPointerDown={createSliderHandler((fraction, current) => ({
                  h: current.h,
                  s: Math.round(fraction * 200) - 100,
                  v: current.v,
                }))}
              >
                <div className="absolute top-1/2 h-2 w-full -translate-y-1/2 rounded-lg" style={{ background: satBg }} />
                <div
                  className="absolute top-1/2 h-4 w-4 -translate-y-1/2 -translate-x-1/2 rounded-full shadow-md ring-1 ring-white/20"
                  style={{ left: `${sPos}%`, backgroundColor: `hsl(${baseHue}, ${sPos}%, ${baseV}%)` }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">{valueLabel}</label>
              <div
                className="relative h-4 cursor-pointer"
                onPointerDown={createSliderHandler((fraction, current) => ({
                  h: current.h,
                  s: current.s,
                  v: Math.round(fraction * 200) - 100,
                }))}
              >
                <div className="absolute top-1/2 h-2 w-full -translate-y-1/2 rounded-lg" style={{ background: valBg }} />
                <div
                  className="absolute top-1/2 h-4 w-4 -translate-y-1/2 -translate-x-1/2 rounded-full shadow-md ring-1 ring-white/20"
                  style={{ left: `${vPos}%`, backgroundColor: `hsl(${baseHue}, ${baseS}%, ${vPos}%)` }}
                />
              </div>
            </div>
          </div>
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
          onClick={handleCancel}
          variant="unstyled"
          className={`${textButtonBase} text-[var(--danger-text)] hover:bg-[var(--danger-bg)]`}
        >
          {ICONS.X}
          <span>{t('cancel')}</span>
        </PanelButton>
        <PanelButton
          type="button"
          title={t('confirm')}
          onClick={handleConfirm}
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
