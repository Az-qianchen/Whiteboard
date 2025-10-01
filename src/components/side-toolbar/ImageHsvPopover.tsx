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
  beginCoalescing: () => void;
  endCoalescing: () => void;
  containerClassName?: string;
  buttonClassName?: string;
  panelClassName?: string;
}

interface PopoverBodyProps {
  open: boolean;
  close: () => void;
  title: string;
  hueLabel: string;
  saturationLabel: string;
  valueLabel: string;
  confirmLabel: string;
  cancelLabel: string;
  h: number;
  s: number;
  v: number;
  setH: (value: number) => void;
  setS: (value: number) => void;
  setV: (value: number) => void;
  latestAdjustmentRef: React.MutableRefObject<HsvAdjustment>;
  ensurePreview: () => Promise<boolean>;
  handleConfirm: (close: () => void) => Promise<void>;
  handleCancel: (close: () => void) => Promise<void>;
  handleAutoClose: () => Promise<void>;
  isPreviewActive: boolean;
  setIsPreviewActive: (active: boolean) => void;
  beginCoalescing: () => void;
  endCoalescing: () => void;
  updatePreview: (adj: HsvAdjustment) => Promise<void>;
  buttonClassName?: string;
  panelClassName?: string;
}

const PopoverBody: React.FC<PopoverBodyProps> = ({
  open,
  close,
  title,
  hueLabel,
  saturationLabel,
  valueLabel,
  confirmLabel,
  cancelLabel,
  beginCoalescing,
  endCoalescing,
  updatePreview,
  ensurePreview,
  h,
  s,
  v,
  setH,
  setS,
  setV,
  latestAdjustmentRef,
  handleConfirm,
  handleCancel,
  handleAutoClose,
  buttonClassName,
  panelClassName,
  setIsPreviewActive,
}) => {
  const previewPromiseRef = useRef<Promise<boolean> | null>(null);
  const previousOpenRef = useRef(open);

  useEffect(() => {
    if (previousOpenRef.current && !open) {
      void handleAutoClose();
    }
    previousOpenRef.current = open;
  }, [handleAutoClose, open]);

  useEffect(() => {
    previewPromiseRef.current = null;
  }, [open]);

  const ensurePreviewOnce = useCallback(() => {
    if (!previewPromiseRef.current) {
      previewPromiseRef.current = ensurePreview().then((ready) => {
        if (!ready) {
          previewPromiseRef.current = null;
        }
        return ready;
      });
    }
    return previewPromiseRef.current;
  }, [ensurePreview]);

  const createSliderHandler = useCallback(
    (
      applyFraction: (
        fraction: number,
        current: { h: number; s: number; v: number },
      ) => { h: number; s: number; v: number },
    ) =>
      (e: React.PointerEvent<HTMLDivElement>) => {
        if (e.button !== 0) return;
        beginCoalescing();
        const slider = e.currentTarget;
        slider.setPointerCapture(e.pointerId);
        const rect = slider.getBoundingClientRect();

        const beginPromise = ensurePreviewOnce();

        const updateFromEvent = (clientX: number) => {
          const clamped = Math.max(0, Math.min(clientX - rect.left, rect.width));
          const fraction = rect.width === 0 ? 0 : clamped / rect.width;
          const next = applyFraction(fraction, {
            h: typeof latestAdjustmentRef.current.h === 'number' ? latestAdjustmentRef.current.h : h,
            s: typeof latestAdjustmentRef.current.s === 'number' ? latestAdjustmentRef.current.s : s,
            v: typeof latestAdjustmentRef.current.v === 'number' ? latestAdjustmentRef.current.v : v,
          });
          setH(next.h);
          setS(next.s);
          setV(next.v);
          latestAdjustmentRef.current = next;

          void (async () => {
            const ready = await beginPromise;
            if (!ready) return;
            try {
              await updatePreview(next);
              setIsPreviewActive(true);
            } catch (error) {
              console.error('Failed to update HSV preview', error);
            }
          })();
        };

        updateFromEvent(e.nativeEvent.clientX);

        const handleMove = (ev: PointerEvent) => updateFromEvent(ev.clientX);
        const handleUp = () => {
          slider.releasePointerCapture(e.pointerId);
          document.removeEventListener('pointermove', handleMove);
          document.removeEventListener('pointerup', handleUp);
          document.removeEventListener('pointercancel', handleUp);
          endCoalescing();
        };

        document.addEventListener('pointermove', handleMove);
        document.addEventListener('pointerup', handleUp);
        document.addEventListener('pointercancel', handleUp);
      },
    [beginCoalescing, endCoalescing, ensurePreviewOnce, h, latestAdjustmentRef, s, setH, setIsPreviewActive, setS, setV, updatePreview, v],
  );

  const triggerClasses =
    buttonClassName ??
    'flex items-center justify-center h-[34px] w-[34px] rounded-lg transition-colors text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]';

  const panelClasses =
    panelClassName ??
    'absolute bottom-0 mb-0 right-full mr-2 w-64 bg-[var(--ui-popover-bg)] backdrop-blur-lg rounded-xl shadow-lg border border-[var(--ui-panel-border)] z-20 p-4';

  const hPos = ((h + 180) / 360) * 100;
  const sPos = ((s + 100) / 200) * 100;
  const vPos = ((v + 100) / 200) * 100;
  const baseHue = (h + 360) % 360;
  const baseS = Math.min(Math.max(0, 100 + s), 200) / 2;
  const baseV = Math.min(Math.max(0, 100 + v), 200) / 2;
  const hueBg = 'linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))';
  const satBg = `linear-gradient(to right, hsl(${baseHue},0%,${baseV}%), hsl(${baseHue},100%,${baseV}%))`;
  const valBg = `linear-gradient(to right, hsl(${baseHue},${baseS}%,0%), hsl(${baseHue},${baseS}%,50%), hsl(${baseHue},${baseS}%,100%))`;
  const hasPendingAdjustment = h !== 0 || s !== 0 || v !== 0;

  return (
    <>
      <Popover.Button
        as={PanelButton}
        variant="unstyled"
        className={triggerClasses}
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
        <Popover.Panel className={panelClasses}>
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-center text-[var(--text-primary)]">{title}</h3>
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
            <div className="flex justify-end gap-2 pt-2">
              <PanelButton
                type="button"
                variant="unstyled"
                className="h-9 px-3 rounded-md bg-[var(--ui-element-bg)] text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]"
                onClick={() => {
                  void handleCancel(close);
                }}
              >
                {cancelLabel}
              </PanelButton>
              <PanelButton
                type="button"
                variant="unstyled"
                className={`h-9 px-3 rounded-md bg-[var(--accent-bg)] text-[var(--accent-primary)] hover:opacity-90 ${
                  hasPendingAdjustment ? '' : 'opacity-60 cursor-not-allowed'
                }`}
                disabled={!hasPendingAdjustment}
                onClick={() => {
                  void handleConfirm(close);
                }}
              >
                {confirmLabel}
              </PanelButton>
            </div>
          </div>
        </Popover.Panel>
      </Transition>
    </>
  );
};

