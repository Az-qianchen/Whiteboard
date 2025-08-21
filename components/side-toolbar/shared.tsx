import React from 'react';
import { Switch } from '@headlessui/react';

interface SwitchControlProps {
  label: string;
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

export const SwitchControl: React.FC<SwitchControlProps> = React.memo(({ label, enabled, setEnabled }) => (
  <div className="flex items-center justify-between">
    <label htmlFor={label} className="text-sm font-medium text-[var(--text-primary)]">{label}</label>
    <Switch
      id={label}
      checked={enabled}
      onChange={setEnabled}
      className={`${enabled ? 'bg-[var(--accent-primary)]' : 'bg-black/30'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2 focus:ring-offset-[var(--ui-panel-bg)]`}
    >
      <span className={`${enabled ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
    </Switch>
  </div>
));


interface SliderProps {
  label: string;
  value: number;
  setValue: (n: number) => void;
  min: number;
  max: number;
  step: number;
  onInteractionStart: () => void;
  onInteractionEnd: () => void;
  displayValue?: string;
}

export const Slider: React.FC<SliderProps> = React.memo(({ label, value, setValue, min, max, step, onInteractionStart, onInteractionEnd, displayValue }) => {
  const handlePointerDown = () => {
    onInteractionStart();
    const handlePointerUp = () => { onInteractionEnd(); window.removeEventListener('pointerup', handlePointerUp); };
    window.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <div className="grid grid-cols-3 items-center gap-2">
      <label className="text-sm font-medium text-[var(--text-primary)]" htmlFor={label}>{label}</label>
      <div className="col-span-2">
        <input 
          type="range" 
          id={label} 
          min={min} 
          max={max} 
          step={step} 
          value={value} 
          onChange={(e) => setValue(Number(e.target.value))} 
          onPointerDown={handlePointerDown} 
          className="w-full themed-slider" 
        />
      </div>
      {displayValue && <span className="text-xs text-[var(--text-secondary)] col-start-2 col-span-2 text-center -mt-2">{displayValue}</span>}
    </div>
  );
});


export const EndpointGrid = <T extends string>({ label, options, value, onChange }: {
  label: string;
  options: { name: T; title: string; icon: JSX.Element }[];
  value: T;
  onChange: (value: T) => void;
}) => (
  <div className="flex flex-col gap-2">
    <label className="text-sm font-medium text-[var(--text-primary)]">{label}</label>
    <div className="grid grid-cols-3 gap-1 bg-black/20 rounded-md p-1 w-full">
      {options.map(opt => (
        <button
          key={opt.name}
          title={opt.title}
          onClick={() => onChange(opt.name)}
          className={`flex-1 flex justify-center items-center h-8 rounded-sm transition-colors text-[var(--text-secondary)] hover:bg-white/10 ${value === opt.name ? 'bg-white/20 !text-[var(--text-primary)]' : ''}`}
        >
          <div className="w-6 h-6">{opt.icon}</div>
        </button>
      ))}
    </div>
  </div>
);

interface SegmentedControlProps<T extends string> {
    label: string;
    options: { name: T; title: string; icon: JSX.Element }[];
    value: T;
    onChange: (value: T) => void;
    disabled?: boolean;
}

export const PopoverSegmentedControl = <T extends string>({ label, options, value, onChange, disabled = false }: SegmentedControlProps<T>) => (
  <div className="flex flex-col gap-2">
    <label className="text-sm font-medium text-[var(--text-primary)]">{label}</label>
    <div className={`flex items-center bg-black/20 rounded-md p-1 w-full ${disabled ? 'cursor-not-allowed' : ''}`}>
      {options.map(opt => (
        <button
          key={opt.name}
          title={opt.title}
          onClick={() => { if (!disabled) onChange(opt.name); }}
          disabled={disabled}
          className={`flex-1 flex justify-center items-center h-8 rounded-sm transition-colors text-[var(--text-secondary)] hover:bg-white/10 disabled:hover:bg-transparent ${value === opt.name ? 'bg-white/20 !text-[var(--text-primary)]' : ''}`}
        >
          <div className="w-6 h-6">{opt.icon}</div>
        </button>
      ))}
    </div>
  </div>
);