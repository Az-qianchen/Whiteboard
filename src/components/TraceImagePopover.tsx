/**
 * 本文件定义了图片矢量化参数调整的弹出面板组件。
 */
import React, { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import PanelButton from '@/components/PanelButton';
import { ICONS } from '../constants';
import { PANEL_CLASSES } from './panelStyles';
import type { TraceOptions } from '../types';

interface TraceImagePopoverProps {
  onTrace: (options: TraceOptions) => void;
}

interface ParameterInputProps {
  label: string;
  value: number;
  setValue: (value: number) => void;
  min: number;
  max: number;
  step: number;
}

const clampValue = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

const getStepPrecision = (step: number): number => {
  if (Number.isInteger(step)) {
    return 0;
  }
  const stepAsString = step.toString();
  if (stepAsString.includes('e-')) {
    const [, exponent] = stepAsString.split('e-');
    return Number.parseInt(exponent ?? '0', 10);
  }
  const [, decimals] = stepAsString.split('.');
  return decimals ? decimals.length : 0;
};

const alignToStep = (value: number, step: number, precision: number): number => {
  if (step <= 0) {
    return Number(value.toFixed(precision));
  }
  const aligned = Math.round(value / step) * step;
  const factor = 10 ** precision;
  return Math.round(aligned * factor) / factor;
};

const ParameterInput: React.FC<ParameterInputProps> = ({ label, value, setValue, min, max, step }) => {
  const precision = useMemo(() => getStepPrecision(step), [step]);
  const formatValue = useCallback((val: number) => Number(val.toFixed(precision)).toString(), [precision]);
  const [localValue, setLocalValue] = useState(() => formatValue(value));
  const [isFocused, setIsFocused] = useState(false);
  const inputId = React.useId();

  useEffect(() => {
    if (!isFocused) {
      const formatted = formatValue(value);
      if (formatted !== localValue) {
        setLocalValue(formatted);
      }
    }
  }, [formatValue, isFocused, localValue, value]);

  const commitValue = () => {
    if (localValue.trim() === '') {
      setLocalValue(formatValue(value));
      return;
    }
    const numericValue = Number.parseFloat(localValue);
    if (Number.isNaN(numericValue)) {
      setLocalValue(formatValue(value));
      return;
    }
    const clamped = clampValue(numericValue, min, max);
    const stepped = alignToStep(clamped, step, precision);
    setValue(stepped);
    setLocalValue(formatValue(stepped));
  };

  return (
    <div className="space-y-1">
      <label className={`${PANEL_CLASSES.label} text-[var(--text-primary)]`} htmlFor={inputId}>
        {label}
      </label>
      <div className={`${PANEL_CLASSES.inputWrapper} w-full`}>
        <input
          id={inputId}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={localValue}
          onChange={(event) => setLocalValue(event.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            commitValue();
            setIsFocused(false);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              commitValue();
              event.currentTarget.blur();
            }
            if (event.key === 'Escape') {
              setLocalValue(formatValue(value));
              event.currentTarget.blur();
            }
          }}
          className={`${PANEL_CLASSES.input} hide-spinners`}
        />
      </div>
    </div>
  );
};

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
            variant="unstyled"
            className="flex items-center justify-center h-[34px] w-[34px] rounded-lg transition-colors text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)]"
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
                <ParameterInput label={t('colorsCount')} value={colors} setValue={setColors} min={2} max={32} step={1} />
                <ParameterInput label={t('lineThreshold')} value={ltres} setValue={setLtres} min={0} max={10} step={0.5} />
                <ParameterInput label={t('curveThreshold')} value={qtres} setValue={setQtres} min={0} max={10} step={0.5} />
                <ParameterInput label={t('pathOmit')} value={pathomit} setValue={setPathomit} min={0} max={50} step={1} />
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
