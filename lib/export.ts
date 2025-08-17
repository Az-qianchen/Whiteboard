/**
 * This file contains functions for exporting drawings to SVG and PNG formats.
 * It includes a shared rendering function to convert path data into SVG nodes.
 */
import rough from 'roughjs/bin/rough';
import type { RoughSVG } from 'roughjs/bin/svg';
import type { AnyPath, Point, VectorPathData, RectangleData, EllipseData, ImageData, EndpointStyle } from '../types';
import { getPathsBoundingBox, movePath, rotatePoint, dist } from './geometry';
import { samplePath, anchorsToPathD, ramerDouglasPeucker } from './path-fitting';

/**
 * Samples points from a path to convert it into a polyline for rendering.
 * This ensures that properties like 'bowing' can be applied consistently.
 * @param data The path data object.
 * @returns An array of [x, y] points.
 */
function getPathPoints(data: AnyPath): Array<[number, number]> {
    switch (data.tool) {
        case 'rectangle': {
            const { x, y, width, height, borderRadius } = data as RectangleData;
            const r = Math.max(0, Math.min(borderRadius ?? 0, width / 2, height / 2));

            if (r < 0.1) {
                // Return a simple rectangle if there's no border radius
                const points: Array<[number, number]> = [[x, y], [x + width, y], [x + width, y + height], [x, y + height]];
                 if ((data.simplification ?? 0) > 0.1) {
                    const epsilon = (data.strokeWidth / 2) * data.simplification;
                    const simplified = ramerDouglasPeucker(points.map(p => ({x: p[0], y: p[1]})), epsilon);
                    return simplified.map(p => [p.x, p.y]);
                }
                return points;
            }
            
            const points: Array<[number, number]> = [];
            // Dynamically calculate steps for smoother curves on larger radii
            const stepsPerCorner = Math.max(5, Math.ceil(r / 3));

            const addArc = (cx: number, cy: number, startAngle: number, endAngle: number) => {
                for (let i = 0; i <= stepsPerCorner; i++) {
                    const angle = startAngle + (endAngle - startAngle) * (i / stepsPerCorner);
                    points.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
                }
            };
            
            // Generate arcs for each corner in clockwise order
            // Top-left corner
            addArc(x + r, y + r, Math.PI, Math.PI * 1.5);
            // Top-right corner
            addArc(x + width - r, y + r, Math.PI * 1.5, Math.PI * 2);
            // Bottom-right corner
            addArc(x + width - r, y + height - r, 0, Math.PI * 0.5);
            // Bottom-left corner
            addArc(x + r, y + height - r, Math.PI * 0.5, Math.PI);

            if ((data.simplification ?? 0) > 0.1) {
                const epsilon = (data.strokeWidth / 2) * data.simplification;
                const simplified = ramerDouglasPeucker(points.map(p => ({x: p[0], y: p[1]})), epsilon);
                return simplified.map(p => [p.x, p.y]);
            }
            return points;
        }
        case 'ellipse': {
            const { x, y, width, height } = data as EllipseData;
            const cx = x + width / 2;
            const cy = y + height / 2;
            const rx = Math.abs(width / 2);
            const ry = Math.abs(height / 2);
            const points: Array<[number, number]> = [];
            const steps = Math.max(16, Math.floor(Math.max(width, height) / 4));
            for (let i = 0; i < steps; i++) { // Use < instead of <= to avoid duplicate end point
                const angle = (i / steps) * 2 * Math.PI;
                points.push([cx + rx * Math.cos(angle), cy + ry * Math.sin(angle)]);
            }
             if ((data.simplification ?? 0) > 0.1) {
                const epsilon = (data.strokeWidth / 2) * data.simplification;
                const simplified = ramerDouglasPeucker(points.map(p => ({x: p[0], y: p[1]})), epsilon);
                return simplified.map(p => [p.x, p.y]);
            }
            return points;
        }
        case 'pen':
        case 'line': {
            const pathData = data as VectorPathData;
            if (!pathData.anchors) return [];
            if (pathData.anchors.length < 2) {
                return pathData.anchors.map(a => [a.point.x, a.point.y]);
            }
            // Use curveStepCount to give user control over sampling fidelity
            const stepsPerSegment = 2 + Math.ceil((pathData.curveStepCount || 9) * 1.5);
            const sampledPoints = samplePath(pathData.anchors, stepsPerSegment, !!pathData.isClosed);
            return sampledPoints.map(p => [p.x, p.y]);
        }
        default:
            return [];
    }
}

