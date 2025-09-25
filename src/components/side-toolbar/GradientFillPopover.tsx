import React, { Fragment, useCallback, useMemo, useRef, useEffect } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import PanelButton from '@/components/PanelButton';
import type { GradientFill, LinearGradientFill, RadialGradientFill } from '@/types';
import {
  createDefaultLinearGradient,
  createDefaultRadialGradient,
  getLinearHandles,
  gradientStopColor,
  gradientToCss,
  updateGradientStopColor,
  updateLinearGradientHandles,
  updateRadialGradientHandles,
} from '@/lib/gradient';
import { FloatingColorPicker } from '../FloatingColorPicker';

interface GradientFillPopoverProps {
  label: string;
  fill: string;
  fillGradient: GradientFill | null;
  setFill: (color: string) => void;
  setFillGradient: (gradient: GradientFill | null) => void;
  fillStyle: string;
  setFillStyle: (style: string) => void;
  beginCoalescing: () => void;
  endCoalescing: () => void;
  className?: string;
}

const CHECKERBOARD = 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)';
const CHECKERBOARD_SIZES = '10px 10px, 10px 10px, 10px 10px, 10px 10px';
const CHECKERBOARD_POSITIONS = '0 0, 0 5px, 5px -5px, -5px 0px';

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

interface StopPickerProps {
  label: string;
  color: string;
  onChange: (color: string) => void;
  beginCoalescing: () => void;
  endCoalescing: () => void;
  disabled?: boolean;
}

const StopPicker: React.FC<StopPickerProps> = ({ label, color, onChange, beginCoalescing, endCoalescing, disabled = false }) => {
  const buttonStyle: React.CSSProperties = {
    backgroundImage: `linear-gradient(${color}, ${color}), ${CHECKERBOARD}`,
    backgroundSize: `cover, ${CHECKERBOARD_SIZES}`,
    backgroundPosition: `0 0, ${CHECKERBOARD_POSITIONS}`,
    backgroundColor: 'transparent',
  };

  if (disabled) {
    return (
      <PanelButton
        variant="unstyled"
        className="h-7 w-7 rounded-full transition-transform transform hover:scale-110 disabled:cursor-not-allowed disabled:hover:scale-100"
        style={buttonStyle}
        aria-label={label}
        title={label}
        disabled
      />
    );
  }

  return (
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
          className="h-7 w-7 rounded-full transition-transform transform hover:scale-110"
          style={buttonStyle}
          aria-label={label}
          title={label}
        />
      )}
    </FloatingColorPicker>
  );
};

