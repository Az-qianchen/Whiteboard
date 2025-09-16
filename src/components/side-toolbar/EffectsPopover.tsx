import React, { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { Popover, Transition } from '@headlessui/react';
import { ICONS } from '@/constants';
import PanelButton from '@/components/PanelButton';
import { SwitchControl, Slider, PopoverColorControl } from './shared';

// Define props interface
interface EffectsPopoverProps {
  blur: number;
  setBlur: (b: number) => void;
  shadowEnabled: boolean;
  setShadowEnabled: (se: boolean) => void;
  shadowOffsetX: number;
  setShadowOffsetX: (so: number) => void;
  shadowOffsetY: number;
  setShadowOffsetY: (so: number) => void;
  shadowBlur: number;
  setShadowBlur: (sb: number) => void;
  shadowColor: string;
  setShadowColor: (sc: string) => void;
  beginCoalescing: () => void;
  endCoalescing: () => void;
}

export const EffectsPopover: React.FC<EffectsPopoverProps> = React.memo((props) => {
    const {
        blur, setBlur, shadowEnabled, setShadowEnabled, shadowOffsetX, setShadowOffsetX,
        shadowOffsetY, setShadowOffsetY, shadowBlur, setShadowBlur, shadowColor, setShadowColor,
        beginCoalescing, endCoalescing
    } = props;

    const { t } = useTranslation();
    const title = t('sideToolbar.effects.title');
    const blurLabel = t('sideToolbar.effects.blur');
    const shadowLabel = t('sideToolbar.effects.shadow');
    const offsetXLabel = t('sideToolbar.effects.offsetX');
    const offsetYLabel = t('sideToolbar.effects.offsetY');
    const shadowBlurLabel = t('sideToolbar.effects.shadowBlur');
    const shadowColorLabel = t('sideToolbar.effects.shadowColor');

    return (
        <div className="flex flex-col items-center w-14" title={title}>
            <Popover className="relative">
                <Popover.Button
                    as={PanelButton}
                    variant="unstyled"
                    className="p-2 h-9 w-9 rounded-lg flex items-center justify-center transition-colors text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]"
                    title={title}
                >
                    {ICONS.EFFECTS}
                </Popover.Button>
                <Transition as={Fragment} enter="transition ease-out duration-200" enterFrom="opacity-0 translate-y-1" enterTo="opacity-100 translate-y-0" leave="transition ease-in duration-150" leaveFrom="opacity-100 translate-y-0" leaveTo="opacity-0 translate-y-1">
                    <Popover.Panel className="absolute bottom-0 mb-0 right-full mr-2 w-64 bg-[var(--ui-popover-bg)] backdrop-blur-lg rounded-xl shadow-lg border border-[var(--ui-panel-border)] z-20 p-4">
                        <div className="flex flex-col gap-4">
                             <div className="space-y-4">
                                <h3 className="text-sm font-bold text-center text-[var(--text-primary)]">{title}</h3>
                                <Slider label={blurLabel} value={blur} setValue={setBlur} min={0} max={50} step={1} onInteractionStart={beginCoalescing} onInteractionEnd={endCoalescing} />
                                <SwitchControl label={shadowLabel} enabled={shadowEnabled} setEnabled={setShadowEnabled} />
                                <div className={`space-y-4 transition-opacity ${!shadowEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                                     <Slider label={offsetXLabel} value={shadowOffsetX} setValue={setShadowOffsetX} min={-20} max={20} step={1} onInteractionStart={beginCoalescing} onInteractionEnd={endCoalescing} />
                                     <Slider label={offsetYLabel} value={shadowOffsetY} setValue={setShadowOffsetY} min={-20} max={20} step={1} onInteractionStart={beginCoalescing} onInteractionEnd={endCoalescing} />
                                     <Slider label={shadowBlurLabel} value={shadowBlur} setValue={setShadowBlur} min={0} max={50} step={1} onInteractionStart={beginCoalescing} onInteractionEnd={endCoalescing} />
                                     <PopoverColorControl label={shadowColorLabel} color={shadowColor} setColor={setShadowColor} onInteractionStart={beginCoalescing} onInteractionEnd={endCoalescing} />
                                </div>
                            </div>
                        </div>
                    </Popover.Panel>
                </Transition>
            </Popover>
        </div>
    );
});
