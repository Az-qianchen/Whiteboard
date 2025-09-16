import React, { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { Popover, Transition } from '@headlessui/react';
import { ICONS } from '@/constants';
import PanelButton from '@/components/PanelButton';
import { SwitchControl, Slider } from './shared';

// Define props interface
interface StylePropertiesPopoverProps {
  isRough: boolean;
  setIsRough: (r: boolean) => void;
  roughness: number;
  setRoughness: (r: number) => void;
  bowing: number;
  setBowing: (b: number) => void;
  fillWeight: number;
  setFillWeight: (fw: number) => void;
  hachureAngle: number;
  setHachureAngle: (ha: number) => void;
  hachureGap: number;
  setHachureGap: (hg: number) => void;
  curveTightness: number;
  setCurveTightness: (ct: number) => void;
  curveStepCount: number;
  setCurveStepCount: (csc: number) => void;
  preserveVertices: boolean;
  setPreserveVertices: (pv: boolean) => void;
  disableMultiStroke: boolean;
  setDisableMultiStroke: (dms: boolean) => void;
  disableMultiStrokeFill: boolean;
  setDisableMultiStrokeFill: (dmsf: boolean) => void;
  beginCoalescing: () => void;
  endCoalescing: () => void;
}

export const StylePropertiesPopover: React.FC<StylePropertiesPopoverProps> = React.memo((props) => {
    const {
        isRough, setIsRough, roughness, setRoughness, bowing, setBowing,
        fillWeight, setFillWeight, hachureAngle, setHachureAngle, hachureGap, setHachureGap,
        curveTightness, setCurveTightness, curveStepCount, setCurveStepCount,
        preserveVertices, setPreserveVertices, disableMultiStroke, setDisableMultiStroke,
        disableMultiStrokeFill, setDisableMultiStrokeFill,
        beginCoalescing, endCoalescing
    } = props;

    const { t } = useTranslation();
    const title = t('sideToolbar.styleProperties.title');
    const sketchyLabel = t('sideToolbar.styleProperties.sketchy');
    const roughnessLabel = t('sideToolbar.styleProperties.roughness');
    const bowingLabel = t('sideToolbar.styleProperties.bowing');
    const curveTightnessLabel = t('sideToolbar.styleProperties.curveTightness');
    const curveStepsLabel = t('sideToolbar.styleProperties.curveStepCount');
    const preserveVerticesLabel = t('sideToolbar.styleProperties.preserveVertices');
    const disableMultiStrokeLabel = t('sideToolbar.styleProperties.disableMultiStroke');
    const fillWeightLabel = t('sideToolbar.styleProperties.fillWeight');
    const hachureAngleLabel = t('sideToolbar.styleProperties.hachureAngle');
    const hachureGapLabel = t('sideToolbar.styleProperties.hachureGap');
    const disableMultiFillLabel = t('sideToolbar.styleProperties.disableMultiStrokeFill');

    return (
        <div className="flex flex-col items-center w-14" title={title}>
            <Popover className="relative">
                <Popover.Button
                    as={PanelButton}
                    variant="unstyled"
                    className="p-2 h-9 w-9 rounded-lg flex items-center justify-center transition-colors text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]"
                    title={title}
                >
                    {ICONS.PROPERTIES}
                </Popover.Button>
                <Transition as={Fragment} enter="transition ease-out duration-200" enterFrom="opacity-0 translate-y-1" enterTo="opacity-100 translate-y-0" leave="transition ease-in duration-150" leaveFrom="opacity-100 translate-y-0" leaveTo="opacity-0 translate-y-1">
                    <Popover.Panel className="absolute bottom-0 mb-0 right-full mr-2 w-64 bg-[var(--ui-popover-bg)] backdrop-blur-lg rounded-xl shadow-lg border border-[var(--ui-panel-border)] z-20 p-4">
                        <div className="flex flex-col gap-4">
                            <div className="space-y-4">
                                <SwitchControl label={sketchyLabel} enabled={isRough} setEnabled={setIsRough} />
                                <div className="space-y-4 transition-opacity">
                                    <Slider
                                        label={roughnessLabel}
                                        value={roughness}
                                        setValue={setRoughness}
                                        min={0}
                                        max={5}
                                        step={0.5}
                                        onInteractionStart={beginCoalescing}
                                        onInteractionEnd={endCoalescing}
                                    />
                                    <Slider
                                        label={bowingLabel}
                                        value={bowing}
                                        setValue={setBowing}
                                        min={0}
                                        max={10}
                                        step={1}
                                        onInteractionStart={beginCoalescing}
                                        onInteractionEnd={endCoalescing}
                                    />
                                    <Slider
                                        label={curveTightnessLabel}
                                        value={curveTightness}
                                        setValue={setCurveTightness}
                                        min={-2}
                                        max={2}
                                        step={0.25}
                                        onInteractionStart={beginCoalescing}
                                        onInteractionEnd={endCoalescing}
                                    />
                                    <Slider
                                        label={curveStepsLabel}
                                        value={curveStepCount}
                                        setValue={setCurveStepCount}
                                        min={1}
                                        max={30}
                                        step={1}
                                        onInteractionStart={beginCoalescing}
                                        onInteractionEnd={endCoalescing}
                                    />
                                    <SwitchControl label={preserveVerticesLabel} enabled={preserveVertices} setEnabled={setPreserveVertices} />
                                    <SwitchControl label={disableMultiStrokeLabel} enabled={disableMultiStroke} setEnabled={setDisableMultiStroke} />
                                </div>
                            </div>

                            <div className="h-px bg-[var(--ui-separator)]" />

                            <div className="space-y-4">
                                <Slider
                                    label={fillWeightLabel}
                                    value={fillWeight}
                                    setValue={setFillWeight}
                                    min={0.1}
                                    max={5}
                                    step={0.1}
                                    onInteractionStart={beginCoalescing}
                                    onInteractionEnd={endCoalescing}
                                />
                                <Slider
                                    label={hachureAngleLabel}
                                    value={hachureAngle}
                                    setValue={setHachureAngle}
                                    min={-90}
                                    max={90}
                                    step={15}
                                    onInteractionStart={beginCoalescing}
                                    onInteractionEnd={endCoalescing}
                                />
                                <Slider
                                    label={hachureGapLabel}
                                    value={hachureGap}
                                    setValue={setHachureGap}
                                    min={0.5}
                                    max={20}
                                    step={0.5}
                                    onInteractionStart={beginCoalescing}
                                    onInteractionEnd={endCoalescing}
                                />
                                <SwitchControl label={disableMultiFillLabel} enabled={disableMultiStrokeFill} setEnabled={setDisableMultiStrokeFill} />
                            </div>
                        </div>
                    </Popover.Panel>
                </Transition>
            </Popover>
        </div>
    );
});