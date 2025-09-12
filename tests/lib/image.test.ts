// 图像处理工具测试

import { adjustHsv, removeBackground } from '@/lib/image';
import { expect, test } from 'vitest';

class StubImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  constructor(data: Uint8ClampedArray, width: number, height: number) {
    this.data = data;
    this.width = width;
    this.height = height;
  }
}
// @ts-ignore 设置测试环境的 ImageData
(globalThis as any).ImageData = StubImageData;

// 测试调整HSV
test('调整HSV', () => {
  const imageData = new ImageData(new Uint8ClampedArray([255, 0, 0, 255]), 1, 1);
  const result = adjustHsv(imageData, { h: 120 });
  expect(Array.from(result.data.slice(0, 4))).toEqual([0, 255, 0, 255]);
});

// 测试抠图
test('抠图背景透明', () => {
  const imageData = new ImageData(new Uint8ClampedArray([255, 255, 255, 255]), 1, 1);
  const result = removeBackground(imageData, { background: { r: 255, g: 255, b: 255 } });
  expect(result.data[3]).toBe(0);
});
