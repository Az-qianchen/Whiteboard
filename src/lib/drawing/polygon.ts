import type { Point } from '../../types';

const isFiniteNumber = (n: number) => Number.isFinite(n);
const isFinitePoint = (p: Point) => isFiniteNumber(p.x) && isFiniteNumber(p.y);

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
    // Basic validation
    if (!isFiniteNumber(x) || !isFiniteNumber(y) || !isFiniteNumber(width) || !isFiniteNumber(height) || !isFiniteNumber(sides) || sides < 3) {
        return '';
    }
    const points = getPolygonVertices(x, y, width, height, sides).filter(isFinitePoint);
    if (points.length !== sides) {
        // Fallback to simple move/close if vertices failed to compute
        return points.length > 0 ? `M ${points.map(p => `${p.x},${p.y}`).join(' L ')} Z` : '';
    }

    if (borderRadius <= 0.1) {
        return `M ${points.map(p => `${p.x},${p.y}`).join(' L ')} Z`;
    }
    
    // Clamp the radius to prevent weird shapes
    const sideLengths: number[] = [];
    for (let i = 0; i < sides; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % sides];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        sideLengths.push(Math.sqrt(dx * dx + dy * dy));
    }
    const minSideLength = Math.min(...sideLengths);
    if (!isFiniteNumber(minSideLength) || minSideLength <= 1e-6) {
        // Degenerate polygon, draw straight edges
        return `M ${points.map(p => `${p.x},${p.y}`).join(' L ')} Z`;
    }
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
        if (!isFiniteNumber(len1) || !isFiniteNumber(len2) || len1 <= 1e-6 || len2 <= 1e-6) {
            // Degenerate corner, draw a hard corner
            if (i === 0) {
                d += `M ${p1.x},${p1.y}`;
            } else {
                d += ` L ${p1.x},${p1.y}`;
            }
            continue;
        }
        
        v1.x /= len1;
        v1.y /= len1;
        v2.x /= len2;
        v2.y /= len2;
        
        let dot = v1.x * v2.x + v1.y * v2.y;
        // Clamp due to floating point errors
        dot = Math.max(-1, Math.min(1, dot));
        const angle = Math.acos(dot);
        const tanHalfAngle = Math.tan(angle / 2);
        // Avoid division by ~0
        const segmentLength = !isFiniteNumber(tanHalfAngle) || Math.abs(tanHalfAngle) < 1e-6 ? 0 : cornerRadius / tanHalfAngle;

        const seg1 = Math.min(Math.max(segmentLength, 0), len1 / 2);
        const seg2 = Math.min(Math.max(segmentLength, 0), len2 / 2);
        const startPoint = {
            x: p1.x + seg1 * v1.x,
            y: p1.y + seg1 * v1.y,
        };
        const endPoint = {
            x: p1.x + seg2 * v2.x,
            y: p1.y + seg2 * v2.y,
        };

        if (!isFinitePoint(startPoint) || !isFinitePoint(endPoint) || cornerRadius <= 0.1) {
            // Fallback: hard corner
            if (i === 0) {
                d += `M ${p1.x},${p1.y}`;
            } else {
                d += ` L ${p1.x},${p1.y}`;
            }
        } else {
            if (i === 0) {
                d += `M ${startPoint.x},${startPoint.y}`;
            } else {
                d += ` L ${startPoint.x},${startPoint.y}`;
            }
            // Use A (arc) command for a circular corner
            d += ` A ${cornerRadius},${cornerRadius} 0 0 1 ${endPoint.x},${endPoint.y}`;
        }
    }

    d += ' Z';
    return d;
}
