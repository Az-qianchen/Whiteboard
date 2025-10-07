import type {
  AnyPath,
  VectorPathData,
  RectangleData,
  EllipseData,
  PolygonData,
  FrameData,
  TextData,
  ImageData,
  BrushPathData,
  GroupData,
  ArcData,
  Anchor,
  GradientFill,
  LinearGradientFill,
  RadialGradientFill,
  GradientStop,
  Point,
} from '@/types';
import { hslaToHslaString, parseColor, type HSLA } from '@/lib/color';

const clampProgress = (progress: number): number => {
  if (Number.isNaN(progress)) return 0;
  if (progress <= 0) return 0;
  if (progress >= 1) return 1;
  return progress;
};

const lerp = (from: number, to: number, progress: number): number => from + (to - from) * progress;

const lerpOptionalNumber = (
  fromValue: number | undefined,
  toValue: number | undefined,
  progress: number,
  fallback?: number
): number | undefined => {
  if (typeof fromValue === 'number' && typeof toValue === 'number') {
    return lerp(fromValue, toValue, progress);
  }
  if (typeof fromValue === 'number') {
    return progress <= 0.5 ? fromValue : toValue ?? fromValue;
  }
  if (typeof toValue === 'number') {
    return progress >= 0.5 ? toValue : fromValue ?? toValue;
  }
  return fallback;
};

const interpolateHue = (from: number, to: number, progress: number): number => {
  let delta = (to - from) % 360;
  if (delta > 180) {
    delta -= 360;
  } else if (delta < -180) {
    delta += 360;
  }
  return (from + delta * progress + 360) % 360;
};

const lerpColor = (fromColor: string | undefined, toColor: string | undefined, progress: number): string | undefined => {
  if (!fromColor && !toColor) return undefined;
  if (!fromColor) return toColor;
  if (!toColor) return fromColor;

  const from = parseColor(fromColor);
  const to = parseColor(toColor);
  const blended: HSLA = {
    h: interpolateHue(from.h, to.h, progress),
    s: lerp(from.s, to.s, progress),
    l: lerp(from.l, to.l, progress),
    a: lerp(from.a, to.a, progress),
  };
  return hslaToHslaString(blended);
};

const clonePath = <T extends AnyPath>(path: T): T => {
  return JSON.parse(JSON.stringify(path)) as T;
};

const interpolatePoint = (from: Point, to: Point, progress: number): Point => ({
  x: lerp(from.x, to.x, progress),
  y: lerp(from.y, to.y, progress),
});

const interpolateAnchor = (from: Anchor, to: Anchor, progress: number): Anchor => ({
  point: interpolatePoint(from.point, to.point, progress),
  handleIn: interpolatePoint(from.handleIn, to.handleIn, progress),
  handleOut: interpolatePoint(from.handleOut, to.handleOut, progress),
});

const interpolateGradientStops = (
  fromStops: GradientStop[],
  toStops: GradientStop[],
  progress: number
): GradientStop[] => {
  const count = Math.min(fromStops.length, toStops.length);
  if (count === 0) {
    return toStops.length > 0 ? toStops.map(stop => ({ ...stop })) : fromStops.map(stop => ({ ...stop }));
  }
  const result: GradientStop[] = [];
  for (let i = 0; i < count; i += 1) {
    const fromStop = fromStops[i];
    const toStop = toStops[i];
    result.push({
      offset: lerp(fromStop.offset, toStop.offset, progress),
      color: lerpColor(fromStop.color, toStop.color, progress) ?? (progress < 0.5 ? fromStop.color : toStop.color),
      opacity: lerpOptionalNumber(fromStop.opacity, toStop.opacity, progress),
    });
  }
  return result;
};

const interpolateGradient = (
  fromGradient: GradientFill | null | undefined,
  toGradient: GradientFill | null | undefined,
  progress: number
): GradientFill | null | undefined => {
  if (!fromGradient && !toGradient) {
    return undefined;
  }
  if (!fromGradient) {
    return toGradient ? JSON.parse(JSON.stringify(toGradient)) as GradientFill : null;
  }
  if (!toGradient) {
    return fromGradient ? JSON.parse(JSON.stringify(fromGradient)) as GradientFill : null;
  }
  if (fromGradient.type !== toGradient.type) {
    return progress < 0.5 ? (JSON.parse(JSON.stringify(fromGradient)) as GradientFill) : (JSON.parse(JSON.stringify(toGradient)) as GradientFill);
  }

  if (fromGradient.type === 'linear' && toGradient.type === 'linear') {
    const fromLinear = fromGradient as LinearGradientFill;
    const toLinear = toGradient as LinearGradientFill;
    return {
      type: 'linear',
      angle: lerp(fromLinear.angle, toLinear.angle, progress),
      stops: interpolateGradientStops(fromLinear.stops, toLinear.stops, progress),
      start: fromLinear.start && toLinear.start ? interpolatePoint(fromLinear.start, toLinear.start, progress) : (toLinear.start ?? fromLinear.start),
      end: fromLinear.end && toLinear.end ? interpolatePoint(fromLinear.end, toLinear.end, progress) : (toLinear.end ?? fromLinear.end),
    };
  }

  const fromRadial = fromGradient as RadialGradientFill;
  const toRadial = toGradient as RadialGradientFill;
  return {
    type: 'radial',
    stops: interpolateGradientStops(fromRadial.stops, toRadial.stops, progress),
    center: interpolatePoint(fromRadial.center, toRadial.center, progress),
    edge: interpolatePoint(fromRadial.edge, toRadial.edge, progress),
  };
};

