/**
 * 图像处理工具函数，支持 HSV 调整与抠图。
 */

import MagicWand from 'magic-wand-tool';

export interface HsvAdjustment {
  /** 色相增量，范围 -360 至 360 */
  h?: number;
  /** 饱和度增量，范围 -100 至 100 */
  s?: number;
  /** 亮度增量，范围 -100 至 100 */
  v?: number;
}

export interface MattingOptions {
  /** 点击位置 x 坐标 */
  x: number;
  /** 点击位置 y 坐标 */
  y: number;
  /** 颜色差阈值，默认 10 */
  threshold?: number;
  /** 是否只抠除连续区域，默认 true */
  contiguous?: boolean;
}

/**
 * 调整 ImageData 的 HSV 值。
 * @param imageData 原始图像数据
 * @param adjustment HSV 调整参数
 * @returns 调整后的图像数据
 */
export function adjustHsv(imageData: ImageData, adjustment: HsvAdjustment): ImageData {
  const { h = 0, s = 0, v = 0 } = adjustment;
  const data = new Uint8ClampedArray(imageData.data);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    let [hh, ss, vv] = rgbToHsv(r, g, b);
    hh = (hh + h + 360) % 360;
    ss = clamp(ss + s, 0, 100);
    vv = clamp(vv + v, 0, 100);
    const [nr, ng, nb] = hsvToRgb(hh, ss, vv);
    data[i] = nr;
    data[i + 1] = ng;
    data[i + 2] = nb;
  }
  return new ImageData(data, imageData.width, imageData.height);
}

/**
 * 以点击位置为起点，对颜色差异在阈值内的像素设为透明。
 * @param imageData 原始图像数据
 * @param options 抠图选项
 * @returns 处理后的图像数据及被抠除区域的边界
 */
export interface MattingResult {
  image: ImageData;
  region: { x: number; y: number; width: number; height: number } | null;
  mask:
    | {
        data: Uint8Array;
        width: number;
        height: number;
        bounds: { minX: number; minY: number; maxX: number; maxY: number };
      }
    | null;
  contours: Array<{ points: Array<{ x: number; y: number }>; inner: boolean }>;
}

export function removeBackground(
  imageData: ImageData,
  options: MattingOptions
): MattingResult {
  const { x, y, threshold = 10, contiguous = true } = options;
  const { width, height } = imageData;
  const src = new Uint8Array(imageData.data);
  if (x < 0 || y < 0 || x >= width || y >= height) {
    return {
      image: new ImageData(new Uint8ClampedArray(src), width, height),
      region: null,
      mask: null,
      contours: [],
    };
  }

  let mask: { data: Uint8Array; width: number; height: number; bounds: { minX: number; minY: number; maxX: number; maxY: number } } | null;

  if (contiguous) {
    mask = MagicWand.floodFill({ data: src, width, height, bytes: 4 }, x, y, threshold);
  } else {
    const idx = (y * width + x) * 4;
    const tr = src[idx];
    const tg = src[idx + 1];
    const tb = src[idx + 2];
    const data = new Uint8Array(width * height);
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const i = (py * width + px) * 4;
        const dr = Math.abs(src[i] - tr);
        const dg = Math.abs(src[i + 1] - tg);
        const db = Math.abs(src[i + 2] - tb);
        if (dr <= threshold && dg <= threshold && db <= threshold) {
          const pos = py * width + px;
          data[pos] = 1;
          if (px < minX) minX = px;
          if (py < minY) minY = py;
          if (px > maxX) maxX = px;
          if (py > maxY) maxY = py;
        }
      }
    }
    mask = {
      data,
      width,
      height,
      bounds: { minX, minY, maxX, maxY }
    };
  }

  if (!mask) {
    return {
      image: new ImageData(new Uint8ClampedArray(src), width, height),
      region: null,
      mask: null,
      contours: [],
    };
  }

  const result = new Uint8ClampedArray(src);
  const m = mask.data;
  for (let i = 0; i < m.length; i++) {
    if (m[i]) result[i * 4 + 3] = 0;
  }

  const { minX, minY, maxX, maxY } = mask.bounds;
  const region = maxX >= minX && maxY >= minY
    ? { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
    : null;

  let contours: Array<{ points: Array<{ x: number; y: number }>; inner: boolean }> = [];
  try {
    const traced = MagicWand.traceContours(mask);
    contours = MagicWand.simplifyContours(traced, 0, 30);
  } catch (error) {
    console.warn('Failed to trace magic wand contours', error);
  }

  return { image: new ImageData(result, width, height), region, mask, contours };
}

/**
 * 计算图像中具有不透明像素的最小包围盒。
 * @param imageData 原始图像数据
 * @param alphaThreshold 透明度阈值，默认 0（大于该阈值视为不透明）
 * @returns 不透明区域的矩形边界；若整张图像透明则返回 null
 */
export function getOpaqueBounds(
  imageData: ImageData,
  alphaThreshold = 0
): { x: number; y: number; width: number; height: number } | null {
  const { width, height, data } = imageData;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      const idx = (rowOffset + x) * 4 + 3;
      if (data[idx] > alphaThreshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return null;
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const v = max;
  const d = max - min;
  const s = max === 0 ? 0 : d / max;
  let h = 0;
  if (d !== 0) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h * 360, s * 100, v * 100];
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  s /= 100; v /= 100;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255)
  ];
}
