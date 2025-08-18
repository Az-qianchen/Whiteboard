import type { Point } from '../../types';

export function getPolygonVertices(x: number, y: number, width: number, height: number, sides: number): Point[] {
    const cx = x + width / 2;
    const cy = y + height / 2;
    const rx = width / 2;
    const ry = height / 2;

    const points: Point[] = [];
    for (let i = 0; i < sides; i++) {
        // Offset by -PI/2 to start the first point at the top-middle
        const angle = (i / sides) * 2 * Math.PI - Math.PI / 2;
        points.push({
            x: cx + rx * Math.cos(angle),
            y: cy + ry * Math.sin(angle),
        });
    }
    return points;
}


/**
 * Generates an SVG path string for a regular polygon with optional rounded corners.
 * @returns An SVG path `d` attribute string.
 */
export function getPolygonPathD(x: number, y: number, width: number, height: number, sides: number, borderRadius: number = 0): string {
    const points = getPolygonVertices(x, y, width, height, sides);
    
    if (borderRadius <= 0.1 || sides < 3) {
        return `M ${points.map(p => `${p.x},${p.y}`).join(' L ')} Z`;
    }
    
    // Clamp the radius to prevent weird shapes
    const sideLengths = [];
    for (let i = 0; i < sides; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % sides];
        sideLengths.push(Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)));
    }
    const minSideLength = Math.min(...sideLengths);
    const maxRadius = minSideLength / 2;
    
    const cornerRadius = Math.min(borderRadius, maxRadius);

    let d = '';

    for (let i = 0; i < sides; i++) {
        const p0 = points[(i + sides - 1) % sides];
        const p1 = points[i];
        const p2 = points[(i + 1) % sides];

        const v1 = { x: p0.x - p1.x, y: p0.y - p1.y };
        const v2 = { x: p2.x - p1.x, y: p2.y - p1.y };

        const len1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
        const len2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
        
        v1.x /= len1;
        v1.y /= len1;
        v2.x /= len2;
        v2.y /= len2;
        
        const angle = Math.acos(v1.x * v2.x + v1.y * v2.y);
        const tanHalfAngle = Math.tan(angle / 2);
        const segmentLength = cornerRadius / tanHalfAngle;

        const startPoint = {
            x: p1.x + Math.min(segmentLength, len1 / 2) * v1.x,
            y: p1.y + Math.min(segmentLength, len1 / 2) * v1.y,
        };
        const endPoint = {
            x: p1.x + Math.min(segmentLength, len2 / 2) * v2.x,
            y: p1.y + Math.min(segmentLength, len2 / 2) * v2.y,
        };

        if (i === 0) {
            d += `M ${startPoint.x},${startPoint.y}`;
        } else {
            d += ` L ${startPoint.x},${startPoint.y}`;
        }
        // Use A (arc) command for a circular corner
        d += ` A ${cornerRadius},${cornerRadius} 0 0 1 ${endPoint.x},${endPoint.y}`;
    }

    d += ' Z';
    return d;
}