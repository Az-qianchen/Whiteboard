import type { AnyPath } from '@/types';
import { useToolbarState } from './useToolbarState';

/**
 * 工具栏相关状态的独立 store。
 * 作为对 useToolbarState 的薄包装，便于替换为其他状态管理方案。
 */
export const useToolsStore = (
  paths: AnyPath[],
  selectedPathIds: string[],
  setPaths: React.Dispatch<React.SetStateAction<AnyPath[]>>,
  setSelectedPathIds: React.Dispatch<React.SetStateAction<string[]>>,
  beginCoalescing: () => void,
  endCoalescing: () => void,
) => useToolbarState(paths, selectedPathIds, setPaths, setSelectedPathIds, beginCoalescing, endCoalescing);
