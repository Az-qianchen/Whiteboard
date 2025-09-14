import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

export type Lang = 'en' | 'zh';

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

export const supportedLangs: { code: Lang; labelKey: TranslationKey }[] = [
  { code: 'en', labelKey: 'en' },
  { code: 'zh', labelKey: 'zh' },
];

export default i18n;
