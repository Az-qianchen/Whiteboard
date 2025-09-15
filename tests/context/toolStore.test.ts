// 工具状态存储测试
import { describe, it, expect, beforeEach } from 'vitest';
import { useToolStore } from '@/hooks/useToolsStore';

// 每次测试前重置状态
beforeEach(() => {
  useToolStore.setState({ tool: 'brush', selectionMode: 'move' });
});

describe('useToolStore', () => {
  // 验证默认状态
  it('default state is brush/move', () => {
    const state = useToolStore.getState();
    expect(state.tool).toBe('brush');
    expect(state.selectionMode).toBe('move');
  });

  // 测试 setTool 更新工具
  it('setTool updates tool', () => {
    useToolStore.getState().setTool('pen');
    expect(useToolStore.getState().tool).toBe('pen');
  });

  // 测试 setSelectionMode 更新选择模式
  it('setSelectionMode updates selectionMode', () => {
    useToolStore.getState().setSelectionMode('edit');
    expect(useToolStore.getState().selectionMode).toBe('edit');
  });
});
