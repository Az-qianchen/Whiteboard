import React, { useState, useEffect } from 'react';
import { useWheelCoalescer } from '@/hooks/side-toolbar/useWheelCoalescer';
import { PANEL_CLASSES } from '../panelStyles';

interface NumericInputProps {
  label: string;
  value: number;
  setValue: (value: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
  valueTransformer?: {
    toDisplay: (value: number) => number;
    fromDisplay: (displayValue: number) => number;
  };
  beginCoalescing: () => void;
  endCoalescing: () => void;
}

export const NumericInput: React.FC<NumericInputProps> = React.memo(({
  label,
  value,
  setValue,
  min,
  max,
  step,
  unit,
  valueTransformer = { toDisplay: v => v, fromDisplay: v => v },
  beginCoalescing,
  endCoalescing,
}) => {
  const [localValue, setLocalValue] = useState(() => Math.round(valueTransformer.toDisplay(value)).toString());
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      const next = Math.round(valueTransformer.toDisplay(value)).toString();
      if (next !== localValue) {
        setLocalValue(next);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, isFocused, localValue]);

  const handleCommit = () => {
    let numericValue = parseInt(localValue, 10);
    if (isNaN(numericValue)) {
      setLocalValue(Math.round(valueTransformer.toDisplay(value)).toString());
      return;
    }

    const displayMin = valueTransformer.toDisplay(min);
    const displayMax = valueTransformer.toDisplay(max);

    numericValue = Math.max(displayMin, Math.min(displayMax, numericValue));

    setValue(valueTransformer.fromDisplay(numericValue));
  };

  const handleWheelUpdate = (increment: number) => {
    const currentValue = valueTransformer.toDisplay(value);
    const displayMin = valueTransformer.toDisplay(min);
    const displayMax = valueTransformer.toDisplay(max);

    const newValue = Math.max(displayMin, Math.min(displayMax, currentValue + (increment * step)));
    setValue(valueTransformer.fromDisplay(newValue));
  };

  const handleWheel = useWheelCoalescer(beginCoalescing, endCoalescing);

  return (
    <div className="flex flex-col items-center w-[3.75rem]" title={label}>
      <div
        className={`${PANEL_CLASSES.inputWrapper} w-full cursor-ns-resize`}
        onWheel={(e) => handleWheel(e, handleWheelUpdate)}
      >
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value.replace(/[^0-9]/g, ''))}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            handleCommit();
            setIsFocused(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleCommit();
              e.currentTarget.blur();
            } else if (e.key === 'Escape') {
              setLocalValue(Math.round(valueTransformer.toDisplay(value)).toString());
              e.currentTarget.blur();
            }
          }}
          className={PANEL_CLASSES.input}
          aria-label={label}
        />
        <span className={PANEL_CLASSES.inputSuffix}>{unit}</span>
      </div>
    </div>
  );
});

