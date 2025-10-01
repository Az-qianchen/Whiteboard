import type {
  AnyPath,
  GradientFill,
  GradientHandle,
  GradientStop,
  LinearGradientFill,
  RadialGradientFill,
  RectangleData,
  EllipseData,
  PolygonData,
  FrameData,
  ImageData,
} from '@/types';
import { parseColor, hslaToHslaString } from './color';

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
const clamp01 = (value: number): number => clamp(value, 0, 1);

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

const clampHandle = (handle: GradientHandle): GradientHandle => ({
  x: clamp01(handle.x),
  y: clamp01(handle.y),
});

const handlesFromAngle = (angle: number): [GradientHandle, GradientHandle] => {
  const normalized = normalizeAngle(angle) * (Math.PI / 180);
  const cos = Math.cos(normalized);
  const sin = Math.sin(normalized);
  const dx = cos / 2;
  const dy = sin / 2;
  return [
    clampHandle({ x: 0.5 - dx, y: 0.5 - dy }),
    clampHandle({ x: 0.5 + dx, y: 0.5 + dy }),
  ];
};

export const getLinearHandles = (gradient: LinearGradientFill): [GradientHandle, GradientHandle] => {
  if (gradient.start && gradient.end) {
    return [clampHandle(gradient.start), clampHandle(gradient.end)];
  }
  return handlesFromAngle(gradient.angle ?? 0);
};

const formatPercent = (value: number): string => `${Math.round(clamp01(value) * 100)}%`;

export const normalizeStops = (stops: GradientStop[]): GradientStop[] =>
  stops
    .map(stop => ({ ...stop, offset: clamp01(stop.offset) }))
    .sort((a, b) => a.offset - b.offset);

type GradientTransformableShape = RectangleData | EllipseData | PolygonData | FrameData | ImageData;

const isGradientTransformableShape = (shape: AnyPath): shape is GradientTransformableShape =>
  shape.tool === 'rectangle'
  || shape.tool === 'ellipse'
  || shape.tool === 'polygon'
  || shape.tool === 'frame'
  || shape.tool === 'image';

const toDegrees = (radians: number): number => radians * (180 / Math.PI);

const isApproximately = (value: number, target: number = 0, epsilon: number = 1e-6): boolean =>
  Math.abs(value - target) < epsilon;

export function getGradientTransform(shape: AnyPath): string | null {
  if (!isGradientTransformableShape(shape)) {
    return null;
  }

  const transforms: string[] = [];

  const rotation = shape.rotation ?? 0;
  if (!isApproximately(rotation)) {
    transforms.push(`rotate(${toDegrees(rotation)})`);
  }

  const skewX = shape.skewX ?? 0;
  if (!isApproximately(skewX)) {
    transforms.push(`skewX(${toDegrees(Math.atan(skewX))})`);
  }

  const skewY = shape.skewY ?? 0;
  if (!isApproximately(skewY)) {
    transforms.push(`skewY(${toDegrees(Math.atan(skewY))})`);
  }

  const scaleX = shape.scaleX ?? 1;
  const scaleY = shape.scaleY ?? 1;
  if (!isApproximately(scaleX, 1) || !isApproximately(scaleY, 1)) {
    transforms.push(`scale(${scaleX} ${scaleY})`);
  }

  if (transforms.length === 0) {
    return null;
  }

  return `translate(0.5 0.5) ${transforms.join(' ')} translate(-0.5 -0.5)`;
}

export function gradientToCss(gradient: GradientFill): string {
  const stops = normalizeStops(gradient.stops)
    .map(stop => `${colorWithOpacity(stop.color, stop.opacity)} ${formatPercent(stop.offset)}`)
    .join(', ');

  if (gradient.type === 'linear') {
    const [start, end] = getLinearHandles(gradient);
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const derivedAngle = Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6
      ? gradient.angle
      : (Math.atan2(dy, dx) * 180) / Math.PI;
    const angle = normalizeAngle(derivedAngle ?? 0);
    return `linear-gradient(${angle}deg, ${stops})`;
  }

  const center = clampHandle(gradient.center);
  const edge = clampHandle(gradient.edge);
  const radius = clamp(Math.hypot(edge.x - center.x, edge.y - center.y), 0.01, 2);
  const radiusPercent = clamp(Math.round(radius * 100), 1, 200);
  return `radial-gradient(circle ${radiusPercent}% at ${Math.round(center.x * 100)}% ${Math.round(center.y * 100)}%, ${stops})`;
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
  const [start, end] = handlesFromAngle(45);
  return {
    type: 'linear',
    angle: 45,
    start,
    end,
    stops: [
      { offset: 0, color: startColor },
      { offset: 1, color: endColor },
    ],
  };
}

