/**
 * 图像处理工具函数，支持 HSV 调整与抠图。
 */

import MagicWand from 'magic-wand-tool';

export interface MagicWandMask {
  data: Uint8Array;
  width: number;
  height: number;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

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
  /** 抠图后的羽化半径，像素单位，默认 0 */
  featherRadius?: number;
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
  mask: MagicWandMask | null;
  contours: Array<{ points: Array<{ x: number; y: number }>; inner: boolean }>;
}

export function removeBackground(
  imageData: ImageData,
  options: MattingOptions
): MattingResult {
  const { x, y, threshold = 10, contiguous = true, featherRadius = 0 } = options;
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

  let mask: MagicWandMask | null;

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
  const radius = Math.max(0, featherRadius);

  if (radius <= 0) {
    for (let i = 0; i < m.length; i++) {
      if (m[i]) {
        result[i * 4 + 3] = 0;
      }
    }
  } else {
    const distances = computeDistanceMap(m, width, height);
    for (let i = 0; i < m.length; i++) {
      const alphaIndex = i * 4 + 3;
      if (m[i]) {
        result[alphaIndex] = 0;
        continue;
      }
      const distance = distances[i];
      if (!Number.isFinite(distance) || distance > radius) {
        continue;
      }
      const ratio = Math.min(1, Math.max(0, distance / radius));
      result[alphaIndex] = Math.round(result[alphaIndex] * ratio);
    }
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

function computeDistanceMap(data: Uint8Array, width: number, height: number): Float32Array {
  const size = width * height;
  const distances = new Float32Array(size);
  const inf = Number.POSITIVE_INFINITY;

  for (let i = 0; i < size; i++) {
    distances[i] = data[i] ? 0 : inf;
  }

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      const idx = rowOffset + x;
      if (data[idx]) {
        continue;
      }
      let best = distances[idx];
      if (x > 0) best = Math.min(best, distances[idx - 1] + 1);
      if (y > 0) best = Math.min(best, distances[idx - width] + 1);
      if (x > 0 && y > 0) best = Math.min(best, distances[idx - width - 1] + Math.SQRT2);
      if (x < width - 1 && y > 0) best = Math.min(best, distances[idx - width + 1] + Math.SQRT2);
      distances[idx] = best;
    }
  }

  for (let y = height - 1; y >= 0; y--) {
    const rowOffset = y * width;
    for (let x = width - 1; x >= 0; x--) {
      const idx = rowOffset + x;
      if (data[idx]) {
        continue;
      }
      let best = distances[idx];
      if (x < width - 1) best = Math.min(best, distances[idx + 1] + 1);
      if (y < height - 1) best = Math.min(best, distances[idx + width] + 1);
      if (x < width - 1 && y < height - 1) best = Math.min(best, distances[idx + width + 1] + Math.SQRT2);
      if (x > 0 && y < height - 1) best = Math.min(best, distances[idx + width - 1] + Math.SQRT2);
      distances[idx] = best;
    }
  }

  return distances;
}

function computeMaskBounds(data: Uint8Array, width: number, height: number): MagicWandMask['bounds'] | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      const idx = rowOffset + x;
      if (data[idx]) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return null;
  }

  return { minX, minY, maxX, maxY };
}

export function createMaskFromPolygon(
  width: number,
  height: number,
  points: Array<{ x: number; y: number }>
): MagicWandMask | null {
  if (points.length < 3) {
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return null;
  }

  ctx.clearRect(0, 0, width, height);
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = new Uint8Array(width * height);
  for (let i = 0; i < data.length; i++) {
    data[i] = imageData.data[i * 4 + 3] > 0 ? 1 : 0;
  }

  const bounds = computeMaskBounds(data, width, height);
  if (!bounds) {
    return null;
  }

  return { data, width, height, bounds };
}

export function createMaskFromBrushStroke(
  width: number,
  height: number,
  points: Array<{ x: number; y: number }>,
  radius: number
): MagicWandMask | null {
  if (points.length === 0 || radius <= 0) {
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return null;
  }

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#ffffff';

  if (points.length === 1) {
    const [point] = points;
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = radius * 2;
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    // Ensure endpoints are filled when the stroke consists of only two points.
    ctx.beginPath();
    ctx.arc(points[0].x, points[0].y, radius, 0, Math.PI * 2);
    ctx.arc(points[points.length - 1].x, points[points.length - 1].y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = new Uint8Array(width * height);
  for (let i = 0; i < data.length; i++) {
    data[i] = imageData.data[i * 4 + 3] > 0 ? 1 : 0;
  }

  const bounds = computeMaskBounds(data, width, height);
  if (!bounds) {
    return null;
  }

  return { data, width, height, bounds };
}

export function combineMasks(
  base: MagicWandMask | null,
  delta: MagicWandMask,
  operation: 'add' | 'subtract'
): MagicWandMask | null {
  const { width, height } = delta;
  if (base && (base.width !== width || base.height !== height)) {
    throw new Error('Mask dimensions must match');
  }

  const length = width * height;
  const nextData = base ? new Uint8Array(base.data) : new Uint8Array(length);

  if (operation === 'add') {
    for (let i = 0; i < length; i++) {
      if (delta.data[i]) {
        nextData[i] = 1;
      }
    }
  } else {
    if (!base) {
      return null;
    }
    for (let i = 0; i < length; i++) {
      if (delta.data[i]) {
        nextData[i] = 0;
      }
    }
  }

  const bounds = computeMaskBounds(nextData, width, height);
  if (!bounds) {
    return null;
  }

  return { data: nextData, width, height, bounds };
}

export function invertMask(mask: MagicWandMask | null): MagicWandMask | null {
  if (!mask) {
    return null;
  }

  const { width, height, data } = mask;
  const length = width * height;
  const nextData = new Uint8Array(length);

  for (let i = 0; i < length; i++) {
    nextData[i] = data[i] ? 0 : 1;
  }

  const bounds = computeMaskBounds(nextData, width, height);
  if (!bounds) {
    return null;
  }

  return { data: nextData, width, height, bounds };
}

export function applyMaskToImage(
  imageData: ImageData,
  mask: MagicWandMask | null,
  options: { featherRadius?: number } = {}
): { image: ImageData; contours: Array<{ points: Array<{ x: number; y: number }>; inner: boolean }> } {
  const result = new Uint8ClampedArray(imageData.data);

  if (!mask) {
    return { image: new ImageData(result, imageData.width, imageData.height), contours: [] };
  }

  const radius = Math.max(0, options.featherRadius ?? 0);
  const data = mask.data;

  if (radius <= 0) {
    for (let i = 0; i < data.length; i++) {
      if (data[i]) {
        result[i * 4 + 3] = 0;
      }
    }
  } else {
    const distances = computeDistanceMap(data, mask.width, mask.height);
    for (let i = 0; i < data.length; i++) {
      const alphaIndex = i * 4 + 3;
      if (data[i]) {
        result[alphaIndex] = 0;
        continue;
      }
      const distance = distances[i];
      if (!Number.isFinite(distance) || distance > radius) {
        continue;
      }
      const ratio = Math.min(1, Math.max(0, distance / radius));
      result[alphaIndex] = Math.round(result[alphaIndex] * ratio);
    }
  }

  let contours: Array<{ points: Array<{ x: number; y: number }>; inner: boolean }> = [];
  try {
    const traced = MagicWand.traceContours(mask);
    contours = MagicWand.simplifyContours(traced, 0, 30);
  } catch (error) {
    console.warn('Failed to trace magic wand contours', error);
  }

  return { image: new ImageData(result, imageData.width, imageData.height), contours };
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
