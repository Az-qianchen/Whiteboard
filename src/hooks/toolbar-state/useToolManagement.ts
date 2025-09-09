/**
 * 本文件定义了一个自定义 Hook，用于管理当前激活的工具和选择模式的状态。
 */
import { useState, useEffect } from 'react';
import type { Tool, SelectionMode } from '../../types';
import { getLocalStorageItem } from '../../lib/utils';

/**
 * 管理工具和选择模式状态的 Hook。
 * @param setSelectedPathIds - 用于在切换工具时清除选择的函数。
 * @returns 返回工具、选择模式及其设置函数。
 */
export const useToolManagement = (
  setSelectedPathIds: React.Dispatch<React.SetStateAction<string[]>>
) => {
  const [tool, setToolInternal] = useState<Tool>(() => getLocalStorageItem('whiteboard_tool', 'brush'));
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('move');

  useEffect(() => { localStorage.setItem('whiteboard_tool', JSON.stringify(tool)); }, [tool]);

  /**
   * 设置当前工具，并在必要时清除选择。
   * @param newTool - 要激活的新工具。
   */
  const setTool = (newTool: Tool) => {
    if (newTool === tool) return;

    // 当切换到非选择工具时，清除选择。
    if (newTool !== 'selection') {
      setSelectedPathIds([]);
    }
    
    setToolInternal(newTool);
  };

  return {
    tool,
    setTool,
    selectionMode,
    setSelectionMode,
  };
};
