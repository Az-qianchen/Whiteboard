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

    // 区分平移和缩放手势的启发式方法：
    // - ctrlKey 被激活：绝对是缩放（触控板上的捏合手势）。
    // - deltaX 为 0：很可能是鼠标滚轮，所以是缩放。
    // - deltaX 不为 0：很可能是触控板平移。
    if (ctrlKey || deltaX === 0) {
      // 缩放逻辑 (鼠标滚轮、按住 Ctrl 并滚动，或在触控板上捏合)
      const { scale, translateX, translateY } = viewTransform;

      // 使用加法缩放以获得线性手感
      const zoomStep = 0.001;
      const newScale = Math.max(0.1, Math.min(10, scale - deltaY * zoomStep));

      if (Math.abs(scale - newScale) < 1e-9) {
          return;
      }

      const svg = e.currentTarget.querySelector('svg');
      if (!svg) return;
      
      // 计算鼠标指针在SVG坐标系中的位置
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
      // 平移逻辑 (在触控板上用双指滑动)
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
