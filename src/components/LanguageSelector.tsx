/**
 * 语言选择器组件
 */
import React, { Fragment } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import { ICONS } from '@/constants';
import PanelButton from '@/components/PanelButton';
import i18n, { supportedLangs, type Lang } from '@/lib/i18n';

/**
 * 语言选择器
 */
const LanguageSelector: React.FC = () => {
  const { t } = useTranslation();

  /**
   * 处理语言切换
   */
  const handleSelect = (newLang: Lang, close: () => void) => {
    void i18n.changeLanguage(newLang);
    localStorage.setItem('whiteboard_lang', newLang);
    close();
  };

  const currentLang = i18n.language as Lang;
  const currentLabel = t(
    supportedLangs.find((l) => l.code === currentLang)?.labelKey ?? ''
  );

  return (
    <label className="flex flex-col gap-1 text-sm text-[var(--text-primary)]">
      {t('language')}
      <Popover className="relative">
        <Popover.Button
          as={PanelButton}
          variant="unstyled"
          className="w-full flex items-center justify-between p-2 h-9 rounded-md bg-black/20 text-sm text-left text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]"
        >
          <span className="truncate">{currentLabel}</span>
          <div className="w-4 h-4 text-[var(--text-secondary)] flex-shrink-0">{ICONS.CHEVRON_DOWN}</div>
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
          <Popover.Panel className="absolute bottom-full mb-2 w-full max-h-48 overflow-y-auto bg-[var(--ui-popover-bg)] backdrop-blur-lg rounded-xl shadow-lg border border-[var(--ui-panel-border)] z-30 p-1">
            {({ close }) => (
              <div className="flex flex-col gap-1">
                {supportedLangs.map((l) => (
                  <PanelButton
                    key={l.code}
                    variant="unstyled"
                    onClick={() => handleSelect(l.code as Lang, close)}
                    className={`w-full text-left p-2 rounded-md text-sm ${
                      currentLang === l.code
                        ? 'bg-[var(--accent-bg)] text-[var(--accent-primary)]'
                        : 'hover:bg-[var(--ui-element-bg-hover)] text-[var(--text-primary)]'
                    }`}
                  >
                    {t(l.labelKey)}
                  </PanelButton>
                ))}
              </div>
            )}
          </Popover.Panel>
        </Transition>
      </Popover>
    </label>
  );
};

export default LanguageSelector;

