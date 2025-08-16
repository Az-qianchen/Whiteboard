
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
   * 处理滚轮事件以实现缩放。
   * @param e - 滚轮事件。
   */
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const { deltaY, clientX, clientY } = e;
    const zoomFactor = 1.1;
    const { scale, translateX, translateY } = viewTransform;

    const newScale = deltaY < 0 ? scale * zoomFactor : scale / zoomFactor;

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
