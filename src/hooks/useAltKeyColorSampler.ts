/**
 * 监听 Alt 键按下以触发 EyeDropper 或备用取色逻辑的 Hook。
 * 它会在满足条件时自动调用提供的回调函数，实现与颜色面板一致的取色体验。
 */
import { useEffect, useRef } from 'react';

interface UseAltKeyColorSamplerOptions {
  /** 当前工具是否允许通过 Alt 键触发取色 */
  isEnabled: boolean;
  /** 是否具备触发取色的必要条件，例如指针仍在画布上或浏览器支持 EyeDropper */
  canSample: boolean;
  /** 调用浏览器 EyeDropper，返回 true 表示成功触发 */
  openEyeDropper: () => boolean;
  /** EyeDropper 不可用或触发失败时的备用取色回调 */
  fallbackPick: () => boolean;
  /** 取消当前取色流程（如中止 EyeDropper 或重置状态） */
  cancelSampling: () => void;
}

/**
 * 在监听 Alt 键时避免频繁重新绑定事件监听器的工具 Hook。
 * 通过 ref 保存最新的回调和状态，并在组件卸载时清理监听器。
 */
export const useAltKeyColorSampler = ({
  isEnabled,
  canSample,
  openEyeDropper,
  fallbackPick,
  cancelSampling,
}: UseAltKeyColorSamplerOptions) => {
  const canSampleRef = useRef(canSample);
  const openEyeDropperRef = useRef(openEyeDropper);
  const fallbackPickRef = useRef(fallbackPick);
  const cancelSamplingRef = useRef(cancelSampling);
  const isSamplingRef = useRef(false);

  useEffect(() => {
    canSampleRef.current = canSample;
  }, [canSample]);

  useEffect(() => {
    openEyeDropperRef.current = openEyeDropper;
  }, [openEyeDropper]);

  useEffect(() => {
    fallbackPickRef.current = fallbackPick;
  }, [fallbackPick]);

  useEffect(() => {
    cancelSamplingRef.current = cancelSampling;
  }, [cancelSampling]);

  useEffect(() => {
    if (typeof window === 'undefined' || !isEnabled) {
      if (isSamplingRef.current) {
        isSamplingRef.current = false;
        cancelSamplingRef.current();
      }
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Alt' || event.repeat || !canSampleRef.current) {
        return;
      }

      if (openEyeDropperRef.current()) {
        isSamplingRef.current = true;
        event.preventDefault();
        return;
      }

      if (fallbackPickRef.current()) {
        isSamplingRef.current = true;
        event.preventDefault();
        return;
      }

      isSamplingRef.current = false;
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key !== 'Alt' || !isSamplingRef.current) {
        return;
      }

      isSamplingRef.current = false;
      cancelSamplingRef.current();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (isSamplingRef.current) {
        isSamplingRef.current = false;
        cancelSamplingRef.current();
      }
    };
  }, [isEnabled]);
};