const applySharedPathProperties = (
  base: AnyPath,
  fromPath: AnyPath,
  toPath: AnyPath,
  progress: number
) => {
  const color = lerpColor(fromPath.color, toPath.color, progress);
  if (color) {
    base.color = color;
  }
  const fill = lerpColor(fromPath.fill, toPath.fill, progress);
  if (fill) {
    base.fill = fill;
  }
  base.fillGradient = interpolateGradient(fromPath.fillGradient, toPath.fillGradient, progress);
  base.fillStyle = progress < 0.5 ? fromPath.fillStyle : toPath.fillStyle;
  base.strokeWidth = lerpOptionalNumber(fromPath.strokeWidth, toPath.strokeWidth, progress, base.strokeWidth ?? toPath.strokeWidth ?? fromPath.strokeWidth ?? 0) ?? base.strokeWidth;
  base.opacity = lerpOptionalNumber(fromPath.opacity ?? 1, toPath.opacity ?? 1, progress) ?? 1;
  base.rotation = lerpOptionalNumber(fromPath.rotation ?? 0, toPath.rotation ?? 0, progress) ?? base.rotation;
  base.scaleX = lerpOptionalNumber(fromPath.scaleX ?? 1, toPath.scaleX ?? 1, progress) ?? base.scaleX;
  base.scaleY = lerpOptionalNumber(fromPath.scaleY ?? 1, toPath.scaleY ?? 1, progress) ?? base.scaleY;
  if ('shadowColor' in fromPath || 'shadowColor' in toPath) {
    const shadowColor = lerpColor((fromPath as any).shadowColor, (toPath as any).shadowColor, progress);
    if (shadowColor) {
      (base as any).shadowColor = shadowColor;
    }
  }
  const numericKeys: Array<keyof AnyPath> = [
    'shadowOffsetX',
    'shadowOffsetY',
    'shadowBlur',
    'roughness',
    'bowing',
    'fillWeight',
    'hachureAngle',
    'hachureGap',
    'curveTightness',
    'curveStepCount',
    'endpointSize',
  ];
  numericKeys.forEach(key => {
    const value = lerpOptionalNumber((fromPath as any)[key], (toPath as any)[key], progress);
    if (value !== undefined) {
      (base as any)[key] = value;
    }
  });
  base.isVisible = toPath.isVisible ?? fromPath.isVisible;
  base.isLocked = toPath.isLocked ?? fromPath.isLocked;
  base.name = toPath.name ?? fromPath.name;
};

const interpolateRectangleLike = <T extends RectangleData | FrameData | PolygonData | ImageData | EllipseData>(
  fromPath: T,
  toPath: T,
  progress: number
): T => {
  const base = clonePath(fromPath);
  applySharedPathProperties(base, fromPath, toPath, progress);
  base.x = lerp(fromPath.x, toPath.x, progress);
  base.y = lerp(fromPath.y, toPath.y, progress);
  base.width = lerp(fromPath.width, toPath.width, progress);
  base.height = lerp(fromPath.height, toPath.height, progress);
  if ('borderRadius' in fromPath || 'borderRadius' in toPath) {
    (base as any).borderRadius = lerpOptionalNumber((fromPath as any).borderRadius, (toPath as any).borderRadius, progress);
  }
  if ('skewX' in fromPath || 'skewX' in toPath) {
    (base as any).skewX = lerpOptionalNumber((fromPath as any).skewX, (toPath as any).skewX, progress);
  }
  if ('skewY' in fromPath || 'skewY' in toPath) {
    (base as any).skewY = lerpOptionalNumber((fromPath as any).skewY, (toPath as any).skewY, progress);
  }
  if ('sides' in fromPath || 'sides' in toPath) {
    (base as any).sides = (progress < 0.5 ? (fromPath as any).sides : (toPath as any).sides) ?? (fromPath as any).sides;
  }
  return base;
};

const interpolateText = (fromPath: TextData, toPath: TextData, progress: number): TextData => {
  const base = clonePath(fromPath);
  applySharedPathProperties(base, fromPath, toPath, progress);
  base.x = lerp(fromPath.x, toPath.x, progress);
  base.y = lerp(fromPath.y, toPath.y, progress);
  base.width = lerp(fromPath.width, toPath.width, progress);
  base.height = lerp(fromPath.height, toPath.height, progress);
  base.fontSize = lerp(fromPath.fontSize, toPath.fontSize, progress);
  base.lineHeight = lerp(fromPath.lineHeight, toPath.lineHeight, progress);
  base.text = progress < 0.5 ? fromPath.text : toPath.text;
  base.textAlign = progress < 0.5 ? fromPath.textAlign : toPath.textAlign;
  base.fontFamily = progress < 0.5 ? fromPath.fontFamily : toPath.fontFamily;
  base.fontWeight = lerpOptionalNumber(fromPath.fontWeight, toPath.fontWeight, progress);
  return base;
};

