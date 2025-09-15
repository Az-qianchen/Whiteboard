import type { RoughSVG } from 'roughjs/bin/svg';
import type { VectorPathData, EndpointStyle } from '@/types';
import { samplePath } from '@/lib/drawing';
import { createCapNode } from '../markers/rough';

/**
 * Samples points from a PEN path to convert it into a polyline for rendering curves.
 * This ensures that properties like 'bowing' can be applied consistently to curves.
 * @param data The vector path data object.
 * @returns An array of [x, y] points.
 */
function getPathPoints(data: VectorPathData): Array<[number, number]> {
    if (!data.anchors) return [];
    if (data.anchors.length < 2) {
        return data.anchors.map(a => [a.point.x, a.point.y]);
    }
    // Use curveStepCount to give user control over sampling fidelity
    const stepsPerSegment = 2 + Math.ceil((data.curveStepCount || 9) * 1.5);
    const sampledPoints = samplePath(data.anchors, stepsPerSegment, !!data.isClosed);
    return sampledPoints.map(p => [p.x, p.y]);
}

export function renderRoughVectorPath(rc: RoughSVG, data: VectorPathData, options: any): { node: SVGElement | null, capNodes: SVGElement[] } {
    const capNodes: SVGElement[] = [];
    let node: SVGElement | null = null;
    
    const pathData = data as VectorPathData;

    if (pathData.anchors && pathData.anchors.length === 1) {
        const dotOptions = { ...options, fill: data.color, fillStyle: 'solid' };
        node = rc.circle(pathData.anchors[0].point.x, pathData.anchors[0].point.y, data.strokeWidth, dotOptions);
    } else if (pathData.anchors && pathData.anchors.length > 1) {
        const pathOptions = { ...options };
        
        if (pathData.isClosed) {
            pathOptions.curveTightness = pathData.curveTightness;
            pathOptions.curveStepCount = pathData.curveStepCount;
            const points = getPathPoints(pathData);
            node = rc.curve(points, pathOptions);
        } else {
            const points: [number, number][] = pathData.tool === 'line' 
                ? pathData.anchors.map(a => [a.point.x, a.point.y])
                : getPathPoints(pathData);
            
            if (points.length > 0) {
                pathOptions.curveTightness = pathData.curveTightness;
                pathOptions.curveStepCount = pathData.curveStepCount;
                node = rc.curve(points, pathOptions);
            }
        }

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
            const isNativeSvgCap = (s: EndpointStyle): s is 'round' | 'square_cap' => s === 'round' || s === 'square_cap';

            let nativeLineCapToApply: 'butt' | 'round' | 'square' = 'butt';
            let drawCustomStartCap = !isNativeSvgCap(startCapType) && startCapType !== 'butt' && startCapType !== 'none';
            let drawCustomEndCap = !isNativeSvgCap(endCapType) && endCapType !== 'butt' && endCapType !== 'none';

            // If we're drawing any custom marker (like an arrow), the underlying line should have a round cap
            // to ensure a clean join. This is the primary fix for the visual bug.
            if (drawCustomStartCap || drawCustomEndCap) {
                nativeLineCapToApply = 'round';
            }

            // Now, handle the specific cases where we can use native SVG linecaps instead of custom-drawing them.
            if (isNativeSvgCap(startCapType) && isNativeSvgCap(endCapType)) {
                if (startCapType === endCapType) {
                    // Both ends have the same native cap. Use it directly on the line, and don't draw custom caps.
                    nativeLineCapToApply = startCapType === 'square_cap' ? 'square' : 'round';
                    drawCustomStartCap = false; 
                    drawCustomEndCap = false;
                } else {
                    // Mismatched native caps (e.g., round and square). We must draw them manually over a butt-ended line.
                    nativeLineCapToApply = 'butt';
                    drawCustomStartCap = true;
                    drawCustomEndCap = true;
                }
            } else if (isNativeSvgCap(startCapType) && !drawCustomEndCap) {
                // Only the start cap is native, and the end cap is none/butt. Apply the native cap to the line.
                nativeLineCapToApply = startCapType === 'square_cap' ? 'square' : 'round';
                drawCustomStartCap = false;
            } else if (isNativeSvgCap(endCapType) && !drawCustomStartCap) {
                // Only the end cap is native, and the start cap is none/butt. Apply the native cap to the line.
                nativeLineCapToApply = endCapType === 'square_cap' ? 'square' : 'round';
                drawCustomEndCap = false;
            }
            
            if (node) applyGeneratedStyles(node, nativeLineCapToApply);
            
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
                
                const anchors = pathData.anchors;
                const n = anchors.length;

                if (drawCustomStartCap) {
                    const startPoint = anchors[0].point;
                    const handleOut = anchors[0].handleOut;
                    const tangentTargetStart = (handleOut.x === startPoint.x && handleOut.y === startPoint.y) ? anchors[1].point : handleOut;
                    const startAngle = Math.atan2(startPoint.y - tangentTargetStart.y, startPoint.x - tangentTargetStart.x);
                    const startCapNode = createCapNode(rc, startCapType, startPoint, startAngle, data.strokeWidth, data.endpointSize ?? 1, data.endpointFill ?? 'hollow', capOptions);
                    if (startCapNode) capNodes.push(startCapNode);
                }

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
            if (node) applyGeneratedStyles(node, null);
        }
    }
    
    return { node, capNodes };
}