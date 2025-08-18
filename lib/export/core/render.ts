import type { RoughSVG } from 'roughjs/bin/svg';
import type { AnyPath, VectorPathData, RectangleData, EllipseData, ImageData, BrushPathData, PolygonData, ArcData, GroupData } from '../../types';
import { createSmoothPathNode } from '../smooth/path';
import { renderRoughVectorPath } from '../rough/path';
import { renderImage, renderRoughShape } from '../rough/shapes';
import { sampleArc } from '../../drawing/arc';

/**
 * Renders an AnyPath object into an SVGElement using a given RoughJS instance.
 * This is a shared utility used by the main whiteboard and the export functions.
 * @param rc - The RoughSVG instance to use for rendering.
 * @param data - The path data object to render.
 * @returns An SVGElement (e.g., <path>, <g>) representing the rendered path, or null.
 */
export function renderPathNode(rc: RoughSVG, data: AnyPath): SVGElement | null {
    const isRough = data.isRough ?? true;
    if (!isRough && data.tool !== 'image') {
        return createSmoothPathNode(data);
    }

    let node: SVGElement | null = null;
    const capNodes: SVGElement[] = [];

    if (data.tool === 'image') {
        node = renderImage(data as ImageData);
    } else if (data.tool === 'group') {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        const groupData = data as GroupData;
        groupData.children.forEach(child => {
            const childNode = renderPathNode(rc, child);
            if (childNode) {
                group.appendChild(childNode);
            }
        });
        node = group;
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
            if (data.fillWeight != null && data.fillWeight >= 0) options.fillWeight = data.fillWeight;
            if (data.hachureGap != null && data.hachureGap >= 0) options.hachureGap = data.hachureGap;
            options.hachureAngle = data.hachureAngle;
        }

        if (data.tool === 'pen' || data.tool === 'line') {
            const result = renderRoughVectorPath(rc, data as VectorPathData, options);
            node = result.node;
            capNodes.push(...result.capNodes);
        } else if (data.tool === 'brush') {
            const brushData = data as BrushPathData;
            const points = brushData.points.map(p => [p.x, p.y] as [number, number]);
            if (points.length > 0) {
                options.curveTightness = data.curveTightness;
                options.curveStepCount = data.curveStepCount;
                node = rc.curve(points, options);
            }
        } else if (data.tool === 'arc') {
            const arcData = data as ArcData;
            const points = sampleArc(arcData.points[0], arcData.points[1], arcData.points[2], 50).map(p => [p.x, p.y] as [number, number]);
            if (points.length > 0) {
                options.curveStepCount = 1; // Don't double-smooth
                options.curveTightness = 0;
                node = rc.curve(points, options);
            }
        } else if (data.tool === 'ellipse' || data.tool === 'rectangle' || data.tool === 'polygon') {
            node = renderRoughShape(rc, data as RectangleData | EllipseData | PolygonData, options);
        }
    }
    
    if (!node) return null;
    
    // The renderRoughVectorPath function handles joins/caps for pen and line tools internally,
    // so we only need to apply styles for other tools (brush, rectangle, ellipse, polygon).
    const pathIsVector = data.tool === 'pen' || data.tool === 'line';
    
    if (!pathIsVector) {
        const applyStyles = (el: SVGElement) => {
            if (el.tagName === 'path') {
                // Always apply round linejoin for smooth corners on shapes and sharp turns in brush strokes.
                const joinStyle = data.strokeLineJoin ?? 'round';
                el.setAttribute('stroke-linejoin', joinStyle);

                // For rough rendering of all shapes, linecap should also be round
                // to smooth out the joins between separate stroke segments that form the corners.
                el.setAttribute('stroke-linecap', 'round');
            }
            if (el.childNodes) {
                el.childNodes.forEach(child => applyStyles(child as SVGElement));
            }
        };
        applyStyles(node);
    }
    
    if (data.opacity !== undefined && data.opacity < 1) {
        node.setAttribute('opacity', String(data.opacity));
    }
    
    if (data.rotation && (data.tool === 'rectangle' || data.tool === 'ellipse' || data.tool === 'image' || data.tool === 'polygon')) {
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