/**
 * 本文件包含颜色处理的工具函数。
 * 它提供了在不同颜色格式（如 HEX, RGB, HSL）之间进行解析和转换的功能。
 */

export interface HSLA {
  h: number;
  s: number;
  l: number;
  a: number;
}

/**
 * 解析十六进制颜色字符串。
 * @param {string} hex - 十六进制颜色字符串（例如 "#rgb" 或 "#rrggbb"）。
 * @returns {[number, number, number]} - 包含 R, G, B 值的数组。
 */
function parseHex(hex: string): [number, number, number] {
  hex = hex.startsWith('#') ? hex.slice(1) : hex;
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;
  return [r, g, b];
}

/**
 * 解析 RGB 或 RGBA 颜色字符串。
 * @param {string} rgb - RGB(A) 颜色字符串。
 * @returns {[number, number, number, number]} - 包含 R, G, B, A 值的数组。
 */
function parseRgb(rgb: string): [number, number, number, number] {
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!match) return [0, 0, 0, 1];
  return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3]), match[4] !== undefined ? parseFloat(match[4]) : 1];
}

/**
 * 解析 HSL 或 HSLA 颜色字符串。
 * @param {string} hsl - HSL(A) 颜色字符串。
 * @returns {[number, number, number, number]} - 包含 H, S, L, A 值的数组。
 */
function parseHsl(hsl: string): [number, number, number, number] {
    const match = hsl.match(/hsla?\((\d+),\s*([\d.]+)%?,\s*([\d.]+)%?(?:,\s*([\d.]+))?\)/);
    if (!match) return [0, 0, 0, 1];
    return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3]), match[4] !== undefined ? parseFloat(match[4]) : 1];
}

/**
 * 将 RGB 颜色值转换为 HSL。
 * @param {number} r - 红色分量 (0-255)。
 * @param {number} g - 绿色分量 (0-255)。
 * @param {number} b - 蓝色分量 (0-255)。
 * @returns {[number, number, number]} - 包含 H, S, L 值的数组。
 */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

/**
 * 将 HSL 颜色值转换为 RGB。
 * @param {number} h - 色相 (0-360)。
 * @param {number} s - 饱和度 (0-100)。
 * @param {number} l - 亮度 (0-100)。
 * @returns {[number, number, number]} - 包含 R, G, B 值的数组。
 */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100;
  l /= 100;
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hNormalized = h / 360;
    r = hue2rgb(p, q, hNormalized + 1 / 3);
    g = hue2rgb(p, q, hNormalized);
    b = hue2rgb(p, q, hNormalized - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/**
 * 将任何有效的 CSS 颜色字符串解析为 HSLA 对象。
 * @param {string} color - CSS 颜色字符串。
 * @returns {HSLA} - 包含 H, S, L, A 值的对象。
 */
export function parseColor(color: string): HSLA {
  const normalized = color.trim().toLowerCase();
  if (normalized === 'transparent') {
    return { h: 0, s: 0, l: 0, a: 0 };
  }

  if (color.startsWith('#')) {
    const [r, g, b] = parseHex(color);
    const [h, s, l] = rgbToHsl(r, g, b);
    return { h, s, l, a: 1 };
  }
  if (color.startsWith('rgb')) {
    const [r, g, b, a] = parseRgb(color);
    const [h, s, l] = rgbToHsl(r, g, b);
    return { h, s, l, a };
  }
  if (color.startsWith('hsl')) {
    const [h, s, l, a] = parseHsl(color);
    return { h, s, l, a };
  }
  return { h: 0, s: 0, l: 0, a: 1 }; // Fallback
}

/**
 * 将 HSLA 对象转换为 HSLA 字符串。
 * @param {HSLA} hsla - HSLA 对象。
 * @returns {string} - CSS HSLA 颜色字符串。
 */
export function hslaToHslaString(hsla: HSLA): string {
    return `hsla(${Math.round(hsla.h)}, ${Math.round(hsla.s)}%, ${Math.round(hsla.l)}%, ${hsla.a})`;
}

/**
 * 将 HSLA 对象转换为十六进制颜色字符串（忽略透明度）。
 * @param {HSLA} hsla - HSLA 对象。
 * @returns {string} - CSS 十六进制颜色字符串。
 */
export function hslaToHex(hsla: HSLA): string {
    const [r, g, b] = hslToRgb(hsla.h, hsla.s, hsla.l);
    const toHex = (c: number) => c.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}