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
      documentStatusSaved: 'All changes saved',
      documentStatusUnsaved: 'Unsaved changes',
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
      toolSelect: 'Select (V)',
      toolPen: 'Pen (P)',
      toolBrush: 'Brush (B)',
      toolPolygon: 'Polygon',
      toolRectangle: 'Rectangle (R)',
      toolEllipse: 'Ellipse (O)',
      toolLine: 'Line (L)',
      toolArc: 'Arc (A)',
      toolText: 'Text (T)',
      toolFrame: 'Frame (F)',
      gridSettings: 'Grid settings',
      showGrid: 'Show grid',
      gridSize: 'Grid size',
      subdivisions: 'Subdivisions',
      opacity: 'Opacity',
      modeMove: 'Move/Transform (M)',
      modeEdit: 'Edit anchors (V)',
      modeLasso: 'Lasso selection',
      simplifyPath: 'Simplify path',
      simplify: 'Simplify',
      removeBackground: 'Remove background',
      contiguous: 'Contiguous',
      threshold: 'Threshold',
      clickImageToSelectArea: 'Click image to select area',
      remove: 'Remove',
      alignDistribute: 'Align & distribute',
      align: 'Align',
      alignLeft: 'Align left',
      alignHorizontalCenter: 'Horizontal center',
      alignRight: 'Align right',
      alignTop: 'Align top',
      alignVerticalCenter: 'Vertical center',
      alignBottom: 'Align bottom',
      distribute: 'Distribute',
      horizontal: 'Horizontal',
      vertical: 'Vertical',
      evenSpacing: 'Even spacing',
      edges: 'Edges',
      centers: 'Centers',
      fixedSpacing: 'Fixed spacing',
      auto: 'Auto',
      booleanOps: 'Boolean operations',
      union: 'Union',
      subtract: 'Subtract',
      intersect: 'Intersect',
      exclude: 'Exclude',
      divide: 'Divide',
      useTopAsMask: 'Use top object as mask',
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
      documentStatusSaved: '已保存',
      documentStatusUnsaved: '未保存',
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
      toolSelect: '选择 (V)',
      toolPen: '钢笔 (P)',
      toolBrush: '画笔 (B)',
      toolPolygon: '多边形',
      toolRectangle: '矩形 (R)',
      toolEllipse: '椭圆 (O)',
      toolLine: '线条 (L)',
      toolArc: '圆弧 (A)',
      toolText: '文字 (T)',
      toolFrame: '画框 (F)',
      gridSettings: '网格设置',
      showGrid: '显示网格',
      gridSize: '网格大小',
      subdivisions: '细分',
      opacity: '透明度',
      modeMove: '移动/变换 (M)',
      modeEdit: '编辑锚点 (V)',
      modeLasso: '套索选择',
      simplifyPath: '简化路径',
      simplify: '简化',
      removeBackground: '抠图',
      contiguous: '连续',
      threshold: '阈值',
      clickImageToSelectArea: '点击图片以选择区域',
      remove: '扣除',
      alignDistribute: '对齐与分布',
      align: '对齐',
      alignLeft: '左对齐',
      alignHorizontalCenter: '水平居中',
      alignRight: '右对齐',
      alignTop: '顶端对齐',
      alignVerticalCenter: '垂直居中',
      alignBottom: '底端对齐',
      distribute: '分布',
      horizontal: '水平',
      vertical: '垂直',
      evenSpacing: '均匀间隔',
      edges: '边',
      centers: '中心',
      fixedSpacing: '固定间距',
      auto: '自动',
      booleanOps: '布尔运算',
      union: '并集',
      subtract: '减去',
      intersect: '相交',
      exclude: '排除',
      divide: '修剪',
      useTopAsMask: '使用顶层对象作为蒙版',
    },
  },
} as const;

const storedLang = localStorage.getItem('whiteboard_lang') as Lang | null;

/**
 * 检测系统语言
 */
const detectSystemLang = (): Lang | null => {
  if (typeof navigator === 'undefined') {
    return null;
  }
  const lang = navigator.language.split('-')[0] as Lang;
  return ['en', 'zh'].includes(lang) ? lang : null;
};

const systemLang = detectSystemLang();

void i18n.use(initReactI18next).init({
  resources,
  lng: storedLang ?? systemLang ?? 'en',
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
