/**
 * 本文件提供了一系列通用工具函数。
 * 包括将客户端坐标转换为 SVG 坐标的函数，以及安全地从 localStorage 读取和解析数据的方法。
 */

import type { Point } from './types';

/**
 * 根据视图变换将客户端坐标转换为 SVG 坐标。
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
 * Retrieves an item from localStorage and parses it as JSON.
 * @param key The key to retrieve.
 * @param defaultValue The default value to return if the key is not found or parsing fails.
 * @returns The parsed value or the default value.
 */
export const getLocalStorageItem = <T>(key: string, defaultValue: T): T => {
    try {
        const item = localStorage.getItem(key);
        // The string "undefined" is not valid JSON, so we need to handle it separately.
        // This can happen if JSON.stringify(undefined) is stored in localStorage.
        if (item === 'undefined') {
            return defaultValue;
        }
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error(`Error reading from localStorage key “${key}”:`, error);
        return defaultValue;
    }
};