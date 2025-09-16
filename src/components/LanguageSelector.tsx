/**
 * 语言选择器组件
 */
import React, { Fragment, useCallback, useRef } from 'react';
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
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  /**
   * 移除触发按钮焦点，确保下次点击依旧显示聚焦效果
   */
  const releaseFocus = useCallback(() => {
    buttonRef.current?.blur();
  }, []);

  /**
   * 处理语言切换
   */
  const handleSelect = (newLang: Lang, close: () => void) => {
    void i18n.changeLanguage(newLang);
    localStorage.setItem('whiteboard_lang', newLang);
    close();
    releaseFocus();
  };

  const currentLang = i18n.language as Lang;
  const currentInfo = supportedLangs.find((l) => l.code === currentLang);

  return (
    <Popover className="relative w-full">
      <Popover.Button
        as={PanelButton}
        variant="unstyled"
        ref={buttonRef}
        className="w-full flex items-center gap-2 px-2 py-1 rounded-md text-sm text-left text-[var(--text-primary)] hover:bg-[var(--ui-hover-bg)] focus-visible:ring-2 ring-[var(--accent-primary)]"
      >
        <div className="w-4 h-4 flex items-center justify-center text-[var(--text-secondary)]">{ICONS.LANGUAGE}</div>
        <span className="flex-grow">{t('language')}</span>
        <div className="flex items-center gap-1">
          <span>{currentInfo?.abbr}</span>
          <div className="w-4 h-4 text-[var(--text-secondary)] flex-shrink-0">{ICONS.CHEVRON_DOWN}</div>
        </div>
      </Popover.Button>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
        afterLeave={releaseFocus}
      >
        <Popover.Panel className="absolute right-0 mt-2 w-full max-h-48 overflow-y-auto bg-[var(--ui-popover-bg)] backdrop-blur-lg rounded-xl shadow-lg border border-[var(--ui-panel-border)] z-30 p-1">
          {({ close }) => (
            <div className="flex flex-col gap-1">
              {supportedLangs.map((l) => (
                <PanelButton
                  key={l.code}
                  variant="unstyled"
                  onClick={() => handleSelect(l.code as Lang, close)}
                  className={`w-full flex items-center justify-between p-2 rounded-md text-left text-sm ${
                    currentLang === l.code
                      ? 'bg-[var(--accent-bg)] text-[var(--accent-primary)]'
                      : 'hover:bg-[var(--ui-element-bg-hover)] text-[var(--text-primary)]'
                  }`}
                >
                  <span>{l.abbr}</span>
                  {currentLang === l.code && (
                    <div className="w-4 h-4 flex-shrink-0">{ICONS.CHECK}</div>
                  )}
                </PanelButton>
              ))}
            </div>
          )}
        </Popover.Panel>
      </Transition>
    </Popover>
  );
};

export default LanguageSelector;