export const ImageHsvPopover: React.FC<ImageHsvPopoverProps> = ({
  beginPreview,
  updatePreview,
  commitPreview,
  cancelPreview,
  beginCoalescing,
  endCoalescing,
  containerClassName,
  buttonClassName,
  panelClassName,
}) => {
  const [h, setH] = useState(0);
  const [s, setS] = useState(0);
  const [v, setV] = useState(0);
  const [isPreviewActive, setIsPreviewActive] = useState(false);
  const latestAdjustmentRef = useRef<HsvAdjustment>({ h: 0, s: 0, v: 0 });
  const skipCloseRef = useRef(false);
  const { t } = useTranslation();
  const title = t('sideToolbar.imageHsv.title');
  const hueLabel = t('sideToolbar.imageHsv.hue');
  const saturationLabel = t('sideToolbar.imageHsv.saturation');
  const valueLabel = t('sideToolbar.imageHsv.value');
  const confirmLabel = t('confirm');
  const cancelLabel = t('cancel');

  useEffect(() => {
    latestAdjustmentRef.current = { h, s, v };
  }, [h, s, v]);

  const ensurePreview = useCallback(async () => {
    try {
      const ready = await beginPreview();
      if (!ready) {
        return false;
      }
      return true;
    } catch (error) {
      console.error('Failed to begin HSV preview', error);
      return false;
    }
  }, [beginPreview]);

  const resetState = useCallback(() => {
    setH(0);
    setS(0);
    setV(0);
    latestAdjustmentRef.current = { h: 0, s: 0, v: 0 };
    setIsPreviewActive(false);
  }, []);

  const cancelPreviewSafe = useCallback(async () => {
    try {
      await cancelPreview();
    } catch (error) {
      console.error('Failed to reset HSV preview', error);
    }
  }, [cancelPreview]);

  const handleConfirm = useCallback(
    async (close: () => void) => {
      const adjustment = latestAdjustmentRef.current;
      const hasPending = adjustment.h !== 0 || adjustment.s !== 0 || adjustment.v !== 0;
      if (!hasPending) {
        skipCloseRef.current = true;
        resetState();
        close();
        return;
      }

      try {
        await commitPreview({
          h: typeof adjustment.h === 'number' ? adjustment.h : 0,
          s: typeof adjustment.s === 'number' ? adjustment.s : 0,
          v: typeof adjustment.v === 'number' ? adjustment.v : 0,
        });
        skipCloseRef.current = true;
        resetState();
        close();
      } catch (error) {
        console.error('Failed to commit HSV preview', error);
        skipCloseRef.current = false;
      }
    },
    [commitPreview, resetState],
  );

  const handleCancel = useCallback(
    async (close: () => void) => {
      if (isPreviewActive) {
        await cancelPreviewSafe();
      }
      skipCloseRef.current = true;
      resetState();
      close();
    },
    [cancelPreviewSafe, isPreviewActive, resetState],
  );

  const handleAutoClose = useCallback(async () => {
    if (skipCloseRef.current) {
      skipCloseRef.current = false;
      return;
    }
    if (isPreviewActive) {
      await cancelPreviewSafe();
    }
    resetState();
  }, [cancelPreviewSafe, isPreviewActive, resetState]);

  return (
    <Popover className={['relative', containerClassName].filter(Boolean).join(' ')}>
      {({ open, close }) => (
        <PopoverBody
          open={open}
          close={close}
          title={title}
          hueLabel={hueLabel}
          saturationLabel={saturationLabel}
          valueLabel={valueLabel}
          confirmLabel={confirmLabel}
          cancelLabel={cancelLabel}
          beginCoalescing={beginCoalescing}
          endCoalescing={endCoalescing}
          updatePreview={updatePreview}
          ensurePreview={ensurePreview}
          h={h}
          s={s}
          v={v}
          setH={setH}
          setS={setS}
          setV={setV}
          latestAdjustmentRef={latestAdjustmentRef}
          handleConfirm={handleConfirm}
          handleCancel={handleCancel}
          handleAutoClose={handleAutoClose}
          buttonClassName={buttonClassName}
          panelClassName={panelClassName}
          isPreviewActive={isPreviewActive}
          setIsPreviewActive={setIsPreviewActive}
        />
      )}
    </Popover>
  );
};
