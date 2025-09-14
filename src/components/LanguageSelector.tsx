/**
 * 语言选择器组件
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import i18n, { supportedLangs, type Lang } from '@/lib/i18n';

/**
 * 语言选择器
 */
const LanguageSelector: React.FC = () => {
  const { t } = useTranslation();

  /**
   * 处理语言切换
   */
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value as Lang;
    void i18n.changeLanguage(newLang);
    localStorage.setItem('whiteboard_lang', newLang);
  };

  return (
    <label className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
      {t('language')}
      <select
        className="border rounded p-1 bg-[var(--ui-element-bg)]"
        value={i18n.language as Lang}
        onChange={handleChange}
      >
        {supportedLangs.map((l) => (
          <option key={l.code} value={l.code}>
            {t(l.labelKey)}
          </option>
        ))}
      </select>
    </label>
  );
};

export default LanguageSelector;

