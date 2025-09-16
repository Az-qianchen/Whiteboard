import React, { Fragment, useMemo } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { ICONS } from '@/constants';
import { FILL_STYLES, FILL_STYLE_ICONS } from './constants';
import PanelButton from '@/components/PanelButton';
import { useTranslation } from 'react-i18next';

interface FillStyleControlProps {
    fillStyle: string;
    setFillStyle: (style: string) => void;
}

export const FillStyleControl: React.FC<FillStyleControlProps> = React.memo(({ fillStyle, setFillStyle }) => {
    const { t } = useTranslation();
    const currentStyle = useMemo(() => FILL_STYLES.find(s => s.name === fillStyle), [fillStyle]);
    const titleLabel = currentStyle ? t(currentStyle.titleKey) : '';
    const popoverTitle = t('sideToolbar.fillStyle.titleWithValue', { value: titleLabel || fillStyle });
    const selectLabel = t('sideToolbar.fillStyle.choose');

    return (
        <div className="flex flex-col items-center w-14 transition-opacity" title={popoverTitle}>
            <Popover className="relative">
                <Popover.Button
                  as={PanelButton}
                  variant="unstyled"
                  className="h-9 w-9 p-1.5 rounded-lg flex items-center justify-center transition-colors text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)] disabled:cursor-not-allowed"
                  title={popoverTitle}
                  aria-label={selectLabel}
                >
                    {FILL_STYLE_ICONS[fillStyle as keyof typeof FILL_STYLE_ICONS]}
                </Popover.Button>
                <Transition as={Fragment} enter="transition ease-out duration-200" enterFrom="opacity-0 translate-y-1" enterTo="opacity-100 translate-y-0" leave="transition ease-in duration-150" leaveFrom="opacity-100 translate-y-0" leaveTo="opacity-0 translate-y-1">
                    <Popover.Panel className="absolute bottom-0 mb-0 right-full mr-2 w-48 bg-[var(--ui-popover-bg)] backdrop-blur-lg rounded-xl shadow-lg border border-[var(--ui-panel-border)] z-20 p-2">
                        {({ close }) => (
                            <div className="grid grid-cols-1 gap-1">
                                {FILL_STYLES.map(({ name, titleKey, icon }) => {
                                    const label = t(titleKey);
                                    return (
                                        <PanelButton
                                          variant="unstyled"
                                          key={name}
                                          onClick={() => { setFillStyle(name); close(); }}
                                          className={`w-full flex items-center gap-3 p-2 rounded-md text-left text-sm transition-colors ${fillStyle === name ? 'bg-[var(--accent-bg)] text-[var(--accent-primary)]' : 'hover:bg-[var(--ui-element-bg-hover)] text-[var(--text-primary)]'}`}
                                        >
                                            <div className="w-5 h-5 flex-shrink-0 text-current">{icon}</div>
                                            <span className="flex-grow">{label}</span>
                                            {fillStyle === name && <div className="w-5 h-5 text-[var(--accent-primary)]">{ICONS.CHECK}</div>}
                                        </PanelButton>
                                    );
                                })}
                            </div>
                        )}
                    </Popover.Panel>
                </Transition>
            </Popover>
        </div>
    );
});