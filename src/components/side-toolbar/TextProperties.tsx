/**
 * Text-specific controls shown in the side toolbar. Allows configuring
 * default text styles as well as adjusting selected text nodes.
 */
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import PanelButton from '@/components/PanelButton';
import { ICONS, DEFAULT_TEXT_FONT_FAMILY } from '@/constants';
import { NumericInput } from './NumericInput';
import { Slider } from './shared';
import { PANEL_CLASSES } from '../panelStyles';

export interface TextPropertiesProps {
  text: string;
  setText: (value: string) => void;
  fontFamily: string;
  setFontFamily: (family: string) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  lineHeight: number;
  setLineHeight: (value: number) => void;
  textAlign: 'left' | 'center' | 'right';
  setTextAlign: (align: 'left' | 'center' | 'right') => void;
  beginCoalescing: () => void;
  endCoalescing: () => void;
}

const FONT_OPTIONS = [
  { value: DEFAULT_TEXT_FONT_FAMILY, key: 'sideToolbar.text.fontVirgil' },
  { value: '"Inter", "Segoe UI", sans-serif', key: 'sideToolbar.text.fontSans' },
  { value: '"Georgia", "Times New Roman", serif', key: 'sideToolbar.text.fontSerif' },
  { value: '"Fira Code", "SFMono-Regular", Menlo, monospace', key: 'sideToolbar.text.fontMono' },
];

export const TextProperties: React.FC<TextPropertiesProps> = ({
  text,
  setText,
  fontFamily,
  setFontFamily,
  fontSize,
  setFontSize,
  lineHeight,
  setLineHeight,
  textAlign,
  setTextAlign,
  beginCoalescing,
  endCoalescing,
}) => {
  const { t } = useTranslation();
  const alignOptions = useMemo(
    () => [
      { value: 'left' as const, icon: ICONS.ALIGN_LEFT, title: t('sideToolbar.text.alignLeft') },
      { value: 'center' as const, icon: ICONS.ALIGN_HORIZONTAL_CENTER, title: t('sideToolbar.text.alignCenter') },
      { value: 'right' as const, icon: ICONS.ALIGN_RIGHT, title: t('sideToolbar.text.alignRight') },
    ],
    [t],
  );

  const handleFontFamilyChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    beginCoalescing();
    setFontFamily(event.target.value);
    endCoalescing();
  };

  const handleTextAlign = (value: 'left' | 'center' | 'right') => {
    beginCoalescing();
    setTextAlign(value);
    endCoalescing();
  };

  return (
    <div className="flex flex-col items-center w-40 gap-3 text-[var(--text-primary)]">
      <div className="w-full">
        <label className={`${PANEL_CLASSES.label} mb-1 block text-[var(--text-primary)]`} htmlFor="text-content-input">
          {t('sideToolbar.text.content')}
        </label>
        <textarea
          id="text-content-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full h-20 rounded-lg bg-[var(--ui-element-bg)] border border-[var(--ui-panel-border)] text-sm px-2 py-1 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] resize-none"
        />
      </div>

      <div className="w-full flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className={`${PANEL_CLASSES.label} text-[var(--text-primary)]`} htmlFor="text-font-family">
            {t('sideToolbar.text.fontFamily')}
          </label>
          <select
            id="text-font-family"
            value={fontFamily}
            onChange={handleFontFamilyChange}
            className="w-full rounded-lg bg-[var(--ui-element-bg)] border border-[var(--ui-panel-border)] px-2 py-1 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
          >
            {FONT_OPTIONS.map(option => (
              <option key={option.value} value={option.value} style={{ fontFamily: option.value }}>
                {t(option.key)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className={`${PANEL_CLASSES.label} text-[var(--text-primary)]`}>{t('sideToolbar.text.fontSize')}</span>
          <NumericInput
            label={t('sideToolbar.text.fontSize')}
            value={fontSize}
            setValue={setFontSize}
            min={6}
            max={320}
            step={1}
            unit="px"
            beginCoalescing={beginCoalescing}
            endCoalescing={endCoalescing}
          />
        </div>

        <Slider
          label={t('sideToolbar.text.lineHeight')}
          value={lineHeight}
          setValue={setLineHeight}
          min={0.5}
          max={3}
          step={0.05}
          onInteractionStart={beginCoalescing}
          onInteractionEnd={endCoalescing}
          displayValue={`${lineHeight.toFixed(2)}×`}
        />

        <div className="flex flex-col gap-1">
          <span className={`${PANEL_CLASSES.label} text-[var(--text-primary)]`}>{t('sideToolbar.text.align')}</span>
          <div className={`${PANEL_CLASSES.segmentGroup} w-full`}>
            {alignOptions.map(option => (
              <PanelButton
                key={option.value}
                variant="unstyled"
                title={option.title}
                onClick={() => handleTextAlign(option.value)}
                className={`flex-1 flex justify-center items-center h-8 rounded-sm transition-colors text-[var(--text-secondary)] hover:bg-[var(--ui-element-bg-hover)] ${textAlign === option.value ? 'bg-[var(--accent-bg)] !text-[var(--accent-primary)]' : ''}`}
              >
                <div className="w-6 h-6">{option.icon}</div>
              </PanelButton>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