// Helper function to create an endpoint marker node.
function createCapNode(
    rc: RoughSVG, 
    type: EndpointStyle, 
    point: Point, 
    angle: number, 
    strokeWidth: number,
    endpointSize: number, 
    endpointFill: 'solid' | 'hollow',
    options: any
): SVGElement | null {
    if (type === 'none' || type === 'butt') return null;

    const sizeMultiplier = endpointSize ?? 1;
    const { stroke, ...baseOptions } = options;

    const lineMarkerOptions = { ...baseOptions, fill: 'none', stroke, strokeWidth: baseOptions.strokeWidth };
    const solidFillMarkerOptions = { ...baseOptions, stroke: 'none', fill: stroke, fillStyle: 'solid' };
    const hollowFillMarkerOptions = { ...lineMarkerOptions, fill: 'transparent' };
    
    const useSolidFill = endpointFill === 'solid';

    const rotateAndTranslate = (p: Point, origin: Point): Point => {
        const rotated = rotatePoint(p, {x: 0, y: 0}, angle);
        return { x: rotated.x + origin.x, y: rotated.y + origin.y };
    };
    
    const toPoints = (points: Point[], origin: Point): [number, number][] => 
        points.map(p => {
            const finalPoint = rotateAndTranslate(p, origin);
            return [finalPoint.x, finalPoint.y];
        });

    const getOutwardOrigin = (size: number): Point => {
        const centerOffset = rotatePoint({x: size / 2, y: 0}, {x:0, y:0}, angle);
        return { x: point.x + centerOffset.x, y: point.y + centerOffset.y };
    }

    switch (type) {
        // These are true line caps, always solid
        case 'round': {
            return rc.circle(point.x, point.y, strokeWidth, solidFillMarkerOptions);
        }
        case 'square_cap': {
            const s = strokeWidth;
            const half_s = s / 2;
            const centerOffset = rotatePoint({ x: half_s, y: 0 }, { x: 0, y: 0 }, angle);
            const origin = { x: point.x + centerOffset.x, y: point.y + centerOffset.y };
            const points: Point[] = [ {x: -half_s, y: -half_s}, {x: half_s, y: -half_s}, {x: half_s, y: half_s}, {x: -half_s, y: half_s} ];
            return rc.polygon(toPoints(points, origin), solidFillMarkerOptions);
        }

        // These are non-fillable line markers
        case 'bar': {
            const length = strokeWidth * 1.2 * sizeMultiplier;
            const points: Point[] = [{x: 0, y: -length}, {x: 0, y: length}];
            const finalPoints = toPoints(points, point);
            return rc.line(finalPoints[0][0], finalPoints[0][1], finalPoints[1][0], finalPoints[1][1], lineMarkerOptions);
        }
        case 'arrow': {
            const length = strokeWidth * 1.5 * sizeMultiplier;
            const base = strokeWidth * 1.5 * sizeMultiplier;
            // The tip of the arrow should be at the origin (0,0) to connect with the line endpoint.
            // The wings should point backwards from the tip. This creates a ">" shape pointing right in local coords.
            const points: Point[] = [ { x: -length, y: -base / 2 }, { x: 0, y: 0 }, { x: -length, y: base / 2 } ];
            return rc.linearPath(toPoints(points, point), lineMarkerOptions);
        }
        case 'reverse_arrow': {
            const length = strokeWidth * 1.5 * sizeMultiplier;
            const base = strokeWidth * 1.5 * sizeMultiplier;
            // The tip of the arrow should be at the origin (0,0).
            // For a reverse arrow, the wings point forward from the tip. This creates a "<" shape pointing left in local coords.
            const points: Point[] = [ { x: length, y: -base / 2 }, { x: 0, y: 0 }, { x: length, y: base / 2 } ];
            return rc.linearPath(toPoints(points, point), lineMarkerOptions);
        }
        
        // These are fillable line markers
        case 'dot': { // This is the "inverted triangle" (tip-connected, outward pointing)
            const height = strokeWidth * 1.5 * sizeMultiplier;
            const halfBase = height * 0.866; 
            const points: Point[] = [ { x: 0, y: 0 }, { x: height, y: -halfBase }, { x: height, y: halfBase } ];
            return rc.polygon(toPoints(points, point), useSolidFill ? solidFillMarkerOptions : hollowFillMarkerOptions);
        }
        case 'triangle': {
            const height = strokeWidth * 1.5 * sizeMultiplier;
            const halfBase = height * 0.866; // Equilateral
            const points: Point[] = [ { x: 0, y: -halfBase }, { x: height, y: 0 }, { x: 0, y: halfBase } ];
            return rc.polygon(toPoints(points, point), useSolidFill ? solidFillMarkerOptions : hollowFillMarkerOptions);
        }
        case 'circle': {
            const diameter = strokeWidth * 1.8 * sizeMultiplier;
            const center = getOutwardOrigin(diameter);
            return rc.circle(center.x, center.y, diameter, useSolidFill ? solidFillMarkerOptions : hollowFillMarkerOptions);
        }
        case 'square': {
            const side = strokeWidth * 1.5 * sizeMultiplier;
            const center = getOutwardOrigin(side);
            const halfSide = side / 2;
            const points: Point[] = [
                { x: -halfSide, y: -halfSide },
                { x:  halfSide, y: -halfSide },
                { x:  halfSide, y:  halfSide },
                { x: -halfSide, y:  halfSide },
            ];
            return rc.polygon(toPoints(points, center), useSolidFill ? solidFillMarkerOptions : hollowFillMarkerOptions);
        }
        case 'diamond': {
            const size = strokeWidth * 1.8 * sizeMultiplier;
            const center = getOutwardOrigin(size);
            const halfSize = size / 2;
            const points: Point[] = [ { x: -halfSize, y: 0 }, { x: 0, y: -halfSize }, { x: halfSize, y: 0 }, { x: 0, y: halfSize } ];
            return rc.polygon(toPoints(points, center), useSolidFill ? solidFillMarkerOptions : hollowFillMarkerOptions);
        }
        default:
            return null;
    }
}


