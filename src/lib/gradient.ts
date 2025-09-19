import type { GradientFill, GradientStop } from '@/types';
import { parseColor, hslaToHslaString } from './color';

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const normalizeAngle = (angle: number): number => {
  const normalized = angle % 360;
  return normalized < 0 ? normalized + 360 : normalized;
};

const colorWithOpacity = (color: string, opacity?: number): string => {
  if (opacity === undefined) return color;
  const hsla = parseColor(color);
  return hslaToHslaString({ ...hsla, a: clamp(opacity, 0, 1) });
};

const lightenColor = (color: string, amount: number = 12): string => {
  const hsla = parseColor(color);
  return hslaToHslaString({ ...hsla, l: clamp(hsla.l + amount, 0, 100) });
};

export const normalizeStops = (stops: GradientStop[]): GradientStop[] =>
  stops
    .map(stop => ({ ...stop, offset: clamp(stop.offset, 0, 1) }))
    .sort((a, b) => a.offset - b.offset);

export function gradientToCss(gradient: GradientFill): string {
  const angle = normalizeAngle(gradient.angle);
  const stops = normalizeStops(gradient.stops)
    .map(stop => `${colorWithOpacity(stop.color, stop.opacity)} ${Math.round(stop.offset * 100)}%`)
    .join(', ');
  return `linear-gradient(${angle}deg, ${stops})`;
}

export function gradientHasVisibleColor(gradient: GradientFill): boolean {
  return normalizeStops(gradient.stops).some(stop => {
    if (stop.opacity !== undefined) {
      return stop.opacity > 0.01;
    }
    return parseColor(colorWithOpacity(stop.color, stop.opacity)).a > 0.01;
  });
}

export function createDefaultLinearGradient(baseColor: string): GradientFill {
  const fallbackColor = baseColor === 'transparent' ? '#4dabf7' : baseColor;
  const startColor = fallbackColor;
  const endColor = lightenColor(fallbackColor, 18);
  return {
    type: 'linear',
    angle: 45,
    stops: [
      { offset: 0, color: startColor },
      { offset: 1, color: endColor },
    ],
  };
}

export function updateGradientStopColor(gradient: GradientFill, stopIndex: number, color: string): GradientFill {
  return {
    ...gradient,
    stops: gradient.stops.map((stop, index) => (index === stopIndex ? { ...stop, color } : stop)),
  };
}

export function updateGradientAngle(gradient: GradientFill, angle: number): GradientFill {
  return {
    ...gradient,
    angle: normalizeAngle(angle),
  };
}

export function getLinearGradientCoordinates(angle: number): { x1: number; y1: number; x2: number; y2: number } {
  const normalized = normalizeAngle(angle) * (Math.PI / 180);
  const cos = Math.cos(normalized);
  const sin = Math.sin(normalized);
  return {
    x1: 0.5 - cos / 2,
    y1: 0.5 - sin / 2,
    x2: 0.5 + cos / 2,
    y2: 0.5 + sin / 2,
  };
}

export function gradientStopColor(gradient: GradientFill, index: number): string {
  const stop = gradient.stops[index];
  if (!stop) return 'transparent';
  return colorWithOpacity(stop.color, stop.opacity);
}
