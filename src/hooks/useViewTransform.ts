/**
 * 提供视图变换状态和操作的 Hook
 */
import React from 'react';
import type { Point } from '@/types';
import { useViewTransformStore } from '@/context/viewTransformStore';

/**
 * 返回视图缩放与平移相关的状态与方法
 */
export const useViewTransform = () => {
  const viewTransform = useViewTransformStore(s => s.viewTransform);
  const isPanning = useViewTransformStore(s => s.isPanning);
  const setIsPanning = useViewTransformStore(s => s.setIsPanning);
  const handleWheel = useViewTransformStore(s => s.handleWheel);
  const handlePanMove = useViewTransformStore(s => s.handlePanMove);
  const handleTouchStart = useViewTransformStore(s => s.handleTouchStart);
  const handleTouchMove = useViewTransformStore(s => s.handleTouchMove);
  const handleTouchEnd = useViewTransformStore(s => s.handleTouchEnd);
  const isPinching = useViewTransformStore(s => s.isPinching);
  const getPointerPosition = useViewTransformStore(s => s.getPointerPosition);
  const setLastPointerPosition = useViewTransformStore(s => s.setLastPointerPosition);
  const getLastPointerPosition = React.useCallback(() => useViewTransformStore.getState().lastPointerPosition, []);

  return React.useMemo(
    () => ({
      viewTransform,
      isPanning,
      setIsPanning,
      handleWheel,
      handlePanMove,
      handleTouchStart,
      handleTouchMove,
      handleTouchEnd,
      isPinching,
      getPointerPosition,
      setLastPointerPosition,
      getLastPointerPosition,
    }),
    [
      viewTransform,
      isPanning,
      setIsPanning,
      handleWheel,
      handlePanMove,
      handleTouchStart,
      handleTouchMove,
      handleTouchEnd,
      isPinching,
      getPointerPosition,
      setLastPointerPosition,
      getLastPointerPosition,
    ]
  );
};
