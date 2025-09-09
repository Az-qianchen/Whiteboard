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
    const [localValue, setLocalValue] = useState(() => Math.round(valueTransformer.toDisplay(value)).toString());
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        // 仅当输入框未聚焦时才从 value prop 更新。
        // 这可以防止在父组件因其他原因重新渲染时，
        // 用户的输入被覆盖。
        if (!isFocused) {
            setLocalValue(Math.round(valueTransformer.toDisplay(value)).toString());
        }
    }, [value, valueTransformer, isFocused]);

    const handleCommit = () => {
        let numericValue = parseInt(localValue, 10);
        if (isNaN(numericValue)) {
            // 如果输入为空或无效，则在失焦时恢复到上一个有效值。
            setLocalValue(Math.round(valueTransformer.toDisplay(value)).toString());
            return;
        }
        
        const displayMin = valueTransformer.toDisplay(min);
        const displayMax = valueTransformer.toDisplay(max);

        numericValue = Math.max(displayMin, Math.min(displayMax, numericValue));
        
        setValue(valueTransformer.fromDisplay(numericValue));
        // useEffect 现在将在 prop 更新且焦点丢失后同步 localValue。
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
        <div className="flex flex-col items-center w-16" title={label}>
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
                    className="w-full bg-transparent text-sm text-center outline-none text-[var(--text-primary)]" 
                    aria-label={label} 
                />
                <span className="text-sm text-[var(--text-secondary)]">{unit}</span>
            </div>
        </div>
    );
});