/**
 * Renders an AnyPath object into an SVGElement using a given RoughJS instance.
 * This is a shared utility used by the main whiteboard and the export functions.
 * @param rc - The RoughSVG instance to use for rendering.
 * @param data - The path data object to render.
 * @returns An SVGElement (e.g., <path>, <g>) representing the rendered path, or null.
 */
export function renderPathNode(rc: RoughSVG, data: AnyPath): SVGElement | null {
    let node: SVGElement | null = null;
    const capNodes: SVGElement[] = [];

    if (data.tool === 'image') {
        const imgData = data as ImageData;
        
        if (imgData.borderRadius && imgData.borderRadius > 0) {
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            const clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
            const clipId = `clip-${data.id}`;
            clipPath.setAttribute('id', clipId);

            const clipRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            clipRect.setAttribute('x', String(imgData.x));
            clipRect.setAttribute('y', String(imgData.y));
            clipRect.setAttribute('width', String(imgData.width));
            clipRect.setAttribute('height', String(imgData.height));
            clipRect.setAttribute('rx', String(imgData.borderRadius));
            clipRect.setAttribute('ry', String(imgData.borderRadius));
            
            clipPath.appendChild(clipRect);
            defs.appendChild(clipPath);
            g.appendChild(defs);

            const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
            image.setAttribute('href', imgData.src);
            image.setAttribute('x', String(imgData.x));
            image.setAttribute('y', String(imgData.y));
            image.setAttribute('width', String(imgData.width));
            image.setAttribute('height', String(imgData.height));
            image.setAttribute('clip-path', `url(#${clipId})`);
            g.appendChild(image);
            node = g;
        } else {
            const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
            image.setAttribute('href', imgData.src);
            image.setAttribute('x', String(imgData.x));
            image.setAttribute('y', String(imgData.y));
            image.setAttribute('width', String(imgData.width));
            image.setAttribute('height', String(imgData.height));
            node = image;
        }
    } else {
        const seed = parseInt(data.id, 10);
        
        const options: any = {
          stroke: data.color,
          strokeWidth: data.strokeWidth,
          roughness: data.roughness,
          bowing: data.bowing,
          seed: isNaN(seed) ? 1 : seed,
          preserveVertices: data.preserveVertices,
          disableMultiStroke: data.disableMultiStroke,
          disableMultiStrokeFill: data.disableMultiStrokeFill,
        };

        const isDashed = data.strokeLineDash && data.strokeLineDash[0] > 0 && data.strokeLineDash[1] > 0;
        if (isDashed) {
            options.strokeLineDash = data.strokeLineDash;
        }
    
        if (data.fill && data.fill !== 'transparent') {
            options.fill = data.fill;
            options.fillStyle = data.fillStyle || 'hachure';
            if (data.fillWeight > 0) options.fillWeight = data.fillWeight;
            if (data.hachureGap > 0) options.hachureGap = data.hachureGap;
            options.hachureAngle = data.hachureAngle;
        }

        if (data.tool === 'pen' || data.tool === 'line') {
            const pathData = data as VectorPathData;

            if (pathData.anchors && pathData.anchors.length === 1) {
                const dotOptions = { ...options, fill: data.color, fillStyle: 'solid' };
                node = rc.circle(pathData.anchors[0].point.x, pathData.anchors[0].point.y, data.strokeWidth, dotOptions);
            } else if (pathData.anchors && pathData.anchors.length > 1) {
                const pathOptions = { ...options };
                const finalAnchors = pathData.anchors;

                const isSimplePolyline = data.tool === 'line' && !pathData.isClosed &&
                    finalAnchors.every(a =>
                        a.point.x === a.handleIn.x && a.point.y === a.handleIn.y &&
                        a.point.x === a.handleOut.x && a.point.y === a.handleOut.y
                    );

                if (isSimplePolyline) {
                    const points = finalAnchors.map(a => [a.point.x, a.point.y] as [number, number]);
                    pathOptions.curveTightness = pathData.curveTightness;
                    pathOptions.curveStepCount = pathData.curveStepCount;
                    node = rc.curve(points, pathOptions);
                } else {
                    const d = anchorsToPathD(finalAnchors, !!pathData.isClosed);
                    node = rc.path(d, pathOptions);
                }

                // --- Apply Join and Cap Styles ---
                const joinStyle = pathData.strokeLineJoin ?? 'round';

                const applyGeneratedStyles = (el: SVGElement, cap: 'butt' | 'round' | 'square' | null) => {
                    if (el.tagName === 'path') {
                        el.setAttribute('stroke-linejoin', joinStyle);
                        if (!pathData.isClosed && cap) {
                            el.setAttribute('stroke-linecap', cap);
                        }
                    }
                    if (el.childNodes) {
                        el.childNodes.forEach(child => applyGeneratedStyles(child as SVGElement, cap));
                    }
                };

                if (!pathData.isClosed) {
                    const startCapType = data.strokeLineCapStart ?? 'butt';
                    const endCapType = data.strokeLineCapEnd ?? 'butt';
                    // 'butt' is the SVG default, 'none' is our app's concept of no marker. Both mean stroke-linecap="butt".
                    const isNativeSvgCap = (s: EndpointStyle): s is 'round' | 'square_cap' => s === 'round' || s === 'square_cap';

                    let nativeLineCapToApply: 'butt' | 'round' | 'square' = 'butt';
                    let drawCustomStartCap = !isNativeSvgCap(startCapType) && startCapType !== 'butt' && startCapType !== 'none';
                    let drawCustomEndCap = !isNativeSvgCap(endCapType) && endCapType !== 'butt' && endCapType !== 'none';

                    if (isNativeSvgCap(startCapType) && isNativeSvgCap(endCapType)) {
                        // Both are 'round' or 'square_cap'
                        if (startCapType === endCapType) {
                            nativeLineCapToApply = startCapType === 'square_cap' ? 'square' : startCapType;
                        } else {
                            // Different native caps (e.g., round on one end, square on other).
                            // This is not supported natively. Draw both customly over a butt-ended line.
                            nativeLineCapToApply = 'butt';
                            drawCustomStartCap = true;
                            drawCustomEndCap = true;
                        }
                    } else if (isNativeSvgCap(startCapType)) {
                        // Start is native ('round'/'square_cap'), end is a marker or 'butt'/'none'.
                        // Apply the native cap to the whole line. The end marker will be drawn over it.
                        nativeLineCapToApply = startCapType === 'square_cap' ? 'square' : startCapType;
                    } else if (isNativeSvgCap(endCapType)) {
                        // End is native, start is a marker or 'butt'/'none'.
                        nativeLineCapToApply = endCapType === 'square_cap' ? 'square' : endCapType;
                    }
                    // If both are markers or 'butt'/'none', nativeLineCapToApply remains 'butt'
                    // and custom caps will be drawn as needed.

                    applyGeneratedStyles(node, nativeLineCapToApply);
                    
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
                        
                        const anchors = finalAnchors;
                        const n = anchors.length;

                        // --- START CAP ---
                        if (drawCustomStartCap) {
                            const startPoint = anchors[0].point;
                            const handleOut = anchors[0].handleOut;
                            const tangentTargetStart = (handleOut.x === startPoint.x && handleOut.y === startPoint.y) ? anchors[1].point : handleOut;
                            const startAngle = Math.atan2(startPoint.y - tangentTargetStart.y, startPoint.x - tangentTargetStart.x);

                            const startCapNode = createCapNode(rc, startCapType, startPoint, startAngle, data.strokeWidth, data.endpointSize ?? 1, data.endpointFill ?? 'hollow', capOptions);
                            if (startCapNode) capNodes.push(startCapNode);
                        }

                        // --- END CAP ---
                        if (drawCustomEndCap) {
                            const endPoint = anchors[n-1].point;
                            const handleIn = anchors[n-1].handleIn;
                            const tangentTargetEnd = (handleIn.x === endPoint.x && handleIn.y === endPoint.y) ? anchors[n-2].point : handleIn;
                            const endAngle = Math.atan2(endPoint.y - tangentTargetEnd.y, endPoint.x - tangentTargetEnd.x);
                            
                            const endCapNode = createCapNode(rc, endCapType, endPoint, endAngle, data.strokeWidth, data.endpointSize ?? 1, data.endpointFill ?? 'hollow', capOptions);
                            if (endCapNode) capNodes.push(endCapNode);
                        }
                    }
                } else {
                    applyGeneratedStyles(node, null); // Closed paths don't have caps
                }
            }
        } else {
            const points = getPathPoints(data);
            if (points.length > 0) {
                node = rc.polygon(points, options);
            }
        }
    }
    
    if (!node) return null;
    
    // Apply stroke join style to non-vector shapes if specified
    const pathIsVector = data.tool === 'pen' || data.tool === 'line';
    if (!pathIsVector && data.strokeLineJoin) {
         const joinStyle = data.strokeLineJoin;
         const applyStyles = (el: SVGElement) => {
            if (el.tagName === 'path') {
                el.setAttribute('stroke-linejoin', joinStyle);
            }
            if (el.childNodes) {
                el.childNodes.forEach(child => applyStyles(child as SVGElement));
            }
        };
        applyStyles(node);
    }
    
    // Apply opacity
    if (data.opacity !== undefined && data.opacity < 1) {
        node.setAttribute('opacity', String(data.opacity));
    }
    
    // Apply rotation
    if (data.rotation && (data.tool === 'rectangle' || data.tool === 'ellipse' || data.tool === 'image')) {
        const { x, y, width, height, rotation } = data;
        const cx = x + width / 2;
        const cy = y + height / 2;
        const angleDegrees = rotation * (180 / Math.PI);
        node.setAttribute('transform', `rotate(${angleDegrees} ${cx} ${cy})`);
    }

    if (capNodes.length > 0) {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.appendChild(node);
        capNodes.forEach(cap => g.appendChild(cap));
        return g;
    }

    return node;
}

