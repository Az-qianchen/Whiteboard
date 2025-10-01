import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { HsvAdjustment } from '@/lib/image';
import type { ImageHsvPreviewController } from '@/hooks/useImageHsvPreview';

interface ImageHsvAdjusterProps {
  adjustment: Required<Pick<HsvAdjustment, 'h' | 's' | 'v'>>;
  setAdjustment: (next: Required<Pick<HsvAdjustment, 'h' | 's' | 'v'>>) => void;
  preview: Pick<ImageHsvPreviewController, 'beginPreview' | 'updatePreview'>;
  beginCoalescing: () => void;
  endCoalescing: () => void;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const ImageHsvAdjuster: React.FC<ImageHsvAdjusterProps> = ({
  adjustment,
  setAdjustment,
  preview,
  beginCoalescing,
  endCoalescing,
}) => {
  const { t } = useTranslation();
  const latestAdjustmentRef = useRef(adjustment);

  useEffect(() => {
    latestAdjustmentRef.current = adjustment;
  }, [adjustment]);

  const createSliderHandler = (
    applyFraction: (
      fraction: number,
      current: Required<Pick<HsvAdjustment, 'h' | 's' | 'v'>>,
    ) => Required<Pick<HsvAdjustment, 'h' | 's' | 'v'>>,
  ) => (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;

    beginCoalescing();
    const slider = event.currentTarget;
    slider.setPointerCapture(event.pointerId);
    const rect = slider.getBoundingClientRect();

    const beginPromise = preview.beginPreview().catch((error) => {
      console.error('Failed to begin HSV preview', error);
      return false;
    });

    const updateFromClientX = (clientX: number) => {
      const clamped = clamp(clientX - rect.left, 0, rect.width);
      const fraction = rect.width === 0 ? 0 : clamped / rect.width;
      const current = latestAdjustmentRef.current;
      const next = applyFraction(fraction, current);
      latestAdjustmentRef.current = next;
      setAdjustment(next);

      void (async () => {
        const ready = await beginPromise;
        if (!ready) return;
        try {
          await preview.updatePreview(next);
        } catch (error) {
          console.error('Failed to update HSV preview', error);
        }
      })();
    };

    updateFromClientX(event.nativeEvent.clientX);

    const handleMove = (ev: PointerEvent) => updateFromClientX(ev.clientX);
    const handleUp = () => {
      slider.releasePointerCapture(event.pointerId);
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerup', handleUp);
      document.removeEventListener('pointercancel', handleUp);
      endCoalescing();
    };

    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerup', handleUp);
    document.addEventListener('pointercancel', handleUp);
  };

  const { h, s, v } = adjustment;
  const hPos = ((h + 180) / 360) * 100;
  const sPos = ((s + 100) / 200) * 100;
  const vPos = ((v + 100) / 200) * 100;
  const baseHue = (h + 360) % 360;
  const baseS = clamp((100 + s) / 2, 0, 100);
  const baseV = clamp((100 + v) / 2, 0, 100);
  const hueBg = 'linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))';
  const satBg = `linear-gradient(to right, hsl(${baseHue},0%,${baseV}%), hsl(${baseHue},100%,${baseV}%))`;
  const valBg = `linear-gradient(to right, hsl(${baseHue},${baseS}%,0%), hsl(${baseHue},${baseS}%,50%), hsl(${baseHue},${baseS}%,100%))`;

  const title = t('sideToolbar.imageHsv.title');
  const hueLabel = t('sideToolbar.imageHsv.hue');
  const saturationLabel = t('sideToolbar.imageHsv.saturation');
  const valueLabel = t('sideToolbar.imageHsv.value');

  return (
    <div className="w-full space-y-4">
      <h3 className="text-sm font-bold text-center text-[var(--text-primary)]">{title}</h3>
      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--text-primary)]">{hueLabel}</label>
        <div
          className="relative h-4 cursor-pointer"
          onPointerDown={createSliderHandler((fraction, current) => ({
            ...current,
            h: Math.round(fraction * 360) - 180,
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
            ...current,
            s: Math.round(fraction * 200) - 100,
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
            ...current,
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
  );
};
