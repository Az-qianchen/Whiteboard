// 通用工具函数测试
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getPointerPosition, getLocalStorageItem } from '@/lib/utils';

const createMockSvg = (): SVGSVGElement => {
  const svg = {} as SVGSVGElement;
  (svg as any).createSVGPoint = () => {
    const point: any = {
      x: 0,
      y: 0,
      matrixTransform: () => ({ x: point.x, y: point.y }),
    };
    return point;
  };
  (svg as any).getScreenCTM = () => ({ inverse: () => ({}) });
  return svg;
};

const storage: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, value: string) => {
    storage[key] = value;
  },
  removeItem: (key: string) => {
    delete storage[key];
  },
  clear: () => {
    Object.keys(storage).forEach((key) => delete storage[key]);
  },
};

vi.stubGlobal('localStorage', localStorageMock);

describe('getPointerPosition', () => {
  /** 测试在无缩放和平移下坐标保持不变 */
  it('应返回未变换的坐标', () => {
    const svg = createMockSvg();
    const result = getPointerPosition(
      { clientX: 50, clientY: 80 },
      svg,
      { scale: 1, translateX: 0, translateY: 0 }
    );
    expect(result).toEqual({ x: 50, y: 80 });
  });

  /** 测试在缩放和平移后计算正确的坐标 */
  it('应根据缩放和平移计算坐标', () => {
    const svg = createMockSvg();
    const result = getPointerPosition(
      { clientX: 100, clientY: 100 },
      svg,
      { scale: 2, translateX: 10, translateY: 20 }
    );
    expect(result).toEqual({ x: 45, y: 40 });
  });
});

describe('getLocalStorageItem', () => {
  const key = 'test';

  beforeEach(() => {
    localStorage.clear();
  });

  /** 测试从 localStorage 读取并解析正常 JSON 值 */
  it('应返回解析后的存储值', () => {
    const value = { foo: 'bar' };
    localStorage.setItem(key, JSON.stringify(value));
    const result = getLocalStorageItem<typeof value>(key, { foo: '' });
    expect(result).toEqual(value);
  });

  /** 测试字符串 "undefined" 时返回默认值 */
  it('应在值为字符串 undefined 时返回默认值', () => {
    const defaultValue = { foo: 'default' };
    localStorage.setItem(key, 'undefined');
    const result = getLocalStorageItem<typeof defaultValue>(key, defaultValue);
    expect(result).toBe(defaultValue);
  });

  /** 测试解析失败时返回默认值并记录错误 */
  it('应在解析失败时返回默认值', () => {
    const defaultValue = 123;
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem(key, '{');
    const result = getLocalStorageItem<number>(key, defaultValue);
    expect(result).toBe(defaultValue);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
