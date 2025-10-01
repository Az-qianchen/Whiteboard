import React, { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Popover, Transition } from '@headlessui/react';
import { ICONS } from '@/constants';
import PanelButton from '@/components/PanelButton';
import type { HsvAdjustment } from '@/lib/image';

interface ImageHsvPopoverProps {
  beginPreview: () => Promise<boolean>;
  updatePreview: (adj: HsvAdjustment) => Promise<void>;
  commitPreview: (adj: HsvAdjustment) => Promise<void>;
  cancelPreview: () => Promise<void>;
  disabled?: boolean;
}

const DEFAULT_ADJUSTMENT: HsvAdjustment = { h: 0, s: 0, v: 0 };

interface PopoverContentProps extends ImageHsvPopoverProps {
  open: boolean;
  close: () => void;
  title: string;
  hueLabel: string;
  saturationLabel: string;
  valueLabel: string;
  confirmLabel: string;
  cancelLabel: string;
}

const ImageHsvPopoverContent: React.FC<PopoverContentProps> = ({
  open,
  close,
  beginPreview,
  updatePreview,
  commitPreview,
  cancelPreview,
  title,
  hueLabel,
  saturationLabel,
  valueLabel,
  confirmLabel,
  cancelLabel,
}) => {
  const [h, setH] = useState(0);
  const [s, setS] = useState(0);
  const [v, setV] = useState(0);
  const beginPromiseRef = useRef<Promise<boolean> | null>(null);
  const latestAdjustmentRef = useRef<HsvAdjustment>({ ...DEFAULT_ADJUSTMENT });
  const committedRef = useRef(false);

  const ensurePreviewReady = useCallback(() => {
    if (!beginPromiseRef.current) {
      beginPromiseRef.current = beginPreview().catch(error => {
        console.error('Failed to begin HSV preview', error);
        return false;
      });
    }
    return beginPromiseRef.current;
  }, [beginPreview]);

  const resetState = useCallback(() => {
    setH(0);
    setS(0);
    setV(0);
    latestAdjustmentRef.current = { ...DEFAULT_ADJUSTMENT };
  }, []);

  useEffect(() => {
    if (open) {
      committedRef.current = false;
      beginPromiseRef.current = null;
      resetState();
      void ensurePreviewReady();
      return;
    }

    beginPromiseRef.current = null;
    if (!committedRef.current) {
      void cancelPreview();
    }
    committedRef.current = false;
    resetState();
  }, [open, cancelPreview, ensurePreviewReady, resetState]);

  const applyAdjustment = useCallback((next: HsvAdjustment) => {
    setH(next.h ?? 0);
    setS(next.s ?? 0);
    setV(next.v ?? 0);
    latestAdjustmentRef.current = {
      h: typeof next.h === 'number' ? next.h : 0,
      s: typeof next.s === 'number' ? next.s : 0,
      v: typeof next.v === 'number' ? next.v : 0,
    };

    void (async () => {
      const ready = await ensurePreviewReady();
      if (!ready) {
        return;
      }
      try {
        await updatePreview(latestAdjustmentRef.current);
      } catch (error) {
        console.error('Failed to update HSV preview', error);
      }
    })();
  }, [ensurePreviewReady, updatePreview]);

  const createSliderHandler = useCallback((
    applyFraction: (
      fraction: number,
      current: { h: number; s: number; v: number },
    ) => { h: number; s: number; v: number },
  ) => (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }
    const slider = event.currentTarget;
    slider.setPointerCapture(event.pointerId);
    const rect = slider.getBoundingClientRect();

    const updateFromClientX = (clientX: number) => {
      const clamped = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const fraction = rect.width === 0 ? 0 : clamped / rect.width;
      const current = latestAdjustmentRef.current;
      const next = applyFraction(fraction, {
        h: typeof current.h === 'number' ? current.h : h,
        s: typeof current.s === 'number' ? current.s : s,
        v: typeof current.v === 'number' ? current.v : v,
      });
      applyAdjustment(next);
    };

    updateFromClientX(event.nativeEvent.clientX);

    const handleMove = (ev: PointerEvent) => updateFromClientX(ev.clientX);
    const handleUp = () => {
      slider.releasePointerCapture(event.pointerId);
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerup', handleUp);
      document.removeEventListener('pointercancel', handleUp);
    };

    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerup', handleUp);
    document.addEventListener('pointercancel', handleUp);
  }, [applyAdjustment, h, s, v]);

  const handleCancel = useCallback(() => {
    committedRef.current = false;
    void cancelPreview();
    close();
  }, [cancelPreview, close]);

  const handleConfirm = useCallback(async () => {
    const hasChanges = h !== 0 || s !== 0 || v !== 0;
    if (!hasChanges) {
      close();
      return;
    }

    try {
      const ready = await ensurePreviewReady();
      if (!ready) {
        return;
      }
      await commitPreview(latestAdjustmentRef.current);
      committedRef.current = true;
      close();
    } catch (error) {
      console.error('Failed to commit HSV preview', error);
    }
  }, [close, commitPreview, ensurePreviewReady, h, s, v]);

  const hPos = ((h + 180) / 360) * 100;
  const sPos = ((s + 100) / 200) * 100;
  const vPos = ((v + 100) / 200) * 100;
  const baseHue = (h + 360) % 360;
  const baseS = Math.min(Math.max(0, 100 + s), 200) / 2;
  const baseV = Math.min(Math.max(0, 100 + v), 200) / 2;

  const hueBg = 'linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))';
  const satBg = `linear-gradient(to right, hsl(${baseHue},0%,${baseV}%), hsl(${baseHue},100%,${baseV}%))`;
  const valBg = `linear-gradient(to right, hsl(${baseHue},${baseS}%,0%), hsl(${baseHue},${baseS}%,50%), hsl(${baseHue},${baseS}%,100%))`;
  const hasChanges = h !== 0 || s !== 0 || v !== 0;

  return (
    <div className="space-y-5">
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-center text-[var(--text-primary)]">{title}</h3>
        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text-primary)]">{hueLabel}</label>
            <div
              className="relative h-4 cursor-pointer"
              onPointerDown={createSliderHandler((fraction, current) => ({
                h: Math.round(fraction * 360) - 180,
                s: current.s,
                v: current.v,
              }))}
            >
              <div className="w-full h-2 rounded-lg absolute top-1/2 -translate-y-1/2" style={{ background: hueBg }} />
              <div
                className="absolute w-4 h-4 -translate-y-1/2 -translate-x-1/2 top-1/2 rounded-full bg-white shadow-md ring-1 ring-white/20"
                style={{ left: `${hPos}%` }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text-primary)]">{saturationLabel}</label>
            <div
              className="relative h-4 cursor-pointer"
              onPointerDown={createSliderHandler((fraction, current) => ({
                h: current.h,
                s: Math.round(fraction * 200) - 100,
                v: current.v,
              }))}
            >
              <div className="w-full h-2 rounded-lg absolute top-1/2 -translate-y-1/2" style={{ background: satBg }} />
              <div
                className="absolute w-4 h-4 -translate-y-1/2 -translate-x-1/2 top-1/2 rounded-full shadow-md ring-1 ring-white/20"
                style={{ left: `${sPos}%`, backgroundColor: `hsl(${baseHue}, ${sPos}%, ${baseV}%)` }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text-primary)]">{valueLabel}</label>
            <div
              className="relative h-4 cursor-pointer"
              onPointerDown={createSliderHandler((fraction, current) => ({
                h: current.h,
                s: current.s,
                v: Math.round(fraction * 200) - 100,
              }))}
            >
              <div className="w-full h-2 rounded-lg absolute top-1/2 -translate-y-1/2" style={{ background: valBg }} />
              <div
                className="absolute w-4 h-4 -translate-y-1/2 -translate-x-1/2 top-1/2 rounded-full shadow-md ring-1 ring-white/20"
                style={{ left: `${vPos}%`, backgroundColor: `hsl(${baseHue}, ${baseS}%, ${vPos}%)` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleCancel}
          className="flex-1 h-9 rounded-md bg-[var(--ui-element-bg)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)] transition-colors"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!hasChanges}
          className="flex-1 h-9 rounded-md text-sm font-medium transition-colors bg-[var(--accent-bg)] text-[var(--accent-primary)] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
};

