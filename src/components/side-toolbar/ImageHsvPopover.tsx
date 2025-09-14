import React, { Fragment, useState } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { ICONS } from '@/constants';
import PanelButton from '@/components/PanelButton';
import type { HsvAdjustment } from '@/lib/image';

interface ImageHsvPopoverProps {
  onAdjust: (adj: HsvAdjustment) => void;
  beginCoalescing: () => void;
  endCoalescing: () => void;
}

export const ImageHsvPopover: React.FC<ImageHsvPopoverProps> = ({ onAdjust, beginCoalescing, endCoalescing }) => {
  const [h, setH] = useState(0);
  const [s, setS] = useState(0);
  const [v, setV] = useState(0);

  const handleChange = (nh: number, ns: number, nv: number) => {
    onAdjust({ h: nh, s: ns, v: nv });
  };

  const createSliderHandler = (update: (p: number) => void) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    beginCoalescing();
    const slider = e.currentTarget;
    slider.setPointerCapture(e.pointerId);
    const rect = slider.getBoundingClientRect();

    const updateValue = (ev: PointerEvent) => {
      const x = Math.max(0, Math.min(ev.clientX - rect.left, rect.width));
      update(x / rect.width);
    };

    updateValue(e.nativeEvent);

    const handleMove = (ev: PointerEvent) => updateValue(ev);
    const handleUp = () => {
      slider.releasePointerCapture(e.pointerId);
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerup', handleUp);
      endCoalescing();
    };
    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerup', handleUp);
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
    <div className="flex flex-col items-center w-14" title="HSV 调整">
      <Popover className="relative">
        <Popover.Button
          as={PanelButton}
          variant="unstyled"
          className="p-2 h-9 w-9 rounded-lg flex items-center justify-center transition-colors text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]"
          title="HSV 调整"
        >
          {ICONS.HSV}
        </Popover.Button>
        <Transition as={Fragment} enter="transition ease-out duration-200" enterFrom="opacity-0 translate-y-1" enterTo="opacity-100 translate-y-0" leave="transition ease-in duration-150" leaveFrom="opacity-100 translate-y-0" leaveTo="opacity-0 translate-y-1">
          <Popover.Panel className="absolute bottom-0 mb-0 right-full mr-2 w-64 bg-[var(--ui-popover-bg)] backdrop-blur-lg rounded-xl shadow-lg border border-[var(--ui-panel-border)] z-20 p-4">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-center text-[var(--text-primary)]">HSV 调整</h3>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text-primary)]">色相</label>
                <div className="relative h-4 cursor-pointer" onPointerDown={createSliderHandler(p => { const val = Math.round(p * 360) - 180; setH(val); handleChange(val, s, v); })}>
                  <div className="w-full h-2 rounded-lg absolute top-1/2 -translate-y-1/2" style={{ background: hueBg }} />
                  <div className="absolute w-4 h-4 -translate-y-1/2 -translate-x-1/2 top-1/2 rounded-full bg-white shadow-md ring-1 ring-white/20" style={{ left: `${hPos}%` }} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text-primary)]">饱和度</label>
                <div className="relative h-4 cursor-pointer" onPointerDown={createSliderHandler(p => { const val = Math.round(p * 200) - 100; setS(val); handleChange(h, val, v); })}>
                  <div className="w-full h-2 rounded-lg absolute top-1/2 -translate-y-1/2" style={{ background: satBg }} />
                  <div className="absolute w-4 h-4 -translate-y-1/2 -translate-x-1/2 top-1/2 rounded-full shadow-md ring-1 ring-white/20" style={{ left: `${sPos}%`, backgroundColor: `hsl(${baseHue}, ${sPos}%, ${baseV}%)` }} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text-primary)]">明度</label>
                <div className="relative h-4 cursor-pointer" onPointerDown={createSliderHandler(p => { const val = Math.round(p * 200) - 100; setV(val); handleChange(h, s, val); })}>
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
