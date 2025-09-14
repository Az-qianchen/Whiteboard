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
test('魔法棒抠除连续区域', () => {
  // 图像: 白, 黑, 白
  const pixels = new Uint8ClampedArray([
    255, 255, 255, 255,
    0, 0, 0, 255,
    255, 255, 255, 255,
  ]);
  const imageData = new ImageData(pixels, 3, 1);
  const contiguous = removeBackground(imageData, { x: 0, y: 0, threshold: 10, contiguous: true });
  expect(contiguous.image.data[3]).toBe(0); // 第一个像素被抠除
  expect(contiguous.image.data[7]).toBe(255); // 中间黑色未受影响
  expect(contiguous.region).toEqual({ x: 0, y: 0, width: 1, height: 1 });
  const nonContiguous = removeBackground(imageData, { x: 0, y: 0, threshold: 10, contiguous: false });
  expect(nonContiguous.image.data[3]).toBe(0); // 第一个像素
  expect(nonContiguous.image.data[11]).toBe(0); // 第三个白色也被抠除
  expect(nonContiguous.region).toEqual({ x: 0, y: 0, width: 3, height: 1 });
});
