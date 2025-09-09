import React from 'react';
import type { Point } from '@/types';
import { useViewTransformStore } from '@/context/viewTransformStore';

export const useViewTransform = () => {
  const viewTransform = useViewTransformStore(s => s.viewTransform);
  const isPanning = useViewTransformStore(s => s.isPanning);
  const setIsPanning = useViewTransformStore(s => s.setIsPanning);
  const handleWheel = useViewTransformStore(s => s.handleWheel);
  const handlePanMove = useViewTransformStore(s => s.handlePanMove);
  const getPointerPosition = useViewTransformStore(s => s.getPointerPosition);
  const lastPointerPosition = useViewTransformStore(s => s.lastPointerPosition);
  const setLastPointerPosition = useViewTransformStore(s => s.setLastPointerPosition);

  return {
    viewTransform,
    isPanning,
    setIsPanning,
    handleWheel,
    handlePanMove,
    getPointerPosition,
    lastPointerPosition,
    setLastPointerPosition,
  };
};
