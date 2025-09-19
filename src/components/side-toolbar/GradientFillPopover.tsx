import React, { Fragment, useMemo } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import PanelButton from '@/components/PanelButton';
import { ICONS } from '@/constants';
import type { GradientFill } from '@/types';
import { createDefaultLinearGradient, gradientStopColor, gradientToCss, updateGradientStopColor, updateGradientAngle } from '@/lib/gradient';
import { FloatingColorPicker } from '../FloatingColorPicker';
import { NumericInput } from './NumericInput';

interface GradientFillPopoverProps {
  fill: string;
  fillGradient: GradientFill | null;
  setFill: (color: string) => void;
  setFillGradient: (gradient: GradientFill | null) => void;
  fillStyle: string;
  setFillStyle: (style: string) => void;
  beginCoalescing: () => void;
  endCoalescing: () => void;
}

const CHECKERBOARD = 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)';
const CHECKERBOARD_SIZES = '10px 10px, 10px 10px, 10px 10px, 10px 10px';
const CHECKERBOARD_POSITIONS = '0 0, 0 5px, 5px -5px, -5px 0px';

interface StopPickerProps {
  label: string;
  color: string;
  onChange: (color: string) => void;
  beginCoalescing: () => void;
  endCoalescing: () => void;
}

const StopPicker: React.FC<StopPickerProps> = ({ label, color, onChange, beginCoalescing, endCoalescing }) => (
  <FloatingColorPicker
    color={color}
    onChange={onChange}
    onInteractionStart={beginCoalescing}
    onInteractionEnd={endCoalescing}
    placement="left"
  >
    {({ ref, onClick }) => (
      <PanelButton
        variant="unstyled"
        ref={ref as any}
        onClick={onClick}
        className="h-7 w-7 rounded-full ring-1 ring-inset ring-white/10 transition-transform transform hover:scale-110"
        style={{
          backgroundImage: `linear-gradient(${color}, ${color}), ${CHECKERBOARD}`,
          backgroundSize: `cover, ${CHECKERBOARD_SIZES}`,
          backgroundPosition: `0 0, ${CHECKERBOARD_POSITIONS}`,
          backgroundColor: 'transparent',
        }}
        aria-label={label}
        title={label}
      />
    )}
  </FloatingColorPicker>
);

export const GradientFillPopover: React.FC<GradientFillPopoverProps> = React.memo(({
  fill,
  fillGradient,
  setFill,
  setFillGradient,
  fillStyle,
  setFillStyle,
  beginCoalescing,
  endCoalescing,
}) => {
  const { t } = useTranslation();
  const isActive = !!fillGradient;
  const title = t('sideToolbar.gradientFill.title');
  const toggleLabel = t('sideToolbar.gradientFill.enable');
  const angleLabel = t('sideToolbar.gradientFill.angle');
  const startLabel = t('sideToolbar.gradientFill.start');
  const endLabel = t('sideToolbar.gradientFill.end');
  const solidHint = t('sideToolbar.gradientFill.solidHint');

  const previewStyle = useMemo(() => {
    if (!fillGradient) {
      return {
        backgroundImage: `linear-gradient(${fill}, ${fill}), ${CHECKERBOARD}`,
        backgroundSize: `cover, ${CHECKERBOARD_SIZES}`,
        backgroundPosition: `0 0, ${CHECKERBOARD_POSITIONS}`,
        backgroundColor: 'transparent',
      } as React.CSSProperties;
    }
    return {
      backgroundImage: `${gradientToCss(fillGradient)}, ${CHECKERBOARD}`,
      backgroundSize: `cover, ${CHECKERBOARD_SIZES}`,
      backgroundPosition: `0 0, ${CHECKERBOARD_POSITIONS}`,
      backgroundColor: 'transparent',
    } as React.CSSProperties;
  }, [fill, fillGradient]);

  const ensureGradient = () => {
    if (fillGradient) return fillGradient;
    return createDefaultLinearGradient(fill);
  };

  const handleToggle = () => {
    if (isActive) {
      setFillGradient(null);
      return;
    }
    const next = ensureGradient();
    setFillGradient(next);
    if (next.stops.length > 0) {
      setFill(next.stops[0].color);
    }
    if (fillStyle !== 'solid') {
      setFillStyle('solid');
    }
  };

  const handleStopChange = (index: number, color: string) => {
    if (!fillGradient) return;
    const next = updateGradientStopColor(fillGradient, index, color);
    setFillGradient(next);
    if (index === 0) {
      setFill(color);
    }
  };

  const handleAngleChange = (value: number) => {
    if (!fillGradient) return;
    setFillGradient(updateGradientAngle(fillGradient, value));
  };

  const startColor = fillGradient ? gradientStopColor(fillGradient, 0) : fill;
  const endColor = fillGradient ? gradientStopColor(fillGradient, 1) : fill;

  return (
    <Popover className="relative">
      <Popover.Button
        as={PanelButton}
        variant="unstyled"
        className={`h-9 w-9 p-1.5 rounded-lg flex items-center justify-center transition-colors ${isActive ? 'bg-[var(--accent-bg)] text-[var(--accent-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]'}`}
        style={previewStyle}
        title={title}
        aria-label={title}
      >
        <span className="sr-only">{title}</span>
        {ICONS.BLEND}
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
        <Popover.Panel className="absolute bottom-0 mb-0 right-full mr-2 w-64 bg-[var(--ui-popover-bg)] backdrop-blur-lg rounded-xl shadow-lg border border-[var(--ui-panel-border)] z-20 p-3">
          <div className="flex flex-col gap-3 text-[var(--text-primary)]">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{title}</span>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={isActive} onChange={handleToggle} className="accent-[var(--accent-primary)]" />
                <span>{toggleLabel}</span>
              </label>
            </div>

            {isActive ? (
              <>
                {fillStyle !== 'solid' && (
                  <div className="text-xs text-[var(--text-secondary)]">{solidHint}</div>
                )}
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs text-[var(--text-secondary)]">{startLabel}</span>
                    <StopPicker
                      label={startLabel}
                      color={startColor}
                      onChange={(value) => handleStopChange(0, value)}
                      beginCoalescing={beginCoalescing}
                      endCoalescing={endCoalescing}
                    />
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs text-[var(--text-secondary)]">{endLabel}</span>
                    <StopPicker
                      label={endLabel}
                      color={endColor}
                      onChange={(value) => handleStopChange(1, value)}
                      beginCoalescing={beginCoalescing}
                      endCoalescing={endCoalescing}
                    />
                  </div>
                  <NumericInput
                    label={angleLabel}
                    value={fillGradient?.angle ?? 0}
                    setValue={handleAngleChange}
                    min={0}
                    max={360}
                    step={1}
                    unit="°"
                    beginCoalescing={beginCoalescing}
                    endCoalescing={endCoalescing}
                  />
                </div>
              </>
            ) : (
              <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {t('sideToolbar.gradientFill.disabled')}
              </div>
            )}
          </div>
        </Popover.Panel>
      </Transition>
    </Popover>
  );
});