export const GradientFillPopover: React.FC<GradientFillPopoverProps> = React.memo(({
  label,
  fill,
  fillGradient,
  setFill,
  setFillGradient,
  fillStyle,
  setFillStyle,
  beginCoalescing,
  endCoalescing,
  className = '',
}) => {
  const { t } = useTranslation();

  const typeLabel = t('sideToolbar.gradientFill.type');
  const solidTypeLabel = t('sideToolbar.gradientFill.types.solid');
  const linearTypeLabel = t('sideToolbar.gradientFill.types.linear');
  const radialTypeLabel = t('sideToolbar.gradientFill.types.radial');
  const solidColorLabel = t('sideToolbar.fillColor');
  const startLabel = t('sideToolbar.gradientFill.start');
  const endLabel = t('sideToolbar.gradientFill.end');
  const selectLabel = t('sideToolbar.colorControl.select', { label });

  const gradientType: 'solid' | 'linear' | 'radial' = fillGradient?.type ?? 'solid';
  const isGradientActive = gradientType !== 'solid';

  const previousFillStyleRef = useRef<string | null>(null);
  const forcedSolidRef = useRef(false);
  const isForcingFillStyleRef = useRef(false);

  useEffect(() => {
    if (isForcingFillStyleRef.current) {
      if (isGradientActive) {
        isForcingFillStyleRef.current = false;
      }
      return;
    }

    if (fillStyle !== 'solid' || !isGradientActive) {
      previousFillStyleRef.current = null;
      forcedSolidRef.current = false;
    }
  }, [fillStyle, isGradientActive]);

  const ensureSolidFillStyle = useCallback(() => {
    if (fillStyle !== 'solid') {
      previousFillStyleRef.current = fillStyle;
      forcedSolidRef.current = true;
      isForcingFillStyleRef.current = true;
      setFillStyle('solid');
    }
  }, [fillStyle, setFillStyle]);

  const restoreFillStyle = useCallback(() => {
    if (!forcedSolidRef.current) {
      previousFillStyleRef.current = null;
      isForcingFillStyleRef.current = false;
      return;
    }
    forcedSolidRef.current = false;
    const previous = previousFillStyleRef.current;
    previousFillStyleRef.current = null;
    if (previous && previous !== 'solid') {
      setFillStyle(previous);
    }
    isForcingFillStyleRef.current = false;
  }, [setFillStyle]);

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

  const handleStopChange = useCallback(
    (index: number, color: string) => {
      if (!fillGradient) return;
      const next = updateGradientStopColor(fillGradient, index, color);
      setFillGradient(next);
      if (index === 0) {
        setFill(color);
      }
    },
    [fillGradient, setFillGradient, setFill],
  );

  const handleTypeChange = useCallback(
    (type: 'solid' | 'linear' | 'radial') => {
      if (type === 'solid') {
        if (!fillGradient) {
          restoreFillStyle();
          return;
        }

        beginCoalescing();
        try {
          const baseColor = gradientStopColor(fillGradient, 0);
          setFill(baseColor);
          setFillGradient(null);
          restoreFillStyle();
        } finally {
          endCoalescing();
        }
        return;
      }

      const currentStops = fillGradient ? fillGradient.stops.map(stop => ({ ...stop })) : null;
      const baseColor = currentStops?.[0]?.color ?? fill;

      if (!fillGradient) {
        beginCoalescing();
        try {
          ensureSolidFillStyle();
          const nextBase = type === 'linear'
            ? (createDefaultLinearGradient(baseColor) as LinearGradientFill)
            : (createDefaultRadialGradient(baseColor) as RadialGradientFill);
          setFillGradient(nextBase);
          if (nextBase.stops.length > 0) {
            setFill(nextBase.stops[0].color);
          }
        } finally {
          endCoalescing();
        }
        return;
      }

      if (fillGradient.type === type) {
        return;
      }

      beginCoalescing();
      try {
        if (type === 'linear') {
          ensureSolidFillStyle();
          const base = createDefaultLinearGradient(baseColor) as LinearGradientFill;
          let configured: LinearGradientFill = base;
          if (fillGradient.type === 'radial') {
            const dx = fillGradient.edge.x - fillGradient.center.x;
            const dy = fillGradient.edge.y - fillGradient.center.y;
            const start = { x: clamp01(fillGradient.center.x - dx), y: clamp01(fillGradient.center.y - dy) };
            const end = { x: clamp01(fillGradient.center.x + dx), y: clamp01(fillGradient.center.y + dy) };
            configured = updateLinearGradientHandles(base, [start, end]);
          }
          const next: GradientFill = { ...configured, stops: currentStops ?? configured.stops };
          setFillGradient(next);
          if (next.stops.length > 0) {
            setFill(next.stops[0].color);
          }
          return;
        }

        ensureSolidFillStyle();
        const base = createDefaultRadialGradient(baseColor) as RadialGradientFill;
        let configured: RadialGradientFill = base;
        if (fillGradient.type === 'linear') {
          const [start, end] = getLinearHandles(fillGradient);
          const centerPoint = { x: clamp01((start.x + end.x) / 2), y: clamp01((start.y + end.y) / 2) };
          configured = updateRadialGradientHandles(base, {
            center: centerPoint,
            edge: { x: clamp01(end.x), y: clamp01(end.y) },
          });
        }
        const next: GradientFill = { ...configured, stops: currentStops ?? configured.stops };
        setFillGradient(next);
        if (next.stops.length > 0) {
          setFill(next.stops[0].color);
        }
      } finally {
        endCoalescing();
      }
    },
    [
      fillGradient,
      fill,
      setFillGradient,
      setFill,
      beginCoalescing,
      endCoalescing,
      ensureSolidFillStyle,
      restoreFillStyle,
    ],
  );

  const startColor = fillGradient ? gradientStopColor(fillGradient, 0) : fill;
  const endColor = fillGradient ? gradientStopColor(fillGradient, 1) : startColor;
  const isSolidType = gradientType === 'solid';
  const startPickerLabel = isSolidType ? solidColorLabel : startLabel;
  const panelWidthClass = 'w-52';
  const typeButtonBaseClass = 'px-2 py-1 rounded-md border border-transparent text-xs transition-colors';

  return (
    <div className={`flex flex-col items-center w-14 transition-opacity ${className}`} title={label}>
      <Popover className="relative">
        <Popover.Button
          as={PanelButton}
          variant="unstyled"
          className="h-7 w-7 rounded-full transition-transform transform hover:scale-110"
          style={previewStyle}
          title={selectLabel}
          aria-label={selectLabel}
        >
          <span className="sr-only">{selectLabel}</span>
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
          <Popover.Panel className={`absolute bottom-0 mb-0 right-full mr-2 ${panelWidthClass} bg-[var(--ui-popover-bg)] backdrop-blur-lg rounded-xl shadow-lg border border-[var(--ui-panel-border)] z-20 p-3`}>
            <div className="flex flex-col gap-2 text-[var(--text-primary)]">
              <span className="text-sm font-medium">{label}</span>

              <div className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
                <span>{typeLabel}</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className={`${typeButtonBaseClass} ${
                      gradientType === 'solid'
                        ? 'bg-[var(--accent-bg)] text-[var(--accent-primary)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]'
                    }`}
                    onClick={() => handleTypeChange('solid')}
                  >
                    {solidTypeLabel}
                  </button>
                  <button
                    type="button"
                    className={`${typeButtonBaseClass} ${
                      gradientType === 'linear'
                        ? 'bg-[var(--accent-bg)] text-[var(--accent-primary)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]'
                    }`}
                    onClick={() => handleTypeChange('linear')}
                  >
                    {linearTypeLabel}
                  </button>
                  <button
                    type="button"
                    className={`${typeButtonBaseClass} ${
                      gradientType === 'radial'
                        ? 'bg-[var(--accent-bg)] text-[var(--accent-primary)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]'
                    }`}
                    onClick={() => handleTypeChange('radial')}
                  >
                    {radialTypeLabel}
                  </button>
                </div>
              </div>

              <div className="flex justify-start gap-4">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs text-[var(--text-secondary)]">{startPickerLabel}</span>
                  <StopPicker
                    label={startPickerLabel}
                    color={startColor}
                    onChange={(value) => (isSolidType ? setFill(value) : handleStopChange(0, value))}
                    beginCoalescing={beginCoalescing}
                    endCoalescing={endCoalescing}
                  />
                </div>
                {!isSolidType && (
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs text-[var(--text-secondary)]">{endLabel}</span>
                    <StopPicker
                      label={endLabel}
                      color={endColor}
                      onChange={(value) => handleStopChange(1, value)}
                      beginCoalescing={beginCoalescing}
                      endCoalescing={endCoalescing}
                      disabled={isSolidType || !fillGradient}
                    />
                  </div>
                )}
              </div>
            </div>
          </Popover.Panel>
        </Transition>
      </Popover>
    </div>
  );
});
