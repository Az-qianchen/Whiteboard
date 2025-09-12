import React, { Fragment, useState } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { ICONS } from '@/constants';
import { Slider } from './shared';
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

  return (
    <div className="flex flex-col items-center w-14" title="HSV 调整">
      <Popover className="relative">
        <Popover.Button className="p-2 h-9 w-9 rounded-lg flex items-center justify-center transition-colors text-[var(--text-secondary)] hover:bg-[var(--ui-hover-bg)] ring-1 ring-inset ring-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]" title="HSV 调整">
          {ICONS.HSV}
        </Popover.Button>
        <Transition as={Fragment} enter="transition ease-out duration-200" enterFrom="opacity-0 translate-y-1" enterTo="opacity-100 translate-y-0" leave="transition ease-in duration-150" leaveFrom="opacity-100 translate-y-0" leaveTo="opacity-0 translate-y-1">
          <Popover.Panel className="absolute bottom-0 mb-0 right-full mr-2 w-64 bg-[var(--ui-popover-bg)] backdrop-blur-lg rounded-xl shadow-lg border border-[var(--ui-panel-border)] z-20 p-4">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-center text-[var(--text-primary)]">HSV 调整</h3>
              <Slider label="色相" value={h} setValue={(val) => { setH(val); handleChange(val, s, v); }} min={-180} max={180} step={1} onInteractionStart={beginCoalescing} onInteractionEnd={endCoalescing} />
              <Slider label="饱和度" value={s} setValue={(val) => { setS(val); handleChange(h, val, v); }} min={-100} max={100} step={1} onInteractionStart={beginCoalescing} onInteractionEnd={endCoalescing} />
              <Slider label="明度" value={v} setValue={(val) => { setV(val); handleChange(h, s, val); }} min={-100} max={100} step={1} onInteractionStart={beginCoalescing} onInteractionEnd={endCoalescing} />
            </div>
          </Popover.Panel>
        </Transition>
      </Popover>
    </div>
  );
};