/**
 * Creates an SVG string from an array of path data.
 * @param paths - The array of paths to include in the SVG.
 * @returns An SVG string, or null if no paths are provided.
 */
export function pathsToSvgString(paths: AnyPath[]): string | null {
  if (paths.length === 0) return null;

  const bbox = getPathsBoundingBox(paths, true);
  if (!bbox) return null;

  const padding = 20;
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('xmlns', svgNS);
  svg.setAttribute('width', String(bbox.width + padding * 2));
  svg.setAttribute('height', String(bbox.height + padding * 2));
  svg.setAttribute('viewBox', `${bbox.x - padding} ${bbox.y - padding} ${bbox.width + padding * 2} ${bbox.height + padding * 2}`);

  const rc = rough.svg(svg);

  // Translate all paths to be relative to the top-left of the bounding box
  paths.forEach(pathData => {
    const node = renderPathNode(rc, pathData);
    if (node) {
      svg.appendChild(node);
    }
  });

  return new XMLSerializer().serializeToString(svg);
}


/**
 * Creates a PNG Blob from an array of path data.
 * @param paths The array of paths to render.
 * @returns A Promise that resolves to a Blob, or null.
 */
export function pathsToPngBlob(paths: AnyPath[]): Promise<Blob | null> {
    return new Promise((resolve) => {
        const svgString = pathsToSvgString(paths);
        if (!svgString) {
            resolve(null);
            return;
        }

        const bbox = getPathsBoundingBox(paths, true);
        if (!bbox) {
            resolve(null);
            return;
        }

        const padding = 20;
        const canvas = document.createElement('canvas');
        const scale = window.devicePixelRatio || 1;
        canvas.width = (bbox.width + padding * 2) * scale;
        canvas.height = (bbox.height + padding * 2) * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            resolve(null);
            return;
        }
        ctx.scale(scale, scale);

        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, 0, 0);
            canvas.toBlob((blob) => {
                resolve(blob);
            }, 'image/png');
        };
        img.onerror = () => {
            resolve(null);
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
    });
}