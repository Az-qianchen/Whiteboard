import React, { Fragment, useEffect, useRef, useState } from 'react';
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
}

export const ImageHsvPopover: React.FC<ImageHsvPopoverProps> = ({ beginPreview, updatePreview, commitPreview, cancelPreview, beginCoalescing, endCoalescing }) => {
  const [h, setH] = useState(0);
  const [s, setS] = useState(0);
  const [v, setV] = useState(0);
  const latestAdjustmentRef = useRef<HsvAdjustment>({ h: 0, s: 0, v: 0 });
  const { t } = useTranslation();
  const title = t('sideToolbar.imageHsv.title');
  const hueLabel = t('sideToolbar.imageHsv.hue');
  const saturationLabel = t('sideToolbar.imageHsv.saturation');
  const valueLabel = t('sideToolbar.imageHsv.value');

  useEffect(() => {
    latestAdjustmentRef.current = { h, s, v };
  }, [h, s, v]);

  const createSliderHandler = (applyFraction: (fraction: number, current: { h: number; s: number; v: number }) => { h: number; s: number; v: number }) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    beginCoalescing();
    const slider = e.currentTarget;
    slider.setPointerCapture(e.pointerId);
    const rect = slider.getBoundingClientRect();

    const beginPromise = beginPreview().catch((error) => {
      console.error('Failed to begin HSV preview', error);
      return false;
    });

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
      const finalAdjustment = latestAdjustmentRef.current;
      void (async () => {
        let shouldCancelPreview = true;
        try {
          const ready = await beginPromise;
          if (ready) {
            await commitPreview({
              h: typeof finalAdjustment.h === 'number' ? finalAdjustment.h : h,
              s: typeof finalAdjustment.s === 'number' ? finalAdjustment.s : s,
              v: typeof finalAdjustment.v === 'number' ? finalAdjustment.v : v,
            });
            shouldCancelPreview = false;
          }
        } catch (error) {
          console.error('Failed to commit HSV preview', error);
        } finally {
          if (shouldCancelPreview) {
            try {
              await cancelPreview();
            } catch (cancelError) {
              console.error('Failed to clear HSV preview state', cancelError);
            }
          }
          endCoalescing();
        }
      })();
    };

    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerup', handleUp);
    document.addEventListener('pointercancel', handleUp);
  };

  const hPos = ((h + 180) / 360) * 100;
  const sPos = ((s + 100) / 200) * 100;
  const vPos = ((v + 100) / 200) * 100;
  const baseHue = (h + 360) % 360;
  const baseS = Math.min(Math.max(0, 100 + s), 200) / 2;
  const baseV = Math.min(Math.max(0, 100 + v), 200) / 2;
  const hueBg = 'linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))';
  const satBg = `linear-gradient(to right, hsl(${baseHue},0%,${baseV}%), hsl(${baseHue},100%,${baseV}%))`;
  const valBg = `linear-gradient(to right, hsl(${baseHue},${baseS}%,0%), hsl(${baseHue},${baseS}%,50%), hsl(${baseHue},${baseS}%,100%))`;

  return (
    <div className="flex flex-col items-center w-14" title={title}>
      <Popover className="relative">
        <Popover.Button
          as={PanelButton}
          variant="unstyled"
          className="p-2 h-9 w-9 rounded-lg flex items-center justify-center transition-colors text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]"
          title={title}
        >
          {ICONS.HSV}
        </Popover.Button>
        <Transition as={Fragment} enter="transition ease-out duration-200" enterFrom="opacity-0 translate-y-1" enterTo="opacity-100 translate-y-0" leave="transition ease-in duration-150" leaveFrom="opacity-100 translate-y-0" leaveTo="opacity-0 translate-y-1">
          <Popover.Panel className="absolute bottom-0 mb-0 right-full mr-2 w-64 bg-[var(--ui-popover-bg)] backdrop-blur-lg rounded-xl shadow-lg border border-[var(--ui-panel-border)] z-20 p-4">
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
                  <div className="absolute w-4 h-4 -translate-y-1/2 -translate-x-1/2 top-1/2 rounded-full bg-white shadow-md ring-1 ring-white/20" style={{ left: `${hPos}%` }} />
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
                  <div className="absolute w-4 h-4 -translate-y-1/2 -translate-x-1/2 top-1/2 rounded-full shadow-md ring-1 ring-white/20" style={{ left: `${sPos}%`, backgroundColor: `hsl(${baseHue}, ${sPos}%, ${baseV}%)` }} />
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
                  <div className="absolute w-4 h-4 -translate-y-1/2 -translate-x-1/2 top-1/2 rounded-full shadow-md ring-1 ring-white/20" style={{ left: `${vPos}%`, backgroundColor: `hsl(${baseHue}, ${baseS}%, ${vPos}%)` }} />
                </div>
              </div>
            </div>
          </Popover.Panel>
        </Transition>
      </Popover>
    </div>
  );
};
