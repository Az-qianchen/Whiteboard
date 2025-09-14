/**
 * 本文件存放图层面板相关的常量和辅助函数。
 */
import React from 'react';
import { ICONS } from '../../constants';
import type { AnyPath, GroupData } from '../../types';

/**
 * 将图标尺寸调整为与菜单统一
 * @param icon - 原始图标元素
 * @returns 调整尺寸后的图标元素
 */
export const withLayerIconSize = (icon: JSX.Element) =>
  React.cloneElement(icon, { className: 'h-4 w-4' });

/**
 * 根据路径的工具类型返回对应的图标。
 * @param tool - 路径的工具类型。
 * @param path - （可选）完整的路径对象，用于检查特定属性（如是否为遮罩组）。
 * @returns 对应的 JSX 图标元素或 null。
 */
export const getToolIcon = (tool: AnyPath['tool'], path?: AnyPath) => {
  if (path && path.tool === 'group' && (path as GroupData).mask === 'clip') {
    return withLayerIconSize(ICONS.MASK);
  }
  switch (tool) {
    case 'rectangle': return withLayerIconSize(ICONS.RECTANGLE);
    case 'ellipse': return withLayerIconSize(ICONS.ELLIPSE);
    case 'pen': return withLayerIconSize(ICONS.PEN);
    case 'line': return withLayerIconSize(ICONS.LINE);
    case 'brush': return withLayerIconSize(ICONS.BRUSH);
    case 'polygon': return withLayerIconSize(ICONS.POLYGON);
    case 'arc': return withLayerIconSize(ICONS.ARC);
    case 'image': return withLayerIconSize(ICONS.IMAGE);
    case 'group': return withLayerIconSize(ICONS.GROUP);
    case 'text': return withLayerIconSize(ICONS.TEXT);
    case 'frame': return withLayerIconSize(ICONS.FRAME);
    default: return null;
  }
};

/**
 * 将字符串的首字母大写。
 * @param s - 输入字符串。
 * @returns 首字母大写后的字符串。
 */
export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);