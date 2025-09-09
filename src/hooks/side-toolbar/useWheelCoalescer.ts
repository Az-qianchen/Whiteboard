import { useRef, useEffect, useCallback } from 'react';

/**
 * 一个用于管理输入框上鼠标滚轮交互的 Hook，
 * 它会将快速的变化合并为单个撤销/重做历史记录状态。
 */
export const useWheelCoalescer = (
  beginCoalescing: () => void,
  endCoalescing: () => void
) => {
  const wheelTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    // 组件卸载时清除定时器
    return () => {
      if (wheelTimeoutRef.current) {
        clearTimeout(wheelTimeoutRef.current);
      }
    };
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent, updateValue: (increment: number) => void) => {

    if (!wheelTimeoutRef.current) {
      beginCoalescing();
    } else {
      clearTimeout(wheelTimeoutRef.current);
    }

    const increment = (e.deltaY < 0 ? 1 : -1) * (e.shiftKey ? 10 : 1);
    updateValue(increment);

    wheelTimeoutRef.current = window.setTimeout(() => {
      endCoalescing();
      wheelTimeoutRef.current = null;
    }, 500);
  }, [beginCoalescing, endCoalescing]);

  return handleWheel;
};
