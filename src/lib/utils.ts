/**
 * 本文件提供了一系列通用工具函数。
 * 包括将客户端坐标转换为 SVG 坐标的函数，以及安全地从 localStorage 读取和解析数据的方法。
 */

import type { Point } from './types';

/**
 * 根据视图变换将客户端坐标转换为 SVG 坐标。
 * @param {object} e - 包含 clientX 和 clientY 坐标的事件对象。
 * @param {SVGSVGElement} svg - SVG 根元素。
 * @param {object} viewTransform - 包含缩放和平移信息的视图变换对象。
 * @returns {Point} 转换后的 SVG 坐标点。
 */
export const getPointerPosition = (
    e: {clientX: number, clientY: number}, 
    svg: SVGSVGElement, 
    viewTransform: { scale: number, translateX: number, translateY: number }
): Point => {
    const point = svg.createSVGPoint();
    point.x = e.clientX;
    point.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (ctm) {
      const svgPoint = point.matrixTransform(ctm.inverse());
      return {
        x: (svgPoint.x - viewTransform.translateX) / viewTransform.scale,
        y: (svgPoint.y - viewTransform.translateY) / viewTransform.scale,
      };
    }
    return { x: 0, y: 0 };
};

/**
 * 从 localStorage 中检索一个项目并将其解析为 JSON。
 * @param {string} key - 要检索的键。
 * @param {T} defaultValue - 如果找不到键或解析失败时返回的默认值。
 * @returns {T} 解析后的值或默认值。
 */
export const getLocalStorageItem = <T>(key: string, defaultValue: T): T => {
    try {
        const item = localStorage.getItem(key);
        // "undefined" 字符串不是有效的 JSON，因此需要单独处理。
        // 当 JSON.stringify(undefined) 存储在 localStorage 中时可能会发生这种情况。
        if (item === 'undefined') {
            return defaultValue;
        }
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error(`Error reading from localStorage key “${key}”:`, error);
        return defaultValue;
    }
};