import React from 'react';
import { Switch } from '@headlessui/react';
import { FloatingColorPicker } from '../FloatingColorPicker';
import PanelButton from '@/components/PanelButton';
import { PANEL_CLASSES } from '../panelStyles';

interface SwitchControlProps {
  label: string;
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

export const SwitchControl: React.FC<SwitchControlProps> = React.memo(({ label, enabled, setEnabled }) => (
  <div className={`${PANEL_CLASSES.control} justify-between`}>
    <label htmlFor={label} className={`${PANEL_CLASSES.label} text-[var(--text-primary)]`}>{label}</label>
    <Switch
      id={label}
      checked={enabled}
      onChange={setEnabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2 focus:ring-offset-[var(--ui-panel-bg)] border ${enabled ? 'bg-[var(--accent-bg)] border-[var(--accent-primary)]' : 'bg-black/30 border-transparent'}`}
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

  const sliderProgress = max === min ? 0 : ((value - min) / (max - min)) * 100;
  const clampedProgress = Math.min(100, Math.max(0, sliderProgress));

  return (
    <div className="flex items-center gap-4 min-h-[2rem] w-full">
      <label
        className={`${PANEL_CLASSES.label} text-[var(--text-primary)] flex items-center leading-tight w-32 shrink-0 text-left whitespace-normal`}
        htmlFor={label}
      >
        {label}
      </label>
      <div className="w-full flex flex-col justify-center flex-1">
        <input
          type="range"
          id={label}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          onPointerDown={handlePointerDown}
          className="w-full h-6 themed-slider"
          style={{ '--slider-progress': `${clampedProgress}%` } as React.CSSProperties}
        />
        {displayValue && <span className="text-xs text-[var(--text-secondary)] block text-center mt-1 leading-none">{displayValue}</span>}
      </div>
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
    <label className={`${PANEL_CLASSES.label} text-[var(--text-primary)]`}>{label}</label>
    <div className={`${PANEL_CLASSES.segmentGrid} grid-cols-3`}>
      {options.map(opt => (
        <PanelButton
          variant="unstyled"
          key={opt.name}
          title={opt.title}
          onClick={() => onChange(opt.name)}
          className={`flex-1 flex justify-center items-center h-8 rounded-sm transition-colors text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)] ${value === opt.name ? 'bg-[var(--accent-bg)] !text-[var(--accent-primary)]' : ''}`}
        >
          <div className="w-6 h-6">{opt.icon}</div>
        </PanelButton>
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
    <label className={`${PANEL_CLASSES.label} text-[var(--text-primary)]`}>{label}</label>
    <div className={`${PANEL_CLASSES.segmentGroup} w-full ${disabled ? 'cursor-not-allowed' : ''}`}>
      {options.map(opt => (
        <PanelButton
          variant="unstyled"
          key={opt.name}
          title={opt.title}
          onClick={() => { if (!disabled) onChange(opt.name); }}
          disabled={disabled}
          className={`flex-1 flex justify-center items-center h-8 rounded-sm transition-colors text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)] disabled:hover:bg-transparent ${value === opt.name ? 'bg-[var(--accent-bg)] !text-[var(--accent-primary)]' : ''}`}
        >
          <div className="w-6 h-6">{opt.icon}</div>
        </PanelButton>
      ))}
    </div>
  </div>
);

export const PopoverColorControl: React.FC<{ label: string, color: string, setColor: (c: string) => void, onInteractionStart: () => void, onInteractionEnd: () => void }> = ({ label, color, setColor, onInteractionStart, onInteractionEnd }) => {
    const isTransparent = color === 'transparent' || (color.includes('rgba') && color.endsWith('0)')) || (color.includes('hsla') && color.endsWith('0)'));
    const checkerboardStyle = {
        backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
        backgroundSize: '8px 8px',
    };
    return (
        <div className="grid grid-cols-[auto,1fr] items-center gap-x-4">
            <label className={`${PANEL_CLASSES.label} text-[var(--text-primary)] whitespace-nowrap`}>{label}</label>
            <FloatingColorPicker
                color={color}
                onChange={setColor}
                onInteractionStart={onInteractionStart}
                onInteractionEnd={onInteractionEnd}
                placement="left"
            >
                {({ ref, onClick }) => (
                    <PanelButton
                        variant="unstyled"
                        ref={ref as any}
                        onClick={onClick}
                        className="h-6 w-full rounded-md ring-1 ring-inset ring-white/10"
                        style={{ backgroundColor: isTransparent ? 'transparent' : color, ...(isTransparent && checkerboardStyle) }}
                    />
                )}
            </FloatingColorPicker>
        </div>
    );
};
