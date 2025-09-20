// useAltKeyColorSampler Hook 键盘触发取色逻辑测试
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAltKeyColorSampler } from '@/hooks/useAltKeyColorSampler';

describe('useAltKeyColorSampler', () => {
  it('Alt 按下时优先调用 EyeDropper 回调', () => {
    const openEyeDropper = vi.fn().mockReturnValue(true);
    const fallbackPick = vi.fn().mockReturnValue(false);

    const { unmount } = renderHook((props: Parameters<typeof useAltKeyColorSampler>[0]) => useAltKeyColorSampler(props), {
      initialProps: {
        isEnabled: true,
        canSample: true,
        openEyeDropper,
        fallbackPick,
        cancelSampling: vi.fn(),
      },
    });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Alt' }));
    });

    expect(openEyeDropper).toHaveBeenCalledTimes(1);
    expect(fallbackPick).not.toHaveBeenCalled();

    unmount();
  });

  it('EyeDropper 回调返回 false 时执行备用取色', () => {
    const openEyeDropper = vi.fn().mockReturnValue(false);
    const fallbackPick = vi.fn().mockReturnValue(true);

    const { unmount } = renderHook((props: Parameters<typeof useAltKeyColorSampler>[0]) => useAltKeyColorSampler(props), {
      initialProps: {
        isEnabled: true,
        canSample: true,
        openEyeDropper,
        fallbackPick,
        cancelSampling: vi.fn(),
      },
    });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Alt' }));
    });

    expect(openEyeDropper).toHaveBeenCalledTimes(1);
    expect(fallbackPick).toHaveBeenCalledTimes(1);

    unmount();
  });

  it('在条件不足时忽略按键触发', () => {
    const openEyeDropper = vi.fn().mockReturnValue(true);
    const fallbackPick = vi.fn().mockReturnValue(true);

    const { rerender, unmount } = renderHook(
      (props: Parameters<typeof useAltKeyColorSampler>[0]) => useAltKeyColorSampler(props),
      {
        initialProps: {
          isEnabled: true,
          canSample: false,
          openEyeDropper,
          fallbackPick,
          cancelSampling: vi.fn(),
        },
      }
    );

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Alt' }));
    });

    expect(openEyeDropper).not.toHaveBeenCalled();
    expect(fallbackPick).not.toHaveBeenCalled();

    openEyeDropper.mockClear();
    fallbackPick.mockClear();

    rerender({ isEnabled: true, canSample: true, openEyeDropper, fallbackPick, cancelSampling: vi.fn() });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Alt' }));
    });

    expect(openEyeDropper).toHaveBeenCalledTimes(1);
    expect(fallbackPick).not.toHaveBeenCalled();

    unmount();
  });

  it('忽略重复的 Alt 键事件', () => {
    const openEyeDropper = vi.fn().mockReturnValue(true);
    const fallbackPick = vi.fn().mockReturnValue(true);

    const { unmount } = renderHook((props: Parameters<typeof useAltKeyColorSampler>[0]) => useAltKeyColorSampler(props), {
      initialProps: {
        isEnabled: true,
        canSample: true,
        openEyeDropper,
        fallbackPick,
        cancelSampling: vi.fn(),
      },
    });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Alt', repeat: true }));
    });

    expect(openEyeDropper).not.toHaveBeenCalled();
    expect(fallbackPick).not.toHaveBeenCalled();

    unmount();
  });

  it('Alt 松开时调用取消回调以结束取色状态', () => {
    const openEyeDropper = vi.fn().mockReturnValue(true);
    const fallbackPick = vi.fn().mockReturnValue(false);
    const cancelSampling = vi.fn();

    const { unmount } = renderHook(
      (props: Parameters<typeof useAltKeyColorSampler>[0]) => useAltKeyColorSampler(props),
      {
        initialProps: {
          isEnabled: true,
          canSample: true,
          openEyeDropper,
          fallbackPick,
          cancelSampling,
        },
      }
    );

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Alt' }));
    });

    expect(openEyeDropper).toHaveBeenCalledTimes(1);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Alt' }));
    });

    expect(cancelSampling).toHaveBeenCalledTimes(1);

    unmount();
  });

  it('未进入取色状态时松开 Alt 不触发取消', () => {
    const openEyeDropper = vi.fn().mockReturnValue(false);
    const fallbackPick = vi.fn().mockReturnValue(false);
    const cancelSampling = vi.fn();

    const { unmount } = renderHook(
      (props: Parameters<typeof useAltKeyColorSampler>[0]) => useAltKeyColorSampler(props),
      {
        initialProps: {
          isEnabled: true,
          canSample: true,
          openEyeDropper,
          fallbackPick,
          cancelSampling,
        },
      }
    );

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Alt' }));
    });

    expect(openEyeDropper).toHaveBeenCalledTimes(1);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Alt' }));
    });

    expect(cancelSampling).not.toHaveBeenCalled();

    unmount();
  });
});
