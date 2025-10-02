import type { RoughSVG } from 'roughjs/bin/svg';
import type { ArcData, EndpointStyle } from '@/types';
import { sampleArc } from '@/lib/drawing/arc';
import { createCapNode } from '../markers/rough';

interface RenderResult {
  node: SVGElement | null;
  capNodes: SVGElement[];
}

const isNativeSvgCap = (style: EndpointStyle): style is 'round' | 'square_cap' => {
  return style === 'round' || style === 'square_cap';
};

const toRoughPoints = (points: { x: number; y: number }[]): Array<[number, number]> => {
  return points.map(point => [point.x, point.y]);
};

const applyGeneratedStyles = (
  element: SVGElement,
  joinStyle: 'miter' | 'round' | 'bevel',
  lineCap: 'butt' | 'round' | 'square'
) => {
  if (element.tagName === 'path') {
    element.setAttribute('stroke-linejoin', joinStyle);
    element.setAttribute('stroke-linecap', lineCap);
  }

  element.childNodes.forEach(child => {
    applyGeneratedStyles(child as SVGElement, joinStyle, lineCap);
  });
};

const calculateCapAngle = (
  a: { x: number; y: number },
  b: { x: number; y: number }
) => {
  return Math.atan2(a.y - b.y, a.x - b.x);
};

export function renderRoughArcPath(rc: RoughSVG, data: ArcData, options: any): RenderResult {
  const capNodes: SVGElement[] = [];
  const [start, end, via] = data.points;
  const sampledPoints = sampleArc(start, end, via, 50);

  if (sampledPoints.length === 0) {
    return { node: null, capNodes };
  }

  const pathOptions = {
    ...options,
    curveStepCount: 1,
    curveTightness: 0,
  };

  const roughPoints = toRoughPoints(sampledPoints);
  const node = rc.curve(roughPoints, pathOptions);
  const joinStyle = data.strokeLineJoin ?? 'round';

  const startCapType = data.strokeLineCapStart ?? 'butt';
  const endCapType = data.strokeLineCapEnd ?? 'butt';

  let nativeLineCapToApply: 'butt' | 'round' | 'square' = 'butt';
  let drawCustomStartCap = !isNativeSvgCap(startCapType) && startCapType !== 'butt' && startCapType !== 'none';
  let drawCustomEndCap = !isNativeSvgCap(endCapType) && endCapType !== 'butt' && endCapType !== 'none';

  if (drawCustomStartCap || drawCustomEndCap) {
    nativeLineCapToApply = 'round';
  }

  if (isNativeSvgCap(startCapType) && isNativeSvgCap(endCapType)) {
    if (startCapType === endCapType) {
      nativeLineCapToApply = startCapType === 'square_cap' ? 'square' : 'round';
      drawCustomStartCap = false;
      drawCustomEndCap = false;
    } else {
      nativeLineCapToApply = 'butt';
      drawCustomStartCap = true;
      drawCustomEndCap = true;
    }
  } else if (isNativeSvgCap(startCapType) && !drawCustomEndCap) {
    nativeLineCapToApply = startCapType === 'square_cap' ? 'square' : 'round';
    drawCustomStartCap = false;
  } else if (isNativeSvgCap(endCapType) && !drawCustomStartCap) {
    nativeLineCapToApply = endCapType === 'square_cap' ? 'square' : 'round';
    drawCustomEndCap = false;
  }

  if (node) {
    applyGeneratedStyles(node, joinStyle, nativeLineCapToApply);
  }

  if (drawCustomStartCap || drawCustomEndCap) {
    const capOptions: any = {
      seed: options.seed,
      roughness: data.roughness,
      bowing: data.bowing,
      stroke: data.color,
      strokeWidth: data.strokeWidth,
      disableMultiStroke: data.disableMultiStroke,
      disableMultiStrokeFill: data.disableMultiStrokeFill,
    };

    const strokeScale = data.endpointSize ?? 1;
    const endpointFill = data.endpointFill ?? 'hollow';
    const pointsCount = sampledPoints.length;

    if (drawCustomStartCap) {
      const startPoint = sampledPoints[0];
      const nextPoint = sampledPoints[1] ?? sampledPoints[0];
      const startAngle = calculateCapAngle(startPoint, nextPoint);
      const startCapNode = createCapNode(
        rc,
        startCapType,
        startPoint,
        startAngle,
        data.strokeWidth,
        strokeScale,
        endpointFill,
        capOptions
      );
      if (startCapNode) {
        capNodes.push(startCapNode);
      }
    }

    if (drawCustomEndCap) {
      const endPoint = sampledPoints[pointsCount - 1];
      const previousPoint = sampledPoints[pointsCount - 2] ?? endPoint;
      const endAngle = calculateCapAngle(endPoint, previousPoint);
      const endCapNode = createCapNode(
        rc,
        endCapType,
        endPoint,
        endAngle,
        data.strokeWidth,
        strokeScale,
        endpointFill,
        capOptions
      );
      if (endCapNode) {
        capNodes.push(endCapNode);
      }
    }
  }

  return { node, capNodes };
}