export function createDefaultRadialGradient(baseColor: string): GradientFill {
  const fallbackColor = baseColor === 'transparent' ? '#4dabf7' : baseColor;
  const startColor = fallbackColor;
  const endColor = lightenColor(fallbackColor, 18);
  return {
    type: 'radial',
    center: { x: 0.5, y: 0.5 },
    edge: { x: 0.8, y: 0.5 },
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
  if (gradient.type !== 'linear') return gradient;

  const normalized = normalizeAngle(angle);
  const [start, end] = getLinearHandles(gradient);
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  const halfLength = Math.max(Math.hypot(end.x - start.x, end.y - start.y) / 2, 0.25);
  const rad = (normalized * Math.PI) / 180;
  const dx = Math.cos(rad) * halfLength;
  const dy = Math.sin(rad) * halfLength;
  const nextStart = clampHandle({ x: midX - dx, y: midY - dy });
  const nextEnd = clampHandle({ x: midX + dx, y: midY + dy });

  return {
    ...gradient,
    angle: normalized,
    start: nextStart,
    end: nextEnd,
  };
}

export function getLinearGradientCoordinates(gradient: LinearGradientFill): {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
} {
  const [start, end] = getLinearHandles(gradient);
  return {
    x1: start.x,
    y1: start.y,
    x2: end.x,
    y2: end.y,
  };
}

export function getRadialGradientAttributes(gradient: RadialGradientFill): {
  cx: number;
  cy: number;
  fx: number;
  fy: number;
  r: number;
} {
  const center = clampHandle(gradient.center);
  const edge = clampHandle(gradient.edge);
  const radius = clamp(Math.hypot(edge.x - center.x, edge.y - center.y), 0.01, 2);
  return {
    cx: center.x,
    cy: center.y,
    fx: center.x,
    fy: center.y,
    r: radius,
  };
}

export function gradientStopColor(gradient: GradientFill, index: number): string {
  const stop = gradient.stops[index];
  if (!stop) return 'transparent';
  return colorWithOpacity(stop.color, stop.opacity);
}

export function updateLinearGradientHandles(
  gradient: LinearGradientFill,
  handles: [GradientHandle, GradientHandle],
): LinearGradientFill {
  const [rawStart, rawEnd] = handles;
  const start = clampHandle(rawStart);
  const end = clampHandle(rawEnd);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const angle = Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6
    ? gradient.angle
    : normalizeAngle((Math.atan2(dy, dx) * 180) / Math.PI);
  return {
    ...gradient,
    start,
    end,
    angle,
  };
}

export function updateRadialGradientHandles(
  gradient: RadialGradientFill,
  updates: { center?: GradientHandle; edge?: GradientHandle },
): RadialGradientFill {
  const centerUpdate = updates.center ? clampHandle(updates.center) : gradient.center;
  const deltaX = centerUpdate.x - gradient.center.x;
  const deltaY = centerUpdate.y - gradient.center.y;

  const edgeCandidate = updates.edge
    ? clampHandle(updates.edge)
    : clampHandle({ x: gradient.edge.x + deltaX, y: gradient.edge.y + deltaY });

  const distance = Math.hypot(edgeCandidate.x - centerUpdate.x, edgeCandidate.y - centerUpdate.y);
  const minRadius = 0.01;
  let safeEdge = edgeCandidate;

  if (distance < minRadius) {
    let fallbackX = clamp01(centerUpdate.x + minRadius);
    let fallbackY = centerUpdate.y;

    if (fallbackX === centerUpdate.x) {
      fallbackY = clamp01(centerUpdate.y + minRadius);
      if (fallbackY === centerUpdate.y) {
        fallbackY = clamp01(centerUpdate.y - minRadius);
      }
    }

    if (fallbackX === centerUpdate.x && fallbackY === centerUpdate.y) {
      fallbackX = clamp01(centerUpdate.x - minRadius);
    }

    safeEdge = clampHandle({ x: fallbackX, y: fallbackY });
  }

  return {
    ...gradient,
    center: centerUpdate,
    edge: safeEdge,
  };
}
