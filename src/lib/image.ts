/**
 * 图像处理工具函数，支持 HSV 调整与抠图。
 */

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
 * 类似 PS 魔法棒的抠图：在点击位置根据阈值去除颜色。
 * @param imageData 原始图像数据
 * @param options 抠图选项
 * @returns 处理后的图像数据
 */
export function removeBackground(imageData: ImageData, options: MattingOptions): ImageData {
  const { x, y, threshold = 10, contiguous = true } = options;
  const { width, height } = imageData;
  const data = new Uint8ClampedArray(imageData.data);
  const idx = (y * width + x) * 4;
  const target = { r: data[idx], g: data[idx + 1], b: data[idx + 2] };

  const withinThreshold = (i: number) => {
    const dr = data[i] - target.r;
    const dg = data[i + 1] - target.g;
    const db = data[i + 2] - target.b;
    return Math.sqrt(dr * dr + dg * dg + db * db) <= threshold;
  };

  if (contiguous) {
    const stack: [number, number][] = [[x, y]];
    const visited = new Uint8Array(width * height);
    while (stack.length) {
      const [cx, cy] = stack.pop()!;
      const pi = cy * width + cx;
      if (cx < 0 || cx >= width || cy < 0 || cy >= height || visited[pi]) continue;
      visited[pi] = 1;
      const di = pi * 4;
      if (withinThreshold(di)) {
        data[di + 3] = 0;
        stack.push([cx + 1, cy]);
        stack.push([cx - 1, cy]);
        stack.push([cx, cy + 1]);
        stack.push([cx, cy - 1]);
      }
    }
  } else {
    for (let i = 0; i < data.length; i += 4) {
      if (withinThreshold(i)) data[i + 3] = 0;
    }
  }

  return new ImageData(data, width, height);
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
