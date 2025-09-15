import type { RoughSVG } from 'roughjs/bin/svg';
import type { Point, EndpointStyle } from '@/types';
import { rotatePoint } from '@/lib/drawing';

// Helper function to create an endpoint marker node.
export function createCapNode(
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
    const solidFillMarkerOptions = { ...baseOptions, stroke, fill: stroke, fillStyle: 'solid' };
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
    
    // Helper to apply round linecap/linejoin to generated marker paths
    const applyRoundCaps = (node: SVGElement | null) => {
        if (node) {
            const paths = node.querySelectorAll('path');
            paths.forEach(p => {
                p.setAttribute('stroke-linecap', 'round');
                p.setAttribute('stroke-linejoin', 'round');
            });
        }
        return node;
    };
    
    // 60度角几何通用计算
    const sideLength = strokeWidth * 2.0 * sizeMultiplier;
    const altitude = sideLength * (Math.sqrt(3) / 2);
    const halfBase = sideLength / 2;


    switch (type) {
        // These are true line caps, always solid
        case 'round': {
            return rc.circle(point.x, point.y, strokeWidth, { ...solidFillMarkerOptions, stroke: 'none' });
        }
        case 'square_cap': {
            const s = strokeWidth;
            const half_s = s / 2;
            const centerOffset = rotatePoint({ x: half_s, y: 0 }, { x: 0, y: 0 }, angle);
            const origin = { x: point.x + centerOffset.x, y: point.y + centerOffset.y };
            const points: Point[] = [ {x: -half_s, y: -half_s}, {x: half_s, y: -half_s}, {x: half_s, y: half_s}, {x: -half_s, y: half_s} ];
            return rc.polygon(toPoints(points, origin), { ...solidFillMarkerOptions, stroke: 'none' });
        }

        // These are non-fillable line markers
        case 'bar': {
            const length = strokeWidth * 1.2 * sizeMultiplier;
            const points: Point[] = [{x: 0, y: -length}, {x: 0, y: length}];
            const finalPoints = toPoints(points, point);
            const node = rc.line(finalPoints[0][0], finalPoints[0][1], finalPoints[1][0], finalPoints[1][1], lineMarkerOptions);
            return applyRoundCaps(node);
        }
        case 'arrow': { // > 形，开放，尖端在 (0,0)
            const points: Point[] = [ { x: -altitude, y: -halfBase }, { x: 0, y: 0 }, { x: -altitude, y: halfBase } ];
            const node = rc.linearPath(toPoints(points, point), lineMarkerOptions);
            return applyRoundCaps(node);
        }
        case 'reverse_arrow': { // Y 形分叉
            const tineLength = sideLength * 0.9; // Make tines slightly shorter for better look
            const angle_offset = Math.PI / 6; // 30 degrees for a 60 degree total angle
            
            const p1 = { x: tineLength * Math.cos(angle_offset), y: -tineLength * Math.sin(angle_offset) };
            const p2 = { x: tineLength * Math.cos(angle_offset), y:  tineLength * Math.sin(angle_offset) };

            const points1 = toPoints([{x: 0, y:0}, p1], point);
            const points2 = toPoints([{x: 0, y:0}, p2], point);

            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            const node1 = rc.line(points1[0][0], points1[0][1], points1[1][0], points1[1][1], lineMarkerOptions);
            if(node1) g.appendChild(node1);
            const node2 = rc.line(points2[0][0], points2[0][1], points2[1][0], points2[1][1], lineMarkerOptions);
            if(node2) g.appendChild(node2);

            return applyRoundCaps(g);
        }
        
        // These are fillable line markers
        case 'dot': { // < 形 (倒三角)，闭合，尖端在 (0,0)
            const points: Point[] = [ { x: altitude, y: -halfBase }, { x: 0, y: 0 }, { x: altitude, y: halfBase } ];
            const node = rc.polygon(toPoints(points, point), useSolidFill ? solidFillMarkerOptions : hollowFillMarkerOptions);
            return applyRoundCaps(node);
        }
        case 'triangle': { // > 形，闭合，底部在 (0,0)
            const points: Point[] = [ { x: 0, y: -halfBase }, { x: altitude, y: 0 }, { x: 0, y: halfBase } ];
            const node = rc.polygon(toPoints(points, point), useSolidFill ? solidFillMarkerOptions : hollowFillMarkerOptions);
            return applyRoundCaps(node);
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
            const node = rc.polygon(toPoints(points, center), useSolidFill ? solidFillMarkerOptions : hollowFillMarkerOptions);
            return applyRoundCaps(node);
        }
        case 'diamond': {
            const size = strokeWidth * 1.8 * sizeMultiplier;
            const center = getOutwardOrigin(size);
            const halfSize = size / 2;
            const points: Point[] = [ { x: -halfSize, y: 0 }, { x: 0, y: -halfSize }, { x: halfSize, y: 0 }, { x: 0, y: halfSize } ];
            const node = rc.polygon(toPoints(points, center), useSolidFill ? solidFillMarkerOptions : hollowFillMarkerOptions);
            return applyRoundCaps(node);
        }
        default:
            return null;
    }
}