import React, { Fragment, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Popover, Transition } from '@headlessui/react';
import { ICONS, ENDPOINT_STYLES } from '@/constants';
import type { EndpointStyle } from '@/types';
import PanelButton from '@/components/PanelButton';
import { SwitchControl, Slider, EndpointGrid } from './shared';

// Define props for the component
interface EndpointPopoverProps {
    strokeLineCapStart: EndpointStyle;
    setStrokeLineCapStart: (cap: EndpointStyle) => void;
    strokeLineCapEnd: EndpointStyle;
    setStrokeLineCapEnd: (cap: EndpointStyle) => void;
    endpointSize: number;
    setEndpointSize: (size: number) => void;
    endpointFill: 'solid' | 'hollow';
    setEndpointFill: (fill: 'solid' | 'hollow') => void;
    beginCoalescing: () => void;
    endCoalescing: () => void;
    strokeWidth: number;
}


export const EndpointPopover: React.FC<EndpointPopoverProps> = React.memo((props) => {
    const {
        strokeLineCapStart, setStrokeLineCapStart,
        strokeLineCapEnd, setStrokeLineCapEnd,
        endpointSize, setEndpointSize,
        endpointFill, setEndpointFill,
        beginCoalescing, endCoalescing,
        strokeWidth,
    } = props;

    const { t } = useTranslation();
    const title = t('sideToolbar.strokeStyle.title');
    const startMarkerLabel = t('sideToolbar.strokeStyle.startMarker');
    const endMarkerLabel = t('sideToolbar.strokeStyle.endMarker');
    const fillLabel = t('sideToolbar.strokeStyle.fill');
    const sizeLabel = t('sideToolbar.strokeStyle.size');
    const markerOptions = useMemo(() => ENDPOINT_STYLES.map(({ titleKey, ...rest }) => ({ ...rest, title: t(titleKey) })), [t]);

    const isMarker = (style: EndpointStyle) => ENDPOINT_STYLES.some(s => s.name === style && s.name !== 'none');

    const startMarkerValue = isMarker(strokeLineCapStart) ? strokeLineCapStart : 'none';
    const endMarkerValue = isMarker(strokeLineCapEnd) ? strokeLineCapEnd : 'none';
    
    const fillableMarkers: EndpointStyle[] = ['triangle', 'square', 'circle', 'diamond', 'dot'];
    const isFillControlEnabled = fillableMarkers.includes(startMarkerValue) || fillableMarkers.includes(endMarkerValue);

    const handleStartMarkerChange = (newMarker: EndpointStyle) => {
        setStrokeLineCapStart(newMarker === 'none' ? 'round' : newMarker);
    };
    
    const handleEndMarkerChange = (newMarker: EndpointStyle) => {
        setStrokeLineCapEnd(newMarker === 'none' ? 'round' : newMarker);
    };

    return (
        <div className={`flex flex-col items-center w-14 transition-opacity ${strokeWidth === 0 ? 'opacity-50' : ''}`} title={title}>
            <Popover className="relative">
                <Popover.Button
                    as={PanelButton}
                    variant="unstyled"
                    disabled={strokeWidth === 0}
                    className="p-2 h-9 w-9 rounded-lg flex items-center justify-center transition-colors text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)] disabled:cursor-not-allowed"
                    title={title}
                >
                    {ICONS.ENDPOINT_SETTINGS}
                </Popover.Button>
                <Transition as={Fragment} enter="transition ease-out duration-200" enterFrom="opacity-0 translate-y-1" enterTo="opacity-100 translate-y-0" leave="transition ease-in duration-150" leaveFrom="opacity-100 translate-y-0" leaveTo="opacity-0 translate-y-1">
                    <Popover.Panel className="absolute bottom-0 mb-0 right-full mr-2 w-60 bg-[var(--ui-popover-bg)] backdrop-blur-lg rounded-xl shadow-lg border border-[var(--ui-panel-border)] z-20 p-4">
                        <div className="flex flex-col gap-2">
                            <EndpointGrid
                                label={startMarkerLabel}
                                options={markerOptions}
                                value={startMarkerValue}
                                onChange={handleStartMarkerChange}
                            />
                            <EndpointGrid
                                label={endMarkerLabel}
                                options={markerOptions}
                                value={endMarkerValue}
                                onChange={handleEndMarkerChange}
                            />
                            <div className={`transition-opacity ${!isFillControlEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                                <SwitchControl
                                    label={fillLabel}
                                    enabled={endpointFill === 'solid'}
                                    setEnabled={(enabled) => setEndpointFill(enabled ? 'solid' : 'hollow')}
                                />
                            </div>
                            <div className="h-px my-1 bg-[var(--ui-separator)]" />
                            <Slider
                                label={sizeLabel}
                                value={endpointSize ?? 1}
                                setValue={setEndpointSize}
                                min={0.5} max={10} step={0.1}
                                onInteractionStart={beginCoalescing}
                                onInteractionEnd={endCoalescing}
                            />
                        </div>
                    </Popover.Panel>
                </Transition>
            </Popover>
        </div>
    );
});