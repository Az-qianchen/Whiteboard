/**
 * 国际化配置
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

export type Lang = 'en' | 'zh';

/**
 * 翻译资源
 */
const resources = {
  en: {
    translation: {
      language: 'Language',
      en: 'English',
      zh: 'Chinese',
      appTitle: 'Whiteboard',
      untitled: 'Untitled',
    },
  },
  zh: {
    translation: {
      language: '语言',
      en: '英语',
      zh: '中文',
      appTitle: '画板',
      untitled: '未命名',
    },
  },
} as const;

export type TranslationKey = keyof typeof resources.en.translation;

const storedLang = localStorage.getItem('whiteboard_lang') as Lang | null;

void i18n.use(initReactI18next).init({
  resources,
  lng: storedLang ?? 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

/**
 * 支持的语言列表
 */
export const supportedLangs: {
  code: Lang;
  labelKey: TranslationKey;
  abbr: string;
}[] = [
  { code: 'en', labelKey: 'en', abbr: 'EN' },
  { code: 'zh', labelKey: 'zh', abbr: 'CN' },
];

export default i18n;
