import React, { useState, useEffect } from 'react';
import { useWheelCoalescer } from '../../hooks/side-toolbar/useWheelCoalescer';

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
    const [localValue, setLocalValue] = useState(Math.round(valueTransformer.toDisplay(value)).toString());

    useEffect(() => {
        setLocalValue(Math.round(valueTransformer.toDisplay(value)).toString());
    }, [value, valueTransformer]);

    const handleCommit = () => {
        let numericValue = parseInt(localValue, 10);
        if (isNaN(numericValue)) numericValue = valueTransformer.toDisplay(min);
        
        const displayMin = valueTransformer.toDisplay(min);
        const displayMax = valueTransformer.toDisplay(max);

        numericValue = Math.max(displayMin, Math.min(displayMax, numericValue));
        
        setValue(valueTransformer.fromDisplay(numericValue));
        setLocalValue(numericValue.toString());
    };

    const handleWheelUpdate = (increment: number) => {
        const currentValue = valueTransformer.toDisplay(value);
        const displayMin = valueTransformer.toDisplay(min);
        const displayMax = valueTransformer.toDisplay(max);
        
        const newValue = Math.max(displayMin, Math.min(displayMax, Math.round(currentValue) + (increment * step)));
        setValue(valueTransformer.fromDisplay(newValue));
    };

    const handleWheel = useWheelCoalescer(beginCoalescing, endCoalescing);

    return (
        <div className="flex flex-col items-center gap-1 w-16" title={label}>
            <div 
                className="flex items-center bg-black/20 rounded-md h-9 px-2 w-full cursor-ns-resize" 
                onWheel={(e) => handleWheel(e, handleWheelUpdate)}
            >
                <input 
                    type="text" 
                    inputMode="numeric" 
                    pattern="[0-9]*" 
                    value={localValue} 
                    onChange={(e) => setLocalValue(e.target.value.replace(/[^0-9]/g, ''))} 
                    onBlur={handleCommit} 
                    onKeyDown={(e) => { if (e.key === 'Enter') { handleCommit(); (e.currentTarget as HTMLInputElement).blur(); } }} 
                    className="w-full bg-transparent text-sm text-center outline-none text-[var(--text-primary)] pointer-events-none" 
                    aria-label={label} 
                />
                <span className="text-sm text-[var(--text-secondary)]">{unit}</span>
            </div>
            <span className="text-xs font-medium text-[var(--text-secondary)] sidebar-label">{label}</span>
        </div>
    );
});