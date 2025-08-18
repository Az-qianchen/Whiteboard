import { useRef, useEffect, useCallback } from 'react';

/**
 * A hook to manage mouse wheel interactions on an input,
 * coalescing rapid changes into a single undo/redo history state.
 */
export const useWheelCoalescer = (
  beginCoalescing: () => void,
  endCoalescing: () => void
) => {
  const wheelTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    // Cleanup timeout on unmount
    return () => {
      if (wheelTimeoutRef.current) {
        clearTimeout(wheelTimeoutRef.current);
      }
    };
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent, updateValue: (increment: number) => void) => {
    e.preventDefault();

    if (!wheelTimeoutRef.current) {
      beginCoalescing();
    } else {
      clearTimeout(wheelTimeoutRef.current);
    }

    const increment = e.deltaY < 0 ? 1 : -1;
    updateValue(increment);

    wheelTimeoutRef.current = window.setTimeout(() => {
      endCoalescing();
      wheelTimeoutRef.current = null;
    }, 500);
  }, [beginCoalescing, endCoalescing]);

  return handleWheel;
};
