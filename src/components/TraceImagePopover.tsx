/**
 * 本文件定义了图片矢量化参数调整的弹出面板组件。
 */
import React, { Fragment, useState } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import PanelButton from '@/components/PanelButton';
import { ICONS } from '../constants';
import { Slider } from './side-toolbar';
import type { TraceOptions } from '../types';

interface TraceImagePopoverProps {
  onTrace: (options: TraceOptions) => void;
}

/**
 * 提供矢量化参数调节并执行转换的组件。
 */
export const TraceImagePopover: React.FC<TraceImagePopoverProps> = ({ onTrace }) => {
  const { t } = useTranslation();
  const [ltres, setLtres] = useState(1);
  const [qtres, setQtres] = useState(1);
  const [pathomit, setPathomit] = useState(8);
  const [colors, setColors] = useState(16);

  // 执行矢量化并关闭面板
  const handleTrace = (close: () => void) => {
    onTrace({ ltres, qtres, pathomit, numberofcolors: colors });
    close();
  };

  return (
    <Popover className="relative">
      {({ close }) => (
        <>
          <Popover.Button
            as={PanelButton}
            title={t('traceImage')}
            className="text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]"
          >
            {ICONS.TRACE_IMAGE}
          </Popover.Button>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Popover.Panel className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 bg-[var(--ui-popover-bg)] backdrop-blur-lg rounded-xl shadow-lg border border-[var(--ui-panel-border)] p-4">
              <div className="space-y-3">
                <Slider label={t('colorsCount')} value={colors} setValue={setColors} min={2} max={32} step={1} onInteractionStart={() => {}} onInteractionEnd={() => {}}
                />
                <Slider label={t('lineThreshold')} value={ltres} setValue={setLtres} min={0} max={10} step={0.5} onInteractionStart={() => {}} onInteractionEnd={() => {}}
                />
                <Slider label={t('curveThreshold')} value={qtres} setValue={setQtres} min={0} max={10} step={0.5} onInteractionStart={() => {}} onInteractionEnd={() => {}}
                />
                <Slider label={t('pathOmit')} value={pathomit} setValue={setPathomit} min={0} max={50} step={1} onInteractionStart={() => {}} onInteractionEnd={() => {}}
                />
                <PanelButton
                  type="button"
                  onClick={() => handleTrace(close)}
                  className="w-full mt-2 h-9 rounded-md bg-[var(--accent-bg)] text-[var(--accent-primary)] hover:opacity-90 border-0 shadow-none"
                >
                  {t('vectorize')}
                </PanelButton>
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
};
