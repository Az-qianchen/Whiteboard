/**
 * 本文件定义了一个通用的、可复用的自定义 Hook (useHistoryStack)，
 * 用于管理任何状态的历史记录栈（撤销/重做）。
 */
import { useState, useRef, useCallback } from 'react';

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

/**
 * 通用的、可复用的自定义 Hook，用于管理任何状态的历史记录栈（撤销/重做）。
 * @param initialState 初始状态。
 * @returns 返回一个数组，包含当前状态、状态设置函数、撤销/重做函数、可用性标志以及合并操作的函数。
 */
export const useHistoryStack = <T,>(initialState: T): [
  T,
  (updater: T | ((prevState: T) => T)) => void,
  () => void,
  () => void,
  boolean,
  boolean,
  () => void,
  () => void
] => {
  const [state, setState] = useState<HistoryState<T>>({
    past: [],
    present: initialState,
    future: [],
  });

  const coalescingRef = useRef(false);

  /**
   * 更新当前状态。
   * @description 如果正在合并操作，则仅更新当前状态而不创建新的历史记录条目。
   * 否则，将当前状态推入历史记录并设置新状态。
   * @param updater - 新的状态值或一个接收前一个状态并返回新状态的函数。
   */
  const set = useCallback((updater: T | ((prevState: T) => T)) => {
    setState(current => {
      const newPresent = typeof updater === 'function'
        ? (updater as (prevState: T) => T)(current.present)
        : updater;
        
      if (newPresent === current.present) {
          return current;
      }
      
      // 如果正在合并，只更新 'present' 状态。
      // 历史记录条目已由 'beginCoalescing' 创建。
      if (coalescingRef.current) {
          return { ...current, present: newPresent };
      } else {
          // 正常操作：创建新的历史记录条目。
          return {
              past: [...current.past, current.present],
              present: newPresent,
              future: [],
          };
      }
    });
  }, []);

  /**
   * 撤销到上一个状态。
   */
  const undo = useCallback(() => {
    setState(currentState => {
      const { past, present, future } = currentState;
      if (past.length === 0) {
        return currentState;
      }
      const previous = past[past.length - 1];
      const newPast = past.slice(0, past.length - 1);
      return {
        past: newPast,
        present: previous,
        future: [present, ...future],
      };
    });
  }, []);

  /**
   * 重做到下一个状态。
   */
  const redo = useCallback(() => {
    setState(currentState => {
      const { past, present, future } = currentState;
      if (future.length === 0) {
        return currentState;
      }
      const next = future[0];
      const newFuture = future.slice(1);
      return {
        past: [...past, present],
        present: next,
        future: newFuture,
      };
    });
  }, []);
  
  /**
   * 开始合并后续的状态更新。
   * @description 这会将当前状态保存到历史记录中，之后所有对 'set' 的调用将只更新当前状态，
   * 直到 'endCoalescing' 被调用。这允许将多个更改分组为一个单一的撤销步骤。
   */
  const beginCoalescing = useCallback(() => {
    if (!coalescingRef.current) {
        coalescingRef.current = true;
        // 保存当前状态到历史堆栈，以便整个后续更改批次可以被撤销。
        setState(current => ({
            ...current,
            past: [...current.past, current.present],
            future: [], // 新的更改批次会使重做堆栈失效
        }));
    }
  }, []);

  /**
   * 结束合并状态更新。
   */
  const endCoalescing = useCallback(() => {
    coalescingRef.current = false;
  }, []);

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  return [state.present, set, undo, redo, canUndo, canRedo, beginCoalescing, endCoalescing];
};
