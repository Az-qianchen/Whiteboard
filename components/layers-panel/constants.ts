/**
 * 本文件存放图层面板相关的常量和辅助函数。
 */
import { ICONS } from '../../constants';
import type { AnyPath, GroupData } from '../../types';

/**
 * 根据路径的工具类型返回对应的图标。
 * @param tool - 路径的工具类型。
 * @param path - （可选）完整的路径对象，用于检查特定属性（如是否为遮罩组）。
 * @returns 对应的 JSX 图标元素或 null。
 */
export const getToolIcon = (tool: AnyPath['tool'], path?: AnyPath) => {
  if (path && path.tool === 'group' && (path as GroupData).mask === 'clip') {
    return ICONS.MASK;
  }
  switch (tool) {
    case 'rectangle': return ICONS.RECTANGLE;
    case 'ellipse': return ICONS.ELLIPSE;
    case 'pen': return ICONS.PEN;
    case 'line': return ICONS.LINE;
    case 'brush': return ICONS.BRUSH;
    case 'polygon': return ICONS.POLYGON;
    case 'arc': return ICONS.ARC;
    case 'image': return ICONS.IMAGE;
    case 'group': return ICONS.GROUP;
    case 'text': return ICONS.TEXT;
    default: return null;
  }
};

/**
 * 将字符串的首字母大写。
 * @param s - 输入字符串。
 * @returns 首字母大写后的字符串。
 */
export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);