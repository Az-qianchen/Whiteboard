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
      menu: 'Menu',
      layers: 'Layers',
      open: 'Open…',
      save: 'Save',
      saveAs: 'Save As…',
      import: 'Import…',
      backgroundColor: 'Background Color…',
      canvasBackground: 'Canvas Background…',
      exportSvg: 'Export as SVG…',
      exportPng: 'Export as PNG…',
      exportAnimation: 'Export Animation…',
      resetPreferences: 'Reset Preferences',
      clearData: 'Clear Data',
      canvas: 'Canvas',
      expandInfo: 'Expand Info',
      collapseInfo: 'Collapse Info',
      elements: 'Elements',
      zoom: 'Zoom',
      selection: 'Selection',
      confirm: 'Confirm',
      cancel: 'Cancel',
      traceImage: 'Convert image to vector',
      colorsCount: 'Colors',
      lineThreshold: 'Line threshold',
      curveThreshold: 'Curve threshold',
      pathOmit: 'Path omit',
      vectorize: 'Vectorize',
      expandTimeline: 'Expand timeline',
      collapseTimeline: 'Collapse timeline',
      undo: 'Undo ({{shortcut}})',
      redo: 'Redo ({{shortcut}})',
    },
  },
  zh: {
    translation: {
      language: '语言',
      en: '英语',
      zh: '中文',
      appTitle: '画板',
      untitled: '未命名',
      menu: '菜单',
      layers: '图层',
      open: '打开…',
      save: '保存',
      saveAs: '另存为…',
      import: '导入…',
      backgroundColor: '背景颜色…',
      canvasBackground: '画布背景…',
      exportSvg: '导出为 SVG…',
      exportPng: '导出为 PNG…',
      exportAnimation: '导出动画…',
      resetPreferences: '重置偏好设置',
      clearData: '清空数据',
      canvas: '画布',
      expandInfo: '展开信息',
      collapseInfo: '折叠信息',
      elements: '元素',
      zoom: '缩放',
      selection: '选区',
      confirm: '确认',
      cancel: '取消',
      traceImage: '将图片转换为矢量图',
      colorsCount: '颜色数量',
      lineThreshold: '直线阈值',
      curveThreshold: '曲线阈值',
      pathOmit: '路径忽略',
      vectorize: '矢量化',
      expandTimeline: '展开时间线',
      collapseTimeline: '折叠时间线',
      undo: '撤销 ({{shortcut}})',
      redo: '重做 ({{shortcut}})',
    },
  },
} as const;

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
  abbr: string;
}[] = [
  { code: 'en', abbr: 'EN' },
  { code: 'zh', abbr: 'CN' },
];

export default i18n;