export const ImageHsvPopover: React.FC<ImageHsvPopoverProps> = (props) => {
  const { disabled } = props;
  const { t } = useTranslation();
  const title = t('sideToolbar.imageHsv.title');
  const hueLabel = t('sideToolbar.imageHsv.hue');
  const saturationLabel = t('sideToolbar.imageHsv.saturation');
  const valueLabel = t('sideToolbar.imageHsv.value');
  const confirmLabel = t('confirm');
  const cancelLabel = t('cancel');

  const panelWidthClass = 'w-72';

  return (
    <div className="flex flex-col items-center w-[34px]" title={title}>
      <Popover className="relative">
        {({ open, close }) => (
          <>
            <Popover.Button
              as={PanelButton}
              variant="unstyled"
              disabled={disabled}
              className={`flex items-center justify-center h-[34px] w-[34px] rounded-lg transition-colors ${
                disabled
                  ? 'opacity-40 cursor-not-allowed'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]'
              }`}
              title={title}
            >
              {ICONS.HSV}
            </Popover.Button>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-200"
              enterFrom="opacity-0 translate-y-1"
              enterTo="opacity-100 translate-y-0"
              leave="transition ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 translate-y-1"
            >
              {open && (
                <Popover.Panel className={`absolute bottom-full mb-3 left-1/2 -translate-x-1/2 ${panelWidthClass} bg-[var(--ui-popover-bg)] backdrop-blur-lg rounded-xl shadow-lg border border-[var(--ui-panel-border)] z-30 p-5`}>
                  <ImageHsvPopoverContent
                    {...props}
                    open={open}
                    close={close}
                    title={title}
                    hueLabel={hueLabel}
                    saturationLabel={saturationLabel}
                    valueLabel={valueLabel}
                    confirmLabel={confirmLabel}
                    cancelLabel={cancelLabel}
                  />
                </Popover.Panel>
              )}
            </Transition>
          </>
        )}
      </Popover>
    </div>
  );
};
