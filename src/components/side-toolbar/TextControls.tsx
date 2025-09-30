import React from 'react';
import { useTranslation } from 'react-i18next';
import { PANEL_CLASSES } from '@/components/panelStyles';
import PanelButton from '@/components/PanelButton';
import { ICONS } from '@/constants';
import { NumericInput } from './NumericInput';
import { TEXT_FONT_OPTIONS } from '@/lib/text';

interface TextControlsProps {
  fontFamily: string;
  setFontFamily: (value: string) => void;
  fontSize: number;
  setFontSize: (value: number) => void;
  textAlign: 'left' | 'center' | 'right';
  setTextAlign: (value: 'left' | 'center' | 'right') => void;
  beginCoalescing: () => void;
  endCoalescing: () => void;
}

export function TextControls({
  fontFamily,
  setFontFamily,
  fontSize,
  setFontSize,
  textAlign,
  setTextAlign,
  beginCoalescing,
  endCoalescing,
}: TextControlsProps) {
  const { t } = useTranslation();
  const fontFamilyLabel = t('sideToolbar.text.fontFamily');
  const fontSizeLabel = t('sideToolbar.text.fontSize');
  const alignLabel = t('sideToolbar.text.align');

  const alignOptions: Array<{ value: 'left' | 'center' | 'right'; icon: JSX.Element; label: string }> = [
    { value: 'left', icon: ICONS.ALIGN_LEFT, label: t('alignLeft') },
    { value: 'center', icon: ICONS.ALIGN_HORIZONTAL_CENTER, label: t('alignHorizontalCenter') },
    { value: 'right', icon: ICONS.ALIGN_RIGHT, label: t('alignRight') },
  ];

  return (
    <div className="w-full flex flex-col gap-2">
      <div>
        <label className={`${PANEL_CLASSES.label} text-[var(--text-primary)] block mb-1`}>{fontFamilyLabel}</label>
        <div className={`${PANEL_CLASSES.inputWrapper} w-full`}>
          <select
            value={fontFamily}
            onChange={(event) => setFontFamily(event.target.value)}
            className={`${PANEL_CLASSES.input} pr-8 appearance-none cursor-pointer`}
          >
            {TEXT_FONT_OPTIONS.map(option => (
              <option key={option.value} value={option.value} className="bg-[var(--ui-popover-bg)] text-[var(--text-primary)]">
                {t(option.labelKey)}
              </option>
            ))}
          </select>
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none">
            {ICONS.CHEVRON_DOWN}
          </span>
        </div>
      </div>

      <NumericInput
        label={fontSizeLabel}
        value={fontSize}
        setValue={setFontSize}
        min={1}
        max={512}
        step={1}
        unit="px"
        beginCoalescing={beginCoalescing}
        endCoalescing={endCoalescing}
      />

      <div>
        <span className={`${PANEL_CLASSES.label} text-[var(--text-primary)] block mb-1`}>{alignLabel}</span>
        <div className="flex items-center gap-1">
          {alignOptions.map(option => (
            <PanelButton
              key={option.value}
              type="button"
              title={option.label}
              variant="unstyled"
              onClick={() => setTextAlign(option.value)}
              className={`flex-1 h-9 rounded-md flex items-center justify-center transition-colors text-[var(--text-secondary)] ${
                textAlign === option.value
                  ? 'bg-[var(--accent-bg)] !text-[var(--accent-primary)]'
                  : 'hover:bg-[var(--ui-element-bg-hover)]'
              }`}
            >
              {option.icon}
            </PanelButton>
          ))}
        </div>
      </div>
    </div>
  );
}
