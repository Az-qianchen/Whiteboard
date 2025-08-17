

import React, { useState, useEffect, useRef } from 'react';
import { HSLA, parseColor, hslaToHslaString, hslaToHex } from '../lib/color';

// Reduced preset colors as requested
const PRESET_COLORS = [
  '#FFFFFF', // White
  '#EF4444', // Red
  '#F97316', // Orange
  '#3B82F6', // Blue
  '#22C55E', // Green
  '#A855F7', // Purple
];

interface ColorPickerProps {
  color: string;
  onChange: (newColor: string) => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ color, onChange, onInteractionStart, onInteractionEnd }) => {
  const [hsla, setHsla] = useState<HSLA>(() => parseColor(color));
  const [hexInput, setHexInput] = useState(() => hslaToHex(hsla));
  const pickerRef = useRef<HTMLDivElement>(null);

  // Update internal state if the prop changes from outside
  useEffect(() => {
    const newHsla = parseColor(color);
    setHsla(newHsla);
    setHexInput(hslaToHex(newHsla));
  }, [color]);

  const handleHslaChange = (newHsla: Partial<HSLA>) => {
    const updatedHsla = { ...hsla, ...newHsla };
    setHsla(updatedHsla);
    setHexInput(hslaToHex(updatedHsla));
    onChange(hslaToHslaString(updatedHsla));
  };
  
  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHexInput(e.target.value);
  };

  const handleHexInputCommit = () => {
    const newHsla = parseColor(hexInput);
    const finalHsla = {...newHsla, a: hsla.a};
    setHsla(finalHsla);
    onChange(hslaToHslaString(finalHsla));
  };
  
  const handleAlphaInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      value = Math.max(0, Math.min(100, value));
      handleHslaChange({ a: value / 100 });
    }
  };

  const createSliderHandler = (updateFn: (percentage: number) => void, snapSteps?: number) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    
    onInteractionStart?.();
    const sliderElement = e.currentTarget;
    sliderElement.setPointerCapture(e.pointerId);
    const rect = sliderElement.getBoundingClientRect();

    const updateValue = (event: PointerEvent) => {
      const x = Math.max(0, Math.min(event.clientX - rect.left, rect.width));
      let percentage = x / rect.width;
      if (snapSteps) {
        percentage = Math.round(percentage * snapSteps) / snapSteps;
      }
      updateFn(percentage);
    };
    
    updateValue(e.nativeEvent);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      updateValue(moveEvent);
    };

    const handlePointerUp = () => {
      sliderElement.releasePointerCapture(e.pointerId);
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      onInteractionEnd?.();
    };
    
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  const handleEyeDropper = async () => {
    if (!('EyeDropper' in window)) {
        alert("Your browser does not support the EyeDropper API.");
        return;
    }
    try {
        const eyeDropper = new (window as any).EyeDropper();
        const result = await eyeDropper.open();
        onChange(result.sRGBHex);
    } catch (e) {
      // User cancelled the eyedropper
    }
  };
  
  const { h, s, l } = hsla;
  const hueBackground = `linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))`;
  const saturationBackground = `linear-gradient(to right, hsl(${h}, 0%, ${l}%), hsl(${h}, 100%, ${l}%))`;
  const lightnessBackground = `linear-gradient(to right, hsl(${h}, ${s}%, 0%), hsl(${h}, ${s}%, 50%), hsl(${h}, ${s}%, 100%))`;
  const alphaBackground = `linear-gradient(to right, hsla(${h}, ${s}%, ${l}%, 0), hsla(${h}, ${s}%, ${l}%, 1))`;
  const checkerboard = 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)';

  return (
    <div ref={pickerRef} className="w-64 bg-[var(--ui-popover-bg)] backdrop-blur-lg p-4 rounded-xl shadow-lg z-20 border border-[var(--ui-panel-border)]">
      <div className="space-y-3">
        {/* Hue Slider */}
        <div className="relative h-4 cursor-pointer" onPointerDown={createSliderHandler((p) => handleHslaChange({ h: p * 360 }))}>
            <div className="w-full h-2 rounded-lg absolute top-1/2 -translate-y-1/2" style={{ background: hueBackground }} />
            <div
                className="absolute w-4 h-4 -translate-y-1/2 -translate-x-1/2 top-1/2 rounded-full bg-white shadow-md ring-1 ring-white/20"
                style={{ left: `${(hsla.h / 360) * 100}%` }}
            />
        </div>

        {/* Saturation Slider */}
        <div className="relative h-4 cursor-pointer" onPointerDown={createSliderHandler((p) => handleHslaChange({ s: p * 100 }), 20)}>
            <div className="w-full h-2 rounded-lg absolute top-1/2 -translate-y-1/2" style={{ background: saturationBackground }} />
            <div
                className="absolute w-4 h-4 -translate-y-1/2 -translate-x-1/2 top-1/2 rounded-full shadow-md ring-1 ring-white/20"
                style={{ left: `${hsla.s}%`, backgroundColor: hslaToHslaString(hsla) }}
            />
        </div>

        {/* Lightness Slider */}
        <div className="relative h-4 cursor-pointer" onPointerDown={createSliderHandler((p) => handleHslaChange({ l: p * 100 }), 20)}>
            <div className="w-full h-2 rounded-lg absolute top-1/2 -translate-y-1/2" style={{ background: lightnessBackground }} />
            <div
                className="absolute w-4 h-4 -translate-y-1/2 -translate-x-1/2 top-1/2 rounded-full shadow-md ring-1 ring-white/20"
                style={{ left: `${hsla.l}%`, backgroundColor: hslaToHslaString(hsla) }}
            />
        </div>

        {/* Alpha Slider */}
        <div className="relative h-4 cursor-pointer" onPointerDown={createSliderHandler((p) => handleHslaChange({ a: p }), 20)}>
            <div className="w-full h-2 rounded-lg absolute top-1/2 -translate-y-1/2 bg-gray-600"/>
            <div className="w-full h-2 rounded-lg absolute top-1/2 -translate-y-1/2" style={{ background: alphaBackground }}/>
            <div
                className="absolute w-4 h-4 -translate-y-1/2 -translate-x-1/2 top-1/2 rounded-full bg-white shadow-md ring-1 ring-white/20"
                style={{ left: `${hsla.a * 100}%` }}
            />
        </div>
        
        <div className="flex items-center justify-between gap-2 pt-1">
           <div className="flex items-center bg-black/20 rounded-md h-9 px-2 w-[100px]">
             <input
               type="text"
               value={hexInput}
               onChange={handleHexInputChange}
               onBlur={handleHexInputCommit}
               onKeyDown={(e) => { if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur() }}
               className="w-full text-sm font-mono bg-transparent text-[var(--text-primary)] focus:outline-none"
               aria-label="Hex color value"
             />
           </div>
           
           <div className="flex items-center bg-black/20 rounded-md h-9 px-2 w-[70px]">
               <input
                 type="number"
                 min="0"
                 max="100"
                 value={Math.round(hsla.a * 100)}
                 onChange={handleAlphaInputChange}
                 onBlur={(e) => { if (e.target.value === '') handleHslaChange({a: 1})}}
                 className="w-full bg-transparent text-sm text-center outline-none text-[var(--text-primary)] hide-spinners"
                 aria-label="Alpha percentage"
               />
               <span className="text-sm text-[var(--text-secondary)]">%</span>
           </div>
           
            {'EyeDropper' in window && (
                <button onClick={handleEyeDropper} className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-lg text-[var(--text-secondary)] bg-white/10 hover:bg-white/20 transition-colors" title="Pick color from screen">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 2-4.3 4.3a1 1 0 0 0 0 1.4l.7.7a1 1 0 0 0 1.4 0L18 4Z"/><path d="m20.3 6.7.7-.7a1 1 0 0 0 0-1.4l-2.6-2.6a1 1 0 0 0-1.4 0l-.7.7"/><path d="m14 8-4 4-1 3 3-1 4-4"/><path d="m18 12 2-2"/><path d="m2 22 5.5-1.5L21.5 6.5l-4-4L3.5 16.5 2 22Z"/></svg>
                </button>
            )}
        </div>
        
      </div>

      <div className="grid grid-cols-7 gap-2 mt-4">
        {PRESET_COLORS.map(c => (
          <button
            key={c}
            onClick={() => {
                const newHsla = parseColor(c);
                // When selecting a preset, preserve the current alpha
                handleHslaChange({...newHsla, a: hsla.a});
            }}
            className="w-full aspect-square rounded-full ring-1 ring-inset ring-white/10"
            style={{ backgroundColor: c }}
            aria-label={`Select color ${c}`}
          />
        ))}
         <button
            onClick={() => handleHslaChange({a: 0})}
            className="w-full aspect-square rounded-full ring-1 ring-inset ring-white/10 bg-white"
            style={{ backgroundImage: checkerboard, backgroundSize: '8px 8px' }}
            aria-label="Select transparent"
          />
      </div>
    </div>
  );
};