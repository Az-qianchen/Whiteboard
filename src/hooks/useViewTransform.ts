/**
 * 本文件定义了一个自定义 Hook (useViewTransform)，用于管理画布的视图变换。
 * 它处理画布的平移（pan）和缩放（zoom）逻辑。
 */

import React, { useState, useCallback } from 'react';
import type { Point } from '../types';
import { getPointerPosition as getPointerPositionUtil } from '../lib/utils';

/**
 * 自定义钩子，用于管理画布的视图变换（平移和缩放）。
 */
export const useViewTransform = () => {
  const [viewTransform, setViewTransform] = useState({ scale: 1, translateX: 0, translateY: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPointerPosition, setLastPointerPosition] = useState<Point | null>(null);

  /**
   * 处理滚轮事件以实现缩放或平移。
   * @param e - 滚轮事件。
   */
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const { deltaX, deltaY, ctrlKey, clientX, clientY } = e;

    // ctrlKey 表示触控板上的捏合手势。
    // 对于普通鼠标滚轮，我们希望默认行为是缩放。
    // 此逻辑将捏合手势和垂直滚动（最常见的鼠标滚轮事件）都视为缩放。
    // 水平滚动（主要由触控板产生）则被视为平移。
    if (ctrlKey || Math.abs(deltaX) < Math.abs(deltaY)) {
      // 缩放逻辑
      const { scale, translateX, translateY } = viewTransform;

      // 使用加法缩放以获得线性手感。
      const zoomStep = 0.001;
      const newScale = Math.max(0.1, Math.min(10, scale - deltaY * zoomStep));

      if (Math.abs(scale - newScale) < 1e-9) {
          return;
      }

      const svg = e.currentTarget.querySelector('svg');
      if (!svg) return;
      
      // 计算鼠标指针在 SVG 坐标系中的位置
      const point = svg.createSVGPoint();
      point.x = clientX;
      point.y = clientY;
      
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const svgPoint = point.matrixTransform(ctm.inverse());

      // 计算新的平移量，以鼠标指针为中心进行缩放
      const newTranslateX = svgPoint.x - (svgPoint.x - translateX) * (newScale / scale);
      const newTranslateY = svgPoint.y - (svgPoint.y - translateY) * (newScale / scale);

      setViewTransform({
        scale: newScale,
        translateX: newTranslateX,
        translateY: newTranslateY
      });
    } else {
      // 平移逻辑（主要用于触控板上的双指滑动）
      setViewTransform(prev => ({
          ...prev,
          translateX: prev.translateX - deltaX,
          translateY: prev.translateY - deltaY,
      }));
    }
  };

  /**
   * 处理指针移动事件以实现平移。
   * 此函数由 usePointerInteraction 在平移模式下调用。
   */
  const handlePanMove = (e: React.PointerEvent<SVGSVGElement>) => {
      if(isPanning) {
          setViewTransform(prev => ({
            ...prev,
            translateX: prev.translateX + e.movementX,
            translateY: prev.translateY + e.movementY,
          }));
      }
  };


  /**
   * 将客户端坐标转换为相对于画布变换的SVG坐标。
   */
  const getPointerPosition = useCallback((
    e: { clientX: number, clientY: number },
    svg: SVGSVGElement
  ): Point => {
    const point = getPointerPositionUtil(e, svg, viewTransform);
    setLastPointerPosition(point);
    return point;
  }, [viewTransform]);


  return {
    viewTransform,
    isPanning,
    setIsPanning,
    handleWheel,
    handlePanMove,
    getPointerPosition,
    lastPointerPosition,
  };
};