const interpolateVector = (fromPath: VectorPathData, toPath: VectorPathData, progress: number): VectorPathData => {
  if (fromPath.anchors.length !== toPath.anchors.length) {
    return progress < 0.5 ? clonePath(fromPath) : clonePath(toPath);
  }
  const base = clonePath(fromPath);
  applySharedPathProperties(base, fromPath, toPath, progress);
  base.anchors = fromPath.anchors.map((anchor, index) => interpolateAnchor(anchor, toPath.anchors[index], progress));
  base.isClosed = toPath.isClosed ?? fromPath.isClosed;
  return base;
};

const interpolateBrush = (fromPath: BrushPathData, toPath: BrushPathData, progress: number): BrushPathData => {
  if (fromPath.points.length !== toPath.points.length) {
    return progress < 0.5 ? clonePath(fromPath) : clonePath(toPath);
  }
  const base = clonePath(fromPath);
  applySharedPathProperties(base, fromPath, toPath, progress);
  base.points = fromPath.points.map((point, index) => interpolatePoint(point, toPath.points[index], progress));
  return base;
};

const interpolateArc = (fromPath: ArcData, toPath: ArcData, progress: number): ArcData => {
  const base = clonePath(fromPath);
  applySharedPathProperties(base, fromPath, toPath, progress);
  base.points = fromPath.points.map((point, index) => interpolatePoint(point, toPath.points[index] ?? point)) as [Point, Point, Point];
  return base;
};

const interpolateGroup = (fromPath: GroupData, toPath: GroupData, progress: number): GroupData => {
  const base = clonePath(fromPath);
  applySharedPathProperties(base, fromPath, toPath, progress);
  base.children = interpolatePathCollection(fromPath.children, toPath.children, progress);
  base.isCollapsed = toPath.isCollapsed ?? fromPath.isCollapsed;
  base.mask = toPath.mask ?? fromPath.mask;
  return base;
};

const interpolatePathPair = (fromPath: AnyPath, toPath: AnyPath, progress: number): AnyPath => {
  if (fromPath.tool !== toPath.tool) {
    return progress < 0.5 ? clonePath(fromPath) : clonePath(toPath);
  }
  switch (fromPath.tool) {
    case 'rectangle':
      return interpolateRectangleLike(fromPath as RectangleData, toPath as RectangleData, progress);
    case 'frame':
      return interpolateRectangleLike(fromPath as FrameData, toPath as FrameData, progress);
    case 'polygon':
      return interpolateRectangleLike(fromPath as PolygonData, toPath as PolygonData, progress);
    case 'ellipse':
      return interpolateRectangleLike(fromPath as EllipseData, toPath as EllipseData, progress);
    case 'image':
      return interpolateRectangleLike(fromPath as ImageData, toPath as ImageData, progress);
    case 'text':
      return interpolateText(fromPath as TextData, toPath as TextData, progress);
    case 'pen':
    case 'line':
      return interpolateVector(fromPath as VectorPathData, toPath as VectorPathData, progress);
    case 'brush':
      return interpolateBrush(fromPath as BrushPathData, toPath as BrushPathData, progress);
    case 'arc':
      return interpolateArc(fromPath as ArcData, toPath as ArcData, progress);
    case 'group':
      return interpolateGroup(fromPath as GroupData, toPath as GroupData, progress);
    default:
      return progress < 0.5 ? clonePath(fromPath) : clonePath(toPath);
  }
};

const interpolatePathCollection = (
  fromPaths: AnyPath[],
  toPaths: AnyPath[],
  progress: number
): AnyPath[] => {
  const clampedProgress = clampProgress(progress);
  const fromMap = new Map(fromPaths.map(path => [path.id, path]));
  const toMap = new Map(toPaths.map(path => [path.id, path]));
  const orderedIds: string[] = [];
  const seen = new Set<string>();
  for (const path of toPaths) {
    orderedIds.push(path.id);
    seen.add(path.id);
  }
  for (const path of fromPaths) {
    if (!seen.has(path.id)) {
      orderedIds.push(path.id);
      seen.add(path.id);
    }
  }

  return orderedIds.map(id => {
    const fromPath = fromMap.get(id);
    const toPath = toMap.get(id);
    if (fromPath && toPath) {
      return interpolatePathPair(fromPath, toPath, clampedProgress);
    }
    if (fromPath) {
      return clonePath(fromPath);
    }
    if (toPath) {
      return clonePath(toPath);
    }
    throw new Error('Path with id not found in either collection');
  });
};

export const interpolateFramePaths = (
  fromPaths: AnyPath[],
  toPaths: AnyPath[],
  progress: number
): AnyPath[] => {
  if (progress <= 0) {
    return fromPaths.map(clonePath);
  }
  if (progress >= 1) {
    return toPaths.map(clonePath);
  }
  return interpolatePathCollection(fromPaths, toPaths, progress);
};

